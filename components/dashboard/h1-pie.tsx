'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CONFIG = [
  { key: 'yes',     label: 'Sponsors H1',     color: '#22c55e' },
  { key: 'no',      label: 'No H1 Sponsor',   color: '#f87171' },
  { key: 'unknown', label: 'Unknown',          color: '#cbd5e1' },
]

export function H1Pie({ counts }: { counts: { yes: number; no: number; unknown: number } }) {
  const data = CONFIG
    .map((c) => ({ name: c.label, value: counts[c.key as keyof typeof counts], color: c.color }))
    .filter((d) => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        No data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={76}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
          formatter={(value, name) => [value as number, name as string]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
