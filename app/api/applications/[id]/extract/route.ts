import { createClient } from '@/lib/supabase/server'
import { extractJobDescription } from '@/lib/extract-jd'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: app } = await supabase
    .from('job_applications')
    .select('id, job_description')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('anthropic_key')
    .eq('id', user.id)
    .single()

  const userKey = profile?.anthropic_key?.trim() || null
  const appKey = process.env.ANTHROPIC_API_KEY?.trim() || null
  const apiKey = userKey || appKey

  if (!apiKey) {
    return NextResponse.json(
      { error: 'No API key available. Add your Anthropic key in Profile.' },
      { status: 422 }
    )
  }

  const usesAppKey = !userKey && !!appKey
  const today = new Date().toISOString().slice(0, 10)

  if (usesAppKey) {
    const { data: usage } = await supabase
      .from('tailoring_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single()

    if ((usage?.count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Daily free limit reached. Add your Anthropic API key in Profile to continue.' },
        { status: 429 }
      )
    }
  }

  const extracted = await extractJobDescription(app.job_description, apiKey)
  if (!extracted) return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 })

  if (usesAppKey) {
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

  const { data: updated, error } = await supabase
    .from('job_applications')
    .update({
      company: extracted.company,
      role: extracted.role,
      location: extracted.location,
      work_type: extracted.work_type,
      salary_min: extracted.salary_min,
      salary_max: extracted.salary_max,
      salary_currency: extracted.salary_currency,
      h1_sponsor: extracted.h1_sponsor,
      requirements: extracted.requirements,
      deadline: extracted.deadline,
      ai_extracted: true,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
