import { createClient } from '@/lib/supabase/server'
import { NewApplicationForm } from '@/components/applications/new-application-form'

export const metadata = { title: 'Add Application — Job Tracker' }

export default async function NewApplicationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().slice(0, 10)
  const { data: usage } = await supabase
    .from('tailoring_usage')
    .select('count')
    .eq('user_id', user!.id)
    .eq('usage_date', today)
    .single()

  const dailyUsed = usage?.count ?? 0
  const dailyLimit = 3

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Application</h1>
        <p className="text-muted-foreground mt-1">Add a job posting URL and/or paste the job description.</p>
      </div>
      <NewApplicationForm dailyUsed={dailyUsed} dailyLimit={dailyLimit} />
    </div>
  )
}
