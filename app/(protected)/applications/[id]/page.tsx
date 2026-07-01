import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApplicationDetail } from '@/components/applications/application-detail'
import type { JobApplication, ApplicationNote, Resume } from '@/types/database'

export const metadata = { title: 'Application — Job Tracker' }

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: app } = await supabase
    .from('job_applications')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!app) notFound()

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: notes }, { data: resumeData }, { data: usage }] = await Promise.all([
    supabase.from('application_notes').select('*').eq('application_id', id).eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('resumes').select('*').eq('user_id', user!.id).order('is_default', { ascending: false }),
    supabase.from('tailoring_usage').select('count').eq('user_id', user!.id).eq('usage_date', today).single(),
  ])

  return (
    <ApplicationDetail
      app={app as JobApplication}
      notes={(notes ?? []) as ApplicationNote[]}
      resumes={(resumeData ?? []) as Resume[]}
      dailyUsed={usage?.count ?? 0}
      dailyLimit={3}
    />
  )
}
