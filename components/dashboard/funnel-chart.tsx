'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const STAGES = [
  { key: 'saved',        label: 'Saved',        color: '#94a3b8' },
  { key: 'applied',      label: 'Applied',       color: '#3b82f6' },
  { key: 'phone_screen', label: 'Phone Screen',  color: '#eab308' },
  { key: 'technical',    label: 'Technical',     color: '#a855f7' },
  { key: 'onsite',       label: 'Onsite',        color: '#6366f1' },
  { key: 'offer',        label: 'Offer',         color: '#22c55e' },
  { key: 'accepted',     label: 'Accepted',      color: '#10b981' },
]

export function FunnelChart({ counts }: { counts: Record<string, number> }) {
  const data = STAGES.map((s) => ({ name: s.label, count: counts[s.key] ?? 0, color: s.color }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          dataKey="name"
          type="category"
          width={92}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
          formatter={(value) => [value as number, 'Applications']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
