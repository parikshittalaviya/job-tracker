import { createClient } from '@/lib/supabase/server'
import { extractResumeText } from '@/lib/parse-resume'
import { tailorResume } from '@/lib/tailor-resume'
import { generateResumePdf, generateCoverLetterPdf } from '@/lib/generate-pdf'
import { generateResumeDocx, generateCoverLetterDocx } from '@/lib/generate-docx'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: tailored }, { data: coverLetter }] = await Promise.all([
    supabase
      .from('tailored_resumes')
      .select('*')
      .eq('application_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('cover_letters')
      .select('*')
      .eq('application_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Generate fresh signed URLs (1-hour expiry)
  async function signedUrl(path: string | null) {
    if (!path) return null
    const { data } = await supabase.storage.from('tailored').createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  }

  const tailoredWithUrls = tailored ? {
    ...tailored,
    pdf_url: await signedUrl(tailored.pdf_path),
    docx_url: await signedUrl(tailored.docx_path),
  } : null

  const coverWithUrls = coverLetter ? {
    ...coverLetter,
    pdf_url: await signedUrl(coverLetter.pdf_path),
    docx_url: await signedUrl(coverLetter.docx_path),
  } : null

  return NextResponse.json({ tailored: tailoredWithUrls, coverLetter: coverWithUrls })
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { resume_id: string }
  if (!body.resume_id) return NextResponse.json({ error: 'resume_id is required' }, { status: 400 })

  // Load application + resume + profile in parallel
  const [{ data: app }, { data: resumeRecord }, { data: profile }] = await Promise.all([
    supabase.from('job_applications').select('job_description, company, role').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('resumes').select('*').eq('id', body.resume_id).eq('user_id', user.id).single(),
    supabase.from('profiles').select('full_name, anthropic_key').eq('id', user.id).single(),
  ])

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (!resumeRecord) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })

  // Resolve API key
  const userKey = profile?.anthropic_key?.trim() || null
  const appKey = process.env.ANTHROPIC_API_KEY?.trim() || null
  const apiKey = userKey || appKey
  if (!apiKey) return NextResponse.json({ error: 'No API key available. Add your Anthropic key in Profile.' }, { status: 422 })

  // Rate limit check (shares the same 3/day table as JD extraction)
  const usesAppKey = !userKey && !!appKey
  const today = new Date().toISOString().slice(0, 10)
  if (usesAppKey) {
    const { data: usage } = await supabase.from('tailoring_usage').select('count').eq('user_id', user.id).eq('usage_date', today).single()
    if ((usage?.count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Daily free limit reached (3/3). Add your Anthropic API key in Profile to continue.' }, { status: 429 })
    }
  }

  // Download the source resume file from Supabase Storage
  const { data: fileData, error: fileError } = await supabase.storage
    .from('resumes')
    .download(resumeRecord.file_path)

  if (fileError || !fileData) {
    return NextResponse.json({ error: 'Could not download resume file' }, { status: 500 })
  }

  // Extract text from the file
  let resumeText: string
  try {
    resumeText = await extractResumeText(await fileData.arrayBuffer(), resumeRecord.mime_type)
  } catch (err) {
    return NextResponse.json({ error: `Could not read resume: ${err instanceof Error ? err.message : 'unknown error'}` }, { status: 422 })
  }

  if (!resumeText.trim()) {
    return NextResponse.json({ error: 'Could not extract text from the resume file' }, { status: 422 })
  }

  // Run AI tailoring
  let result
  try {
    result = await tailorResume(
      resumeText,
      app.job_description,
      profile?.full_name ?? 'Candidate',
      app.company,
      app.role,
      apiKey
    )
  } catch (err) {
    return NextResponse.json({ error: `AI tailoring failed: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }

  // Increment usage counter if using app key
  if (usesAppKey) {
    const { data: existing } = await supabase.from('tailoring_usage').select('count').eq('user_id', user.id).eq('usage_date', today).single()
    if (existing) {
      await supabase.from('tailoring_usage').update({ count: existing.count + 1 }).eq('user_id', user.id).eq('usage_date', today)
    } else {
      await supabase.from('tailoring_usage').insert({ user_id: user.id, usage_date: today, count: 1 })
    }
  }

  // Generate PDF and DOCX for resume + cover letter in parallel
  const [resumePdf, resumeDocx, clPdf, clDocx] = await Promise.all([
    generateResumePdf(result.resume),
    generateResumeDocx(result.resume),
    generateCoverLetterPdf(result.resume.name, result.coverLetter),
    generateCoverLetterDocx(result.resume.name, result.coverLetter),
  ])

  // Upload all 4 files to Supabase Storage
  const base = `${user.id}/${id}`
  const ts = Date.now()

  const uploads = await Promise.all([
    supabase.storage.from('tailored').upload(`${base}/resume_${ts}.pdf`, resumePdf, { contentType: 'application/pdf', upsert: true }),
    supabase.storage.from('tailored').upload(`${base}/resume_${ts}.docx`, resumeDocx, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true }),
    supabase.storage.from('tailored').upload(`${base}/cover_letter_${ts}.pdf`, clPdf, { contentType: 'application/pdf', upsert: true }),
    supabase.storage.from('tailored').upload(`${base}/cover_letter_${ts}.docx`, clDocx, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true }),
  ])

  if (uploads.some((u) => u.error)) {
    const firstError = uploads.find((u) => u.error)?.error
    return NextResponse.json({ error: `File upload failed: ${firstError?.message}` }, { status: 500 })
  }

  const [resumePdfPath, resumeDocxPath, clPdfPath, clDocxPath] = uploads.map((u) => u.data!.path)

  // Save records to DB
  const [{ data: tailoredRecord }, { data: clRecord }] = await Promise.all([
    supabase.from('tailored_resumes').insert({
      application_id: id,
      source_resume_id: resumeRecord.id,
      user_id: user.id,
      resume_json: result.resume as unknown as import('@/types/database').Json,
      pdf_path: resumePdfPath,
      docx_path: resumeDocxPath,
    }).select().single(),
    supabase.from('cover_letters').insert({
      application_id: id,
      user_id: user.id,
      content: result.coverLetter,
      pdf_path: clPdfPath,
      docx_path: clDocxPath,
    }).select().single(),
  ])

  // Log API usage (best-effort)
  supabase.from('api_usage_logs').insert([
    { user_id: user.id, action_type: 'resume_tailor', input_tokens: Math.round(result.inputTokens * 0.7), output_tokens: Math.round(result.outputTokens * 0.7), model: result.model },
    { user_id: user.id, action_type: 'cover_letter', input_tokens: Math.round(result.inputTokens * 0.3), output_tokens: Math.round(result.outputTokens * 0.3), model: result.model },
  ]).then(() => {})

  // Generate signed URLs for immediate download
  const [pdfSigned, docxSigned, clPdfSigned, clDocxSigned] = await Promise.all([
    supabase.storage.from('tailored').createSignedUrl(resumePdfPath, 3600),
    supabase.storage.from('tailored').createSignedUrl(resumeDocxPath, 3600),
    supabase.storage.from('tailored').createSignedUrl(clPdfPath, 3600),
    supabase.storage.from('tailored').createSignedUrl(clDocxPath, 3600),
  ])

  return NextResponse.json({
    tailored: { ...tailoredRecord, pdf_url: pdfSigned.data?.signedUrl, docx_url: docxSigned.data?.signedUrl },
    coverLetter: { ...clRecord, pdf_url: clPdfSigned.data?.signedUrl, docx_url: clDocxSigned.data?.signedUrl },
  }, { status: 201 })
}
