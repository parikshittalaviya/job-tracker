import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApplicationDetail } from '@/components/applications/application-detail'
import type { JobApplication, ApplicationNote } from '@/types/database'

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

  const { data: notes } = await supabase
    .from('application_notes')
    .select('*')
    .eq('application_id', id)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <ApplicationDetail
      app={app as JobApplication}
      notes={(notes ?? []) as ApplicationNote[]}
    />
  )
}
