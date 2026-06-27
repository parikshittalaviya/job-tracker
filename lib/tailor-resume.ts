import Anthropic from '@anthropic-ai/sdk'

export type TailoredResumeData = {
  name: string
  contact: {
    email: string
    phone?: string | null
    location?: string | null
    linkedin?: string | null
    github?: string | null
    website?: string | null
  }
  summary?: string | null
  experience: Array<{
    company: string
    title: string
    dates: string
    location?: string | null
    bullets: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    dates: string
    gpa?: string | null
    details?: string[]
  }>
  skills: string[]
  projects?: Array<{
    name: string
    description: string
    tech?: string[]
  }>
  certifications?: string[]
}

export type TailorResult = {
  resume: TailoredResumeData
  coverLetter: string
  inputTokens: number
  outputTokens: number
  model: string
}

const RESUME_SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist.

Given a candidate's resume text and a job description, rewrite the resume to align with the job requirements.

Rules:
- NEVER fabricate experience, credentials, skills, or achievements not in the original resume
- Rewrite bullet points to emphasize relevance to the JD using its keywords
- Keep all dates, company names, titles, and factual details exactly as-is
- Reorder sections to put most relevant experience first
- Tailor the summary to the specific role and company
- Keep skills aligned with what's in the JD — reorder/emphasize relevant ones
- Keep bullet points concise and achievement-focused (use numbers where they exist)

Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{
  "name": "string",
  "contact": {
    "email": "string",
    "phone": "string | null",
    "location": "string | null",
    "linkedin": "string | null",
    "github": "string | null",
    "website": "string | null"
  },
  "summary": "string | null",
  "experience": [
    {
      "company": "string",
      "title": "string",
      "dates": "string",
      "location": "string | null",
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "dates": "string",
      "gpa": "string | null",
      "details": ["string"]
    }
  ],
  "skills": ["string"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "tech": ["string"]
    }
  ],
  "certifications": ["string"]
}`

const COVER_LETTER_SYSTEM_PROMPT = `You are an expert career coach writing professional cover letters.

Write a compelling, concise cover letter (3-4 paragraphs, under 350 words) tailored to the specific role.
- Opening: express genuine interest in the role and company
- Body: highlight 2-3 most relevant experiences/achievements that match the JD
- Closing: confident call to action

Return ONLY the cover letter text. No subject line, no date, no address block — just the paragraphs.`

export async function tailorResume(
  resumeText: string,
  jobDescription: string,
  candidateName: string,
  companyName: string | null,
  jobTitle: string | null,
  apiKey: string
): Promise<TailorResult> {
  const client = new Anthropic({ apiKey })

  // Call 1: tailor the resume
  const resumeMsg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: RESUME_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Original Resume:\n${resumeText.slice(0, 8000)}\n\nJob Description:\n${jobDescription.slice(0, 4000)}`,
      },
    ],
  })

  const resumeRaw = resumeMsg.content[0].type === 'text' ? resumeMsg.content[0].text : ''
  const resumeCleaned = resumeRaw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsedResume = JSON.parse(resumeCleaned) as TailoredResumeData

  // Call 2: generate cover letter
  const clMsg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: COVER_LETTER_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Candidate: ${candidateName}\nRole: ${jobTitle ?? 'the role'} at ${companyName ?? 'the company'}\n\nJob Description:\n${jobDescription.slice(0, 3000)}\n\nCandidate Resume:\n${resumeText.slice(0, 4000)}`,
      },
    ],
  })

  const coverLetter = clMsg.content[0].type === 'text' ? clMsg.content[0].text.trim() : ''

  return {
    resume: parsedResume,
    coverLetter,
    inputTokens: resumeMsg.usage.input_tokens + clMsg.usage.input_tokens,
    outputTokens: resumeMsg.usage.output_tokens + clMsg.usage.output_tokens,
    model: 'claude-sonnet-4-6',
  }
}
