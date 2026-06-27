import Anthropic from '@anthropic-ai/sdk'
import type { WorkType } from '@/types/database'

export type ExtractedFields = {
  company: string | null
  role: string | null
  location: string | null
  work_type: WorkType | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  h1_sponsor: boolean | null
  requirements: string[]
  deadline: string | null
}

const SYSTEM_PROMPT = `You are a job description parser. Extract structured information from job descriptions.
Respond ONLY with a valid JSON object matching this exact shape:
{
  "company": string | null,
  "role": string | null,
  "location": string | null,
  "work_type": "remote" | "hybrid" | "onsite" | null,
  "salary_min": number | null,
  "salary_max": number | null,
  "salary_currency": string,
  "h1_sponsor": boolean | null,
  "requirements": string[],
  "deadline": "YYYY-MM-DD" | null
}

Rules:
- salary values are annual, in integers (e.g. 120000)
- salary_currency defaults to "USD" if not specified
- h1_sponsor: true = sponsors visas, false = explicitly does not sponsor, null = not mentioned
- requirements: top 5-8 key skills/qualifications only, as short phrases
- deadline: application deadline date if mentioned, null otherwise
- For any field you cannot determine, use null (or [] for requirements)
- Output ONLY the JSON, no markdown, no explanation`

export async function extractJobDescription(
  jobDescription: string,
  apiKey: string
): Promise<ExtractedFields | null> {
  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract structured fields from this job description:\n\n${jobDescription.slice(0, 6000)}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : null
    if (!text) return null

    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(cleaned) as ExtractedFields
    return {
      company: parsed.company ?? null,
      role: parsed.role ?? null,
      location: parsed.location ?? null,
      work_type: parsed.work_type ?? null,
      salary_min: typeof parsed.salary_min === 'number' ? parsed.salary_min : null,
      salary_max: typeof parsed.salary_max === 'number' ? parsed.salary_max : null,
      salary_currency: parsed.salary_currency || 'USD',
      h1_sponsor: typeof parsed.h1_sponsor === 'boolean' ? parsed.h1_sponsor : null,
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      deadline: parsed.deadline ?? null,
    }
  } catch (err) {
    console.error('[extract-jd] failed:', err)
    return null
  }
}
