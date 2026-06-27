import { createClient } from '@/lib/supabase/server'
import { fetchJobDescription } from '@/lib/fetch-jd'
import { extractJobDescription } from '@/lib/extract-jd'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { url?: string; job_description: string }
  const { url, job_description } = body

  if (!job_description?.trim() && !url?.trim()) {
    return NextResponse.json({ error: 'job_description or url is required' }, { status: 400 })
  }

  // 1. Attempt HTTP fetch if URL provided
  let finalJd = job_description?.trim() || ''
  let fetchError: string | null = null

  if (url?.trim()) {
    const result = await fetchJobDescription(url.trim())
    fetchError = result.error

    // Log the fetch attempt (best-effort, don't block on this)
    supabase.from('fetch_logs').insert({
      user_id: user.id,
      url: url.trim(),
      status: result.error ? 'failed' : 'success',
      error_message: result.error,
    }).then(() => {})

    if (result.text && !finalJd) {
      finalJd = result.text
    }
  }

  if (!finalJd.trim()) {
    return NextResponse.json({ error: 'Could not obtain job description' }, { status: 422 })
  }

  // 2. Resolve API key: prefer user's own key, fall back to app key
  const { data: profile } = await supabase
    .from('profiles')
    .select('anthropic_key')
    .eq('id', user.id)
    .single()

  const userKey = profile?.anthropic_key?.trim() || null
  const appKey = process.env.ANTHROPIC_API_KEY?.trim() || null
  const apiKey = userKey || appKey

  console.log('[api/applications] apiKey present:', !!apiKey, '| userKey:', !!userKey, '| appKey:', !!appKey)

  // 3. Check/enforce 3/day limit for app key usage
  let aiExtracted = false
  let extracted = null

  if (apiKey) {
    const usesAppKey = !userKey && !!appKey
    let canRun = true

    if (usesAppKey) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: usage } = await supabase
        .from('tailoring_usage')
        .select('count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .single()

      if ((usage?.count ?? 0) >= 3) {
        canRun = false
      }
    }

    if (canRun) {
      extracted = await extractJobDescription(finalJd, apiKey)

      if (extracted && usesAppKey) {
        const today = new Date().toISOString().slice(0, 10)
        const { data: existing } = await supabase
          .from('tailoring_usage')
          .select('count')
          .eq('user_id', user.id)
          .eq('usage_date', today)
          .single()

        if (existing) {
          await supabase
            .from('tailoring_usage')
            .update({ count: existing.count + 1 })
            .eq('user_id', user.id)
            .eq('usage_date', today)
        } else {
          await supabase
            .from('tailoring_usage')
            .insert({ user_id: user.id, usage_date: today, count: 1 })
        }
      }

      aiExtracted = !!extracted
    }
  }

  // 4. Insert application
  const { data: app, error } = await supabase
    .from('job_applications')
    .insert({
      user_id: user.id,
      url: url?.trim() || null,
      job_description: finalJd,
      company: extracted?.company ?? null,
      role: extracted?.role ?? null,
      location: extracted?.location ?? null,
      work_type: extracted?.work_type ?? null,
      salary_min: extracted?.salary_min ?? null,
      salary_max: extracted?.salary_max ?? null,
      salary_currency: extracted?.salary_currency ?? 'USD',
      h1_sponsor: extracted?.h1_sponsor ?? null,
      requirements: extracted?.requirements ?? [],
      deadline: extracted?.deadline ?? null,
      status: 'saved',
      ai_extracted: aiExtracted,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...app, fetch_error: fetchError }, { status: 201 })
}
