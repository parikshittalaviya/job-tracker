'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FunnelChart } from './funnel-chart'
import { WorkTypePie } from './worktype-pie'
import { H1Pie } from './h1-pie'
import { TimelineChart } from './timeline-chart'

const StateHeatmap = dynamic(
  () => import('./state-heatmap').then((m) => ({ default: m.StateHeatmap })),
  { ssr: false, loading: () => <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading map…</div> }
)

export type DashboardData = {
  statusCounts: Record<string, number>
  workTypeCounts: Record<string, number>
  h1Counts: { yes: number; no: number; unknown: number }
  stateCounts: Record<string, number>
  remoteCount: number
  timeline: { period: string; count: number }[]
  rejectedCount: number
}

const REJECTION_MESSAGES = [
  { max: 0,        msg: "You're either brand new or incredibly lucky. 🍀" },
  { max: 5,        msg: "A few rejections build character. Keep going." },
  { max: 15,       msg: "Okay, the market is rough. Definitely not you. (Probably.)" },
  { max: 30,       msg: "At this point you're just collecting data. Very scientific." },
  { max: Infinity, msg: "You have enough rejections to write a book. Seriously, write a book." },
]

function rejectionMsg(count: number) {
  return REJECTION_MESSAGES.find((r) => count <= r.max)?.msg ?? ''
}

export function DashboardCharts({ data }: { data: DashboardData }) {
  const [showRejected, setShowRejected] = useState(false)

  return (
    <div className="space-y-4">
      {/* Pipeline funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Application Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart counts={data.statusCounts} />
        </CardContent>
      </Card>

      {/* Work type + H1 side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Work Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkTypePie counts={data.workTypeCounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">H1 Sponsorship</CardTitle>
          </CardHeader>
          <CardContent>
            <H1Pie counts={data.h1Counts} />
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Applications Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineChart data={data.timeline} />
        </CardContent>
      </Card>

      {/* US state heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Applications by State</CardTitle>
        </CardHeader>
        <CardContent>
          <StateHeatmap stateCounts={data.stateCounts} remoteCount={data.remoteCount} />
        </CardContent>
      </Card>

      {/* Easter egg */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5 text-xs"
          onClick={() => setShowRejected((v) => !v)}
        >
          How bad is it really?
          {showRejected ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {showRejected && (
          <Card className="w-full border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="py-6 text-center space-y-1.5">
              <p className="text-5xl font-bold text-red-500">{data.rejectedCount}</p>
              <p className="text-sm text-muted-foreground">
                {data.rejectedCount === 1 ? 'rejection' : 'rejections'}
              </p>
              <p className="text-sm font-medium pt-1">{rejectionMsg(data.rejectedCount)}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
