import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import type { SeriesPoint } from '@/types'

const upColor = '#16a34a'
const downColor = '#dc2626'

export function Sparkline({ data, direction = 'up' }: { data: SeriesPoint[]; direction?: 'up' | 'down' | 'flat' }) {
  const color = direction === 'down' ? downColor : direction === 'flat' ? '#94a3b8' : upColor
  const gradientId = `sparkline-${color.replace('#', '')}`

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
