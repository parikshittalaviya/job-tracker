import { createClient } from '@/lib/supabase/server'
import { Briefcase, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Dashboard — Job Tracker' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hey, {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your job hunt at a glance.</p>
      </div>

      {/* Stat cards — will be populated in Phase 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: '—', icon: Briefcase, color: 'text-blue-500' },
          { label: 'In Progress', value: '—', icon: TrendingUp, color: 'text-yellow-500' },
          { label: 'Pending Response', value: '—', icon: Clock, color: 'text-orange-500' },
          { label: 'Offers', value: '—', icon: CheckCircle, color: 'text-green-500' },
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
