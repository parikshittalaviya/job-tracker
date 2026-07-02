'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CONFIG: Record<string, { label: string; color: string }> = {
  remote:  { label: 'Remote',  color: '#14b8a6' },
  hybrid:  { label: 'Hybrid',  color: '#3b82f6' },
  onsite:  { label: 'Onsite',  color: '#6366f1' },
  unknown: { label: 'Unknown', color: '#cbd5e1' },
}

export function WorkTypePie({ counts }: { counts: Record<string, number> }) {
  const data = Object.entries(CONFIG)
    .map(([k, v]) => ({ name: v.label, value: counts[k] ?? 0, color: v.color }))
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
