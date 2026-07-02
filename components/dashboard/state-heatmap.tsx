'use client'

import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR',
  California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
}

function toColor(count: number, max: number): string {
  if (count === 0) return '#f1f5f9'
  const t = Math.min(count / Math.max(max, 1), 1)
  const r = Math.round(219 - t * 189)
  const g = Math.round(234 - t * 170)
  const b = Math.round(254 - t * 79)
  return `rgb(${r},${g},${b})`
}

export function StateHeatmap({
  stateCounts,
  remoteCount,
}: {
  stateCounts: Record<string, number>
  remoteCount: number
}) {
  const [hovered, setHovered] = useState<{ name: string; code: string; count: number } | null>(null)
  const max = Math.max(...Object.values(stateCounts), 1)
  const hasData = Object.values(stateCounts).some((v) => v > 0) || remoteCount > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between min-h-[24px]">
        {hovered ? (
          <p className="text-sm">
            <span className="font-medium">{hovered.name}</span>{' '}
            <span className="text-muted-foreground">({hovered.code})</span>:{' '}
            <span className="font-semibold">{hovered.count}</span>{' '}
            <span className="text-muted-foreground">
              application{hovered.count !== 1 ? 's' : ''}
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {hasData ? 'Hover a state to see count' : 'No location data yet'}
          </p>
        )}
        {remoteCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
            +{remoteCount} remote (no state)
          </span>
        )}
      </div>

      <ComposableMap projection="geoAlbersUsa" style={{ width: '100%', height: 'auto' }}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.NAME as string
              const code = STATE_NAME_TO_CODE[stateName] ?? ''
              const count = stateCounts[code] ?? 0
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={toColor(count, max)}
                  stroke="#cbd5e1"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none', cursor: 'pointer' },
                    hover:   { outline: 'none', opacity: 0.75 },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={() => setHovered({ name: stateName, code, count })}
                  onMouseLeave={() => setHovered(null)}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  )
}
