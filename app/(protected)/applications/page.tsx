import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ApplicationTable } from '@/components/applications/application-table'
import type { JobApplication } from '@/types/database'

export const metadata = { title: 'Applications — Job Tracker' }

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('job_applications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const apps = (data ?? []) as JobApplication[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-muted-foreground mt-1">Track and manage all your job applications.</p>
        </div>
        <Button asChild>
          <Link href="/applications/new">
            <Plus className="h-4 w-4 mr-1" /> Add Application
          </Link>
        </Button>
      </div>

      <ApplicationTable initialApps={apps} />
    </div>
  )
}
