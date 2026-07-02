import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Briefcase, TrendingUp, Clock, CheckCircle, Plus, CalendarClock, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/applications/status-badge'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import type { DashboardData } from '@/components/dashboard/dashboard-charts'
import type { JobApplication } from '@/types/database'

export const metadata = { title: 'Dashboard — Job Tracker' }

const IN_PROGRESS = ['applied', 'phone_screen', 'technical', 'onsite']
const PENDING     = ['applied', 'phone_screen']

const STATE_ABBREVS = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
])

const STATE_NAMES: Record<string, string> = {
  alabama:'AL', alaska:'AK', arizona:'AZ', arkansas:'AR', california:'CA',
  colorado:'CO', connecticut:'CT', delaware:'DE', florida:'FL', georgia:'GA',
  hawaii:'HI', idaho:'ID', illinois:'IL', indiana:'IN', iowa:'IA', kansas:'KS',
  kentucky:'KY', louisiana:'LA', maine:'ME', maryland:'MD', massachusetts:'MA',
  michigan:'MI', minnesota:'MN', mississippi:'MS', missouri:'MO', montana:'MT',
  nebraska:'NE', nevada:'NV', 'new hampshire':'NH', 'new jersey':'NJ',
  'new mexico':'NM', 'new york':'NY', 'north carolina':'NC', 'north dakota':'ND',
  ohio:'OH', oklahoma:'OK', oregon:'OR', pennsylvania:'PA', 'rhode island':'RI',
  'south carolina':'SC', 'south dakota':'SD', tennessee:'TN', texas:'TX',
  utah:'UT', vermont:'VT', virginia:'VA', washington:'WA', 'west virginia':'WV',
  wisconsin:'WI', wyoming:'WY', 'district of columbia':'DC', 'washington dc':'DC',
}

function extractStateCode(location: string | null): string | null {
  if (!location) return null
  const lower = location.toLowerCase()
  if (lower.includes('remote') || lower.includes('worldwide') || lower.includes('anywhere')) return null
  // "City, ST" pattern
  const m = location.match(/,\s*([A-Z]{2})\s*$/)
  if (m && STATE_ABBREVS.has(m[1])) return m[1]
  // Full state name anywhere in the string
  for (const [name, code] of Object.entries(STATE_NAMES)) {
    if (lower.includes(name)) return code
  }
  return null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: rawApps }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('job_applications')
      .select('id, company, role, location, work_type, h1_sponsor, status, deadline, created_at, updated_at')
      .eq('user_id', user!.id),
  ])

  const apps = (rawApps ?? []) as Pick<JobApplication,
    'id' | 'company' | 'role' | 'location' | 'work_type' | 'h1_sponsor' | 'status' | 'deadline' | 'created_at' | 'updated_at'>[]

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // ── Stat cards ──────────────────────────────────────────────────
  const total      = apps.length
  const inProgress = apps.filter((a) => IN_PROGRESS.includes(a.status)).length
  const pending    = apps.filter((a) => PENDING.includes(a.status)).length
  const offers     = apps.filter((a) => a.status === 'offer' || a.status === 'accepted').length

  // ── Deadline alerts (next 7 days) ───────────────────────────────
  const todayMs = new Date().setHours(0, 0, 0, 0)
  const sevenMs = todayMs + 7 * 86400000
  const deadlineApps = apps
    .filter((a) => {
      if (!a.deadline) return false
      const d = new Date(a.deadline).getTime()
      return d >= todayMs && d <= sevenMs
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())

  // ── Recent activity ─────────────────────────────────────────────
  const recentApps = [...apps]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  // ── Chart data ──────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  const workTypeCounts: Record<string, number> = {}
  const h1Counts = { yes: 0, no: 0, unknown: 0 }
  const stateCounts: Record<string, number> = {}
  let remoteCount = 0
  const timelineMap: Record<string, number> = {}

  for (const app of apps) {
    // Status
    statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1

    // Work type
    const wt = app.work_type ?? 'unknown'
    workTypeCounts[wt] = (workTypeCounts[wt] ?? 0) + 1

    // H1 sponsorship
    if (app.h1_sponsor === true)       h1Counts.yes++
    else if (app.h1_sponsor === false) h1Counts.no++
    else                               h1Counts.unknown++

    // State / remote
    if (app.work_type === 'remote') {
      remoteCount++
    } else {
      const code = extractStateCode(app.location)
      if (code) stateCounts[code] = (stateCounts[code] ?? 0) + 1
    }

    // Timeline (group by month)
    const d = new Date(app.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    timelineMap[key] = (timelineMap[key] ?? 0) + 1
  }

  const timeline = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, count]) => {
      const [yr, mo] = k.split('-')
      const label = new Date(Number(yr), Number(mo) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      return { period: label, count }
    })

  const chartData: DashboardData = {
    statusCounts,
    workTypeCounts,
    h1Counts,
    stateCounts,
    remoteCount,
    timeline,
    rejectedCount: statusCounts['rejected'] ?? 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: total,      icon: Briefcase,    color: 'text-blue-500' },
          { label: 'In Progress',        value: inProgress, icon: TrendingUp,   color: 'text-yellow-500' },
          { label: 'Pending Response',   value: pending,    icon: Clock,        color: 'text-orange-500' },
          { label: 'Offers',             value: offers,     icon: CheckCircle,  color: 'text-green-500' },
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

      {/* Deadline alerts + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deadline alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {deadlineApps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No deadlines in the next 7 days</p>
            ) : (
              <ul className="space-y-2">
                {deadlineApps.map((app) => {
                  const daysLeft = Math.ceil(
                    (new Date(app.deadline!).getTime() - todayMs) / 86400000
                  )
                  const urgent = daysLeft <= 2
                  return (
                    <li key={app.id}>
                      <Link
                        href={`/applications/${app.id}`}
                        className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{app.company ?? 'Unknown Company'}</p>
                          <p className="text-xs text-muted-foreground truncate">{app.role ?? 'Unknown Role'}</p>
                        </div>
                        <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
                          urgent
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentApps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No applications yet</p>
            ) : (
              <ul className="space-y-1">
                {recentApps.map((app) => (
                  <li key={app.id}>
                    <Link
                      href={`/applications/${app.id}`}
                      className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{app.company ?? 'Unknown Company'}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.role ?? 'Unknown Role'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={app.status} />
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      {total > 0 ? (
        <DashboardCharts data={chartData} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Add your first application to start seeing charts and insights.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/applications/new">Add Application</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
