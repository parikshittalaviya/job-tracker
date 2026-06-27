import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Briefcase, TrendingUp, Clock, CheckCircle, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Dashboard — Job Tracker' }

const IN_PROGRESS_STATUSES = ['applied', 'phone_screen', 'technical', 'onsite']
const PENDING_STATUSES = ['applied', 'phone_screen']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: apps }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('job_applications').select('status').eq('user_id', user!.id),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const total = apps?.length ?? 0
  const inProgress = apps?.filter((a) => IN_PROGRESS_STATUSES.includes(a.status)).length ?? 0
  const pending = apps?.filter((a) => PENDING_STATUSES.includes(a.status)).length ?? 0
  const offers = apps?.filter((a) => a.status === 'offer' || a.status === 'accepted').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hey, {firstName} 👋</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s your job hunt at a glance.</p>
        </div>
        <Button asChild>
          <Link href="/applications/new">
            <Plus className="h-4 w-4 mr-1" /> Add Application
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: total, icon: Briefcase, color: 'text-blue-500' },
          { label: 'In Progress', value: inProgress, icon: TrendingUp, color: 'text-yellow-500' },
          { label: 'Pending Response', value: pending, icon: Clock, color: 'text-orange-500' },
          { label: 'Offers', value: offers, icon: CheckCircle, color: 'text-green-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder for Phase 4 charts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            Charts and visualizations coming in Phase 4
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
