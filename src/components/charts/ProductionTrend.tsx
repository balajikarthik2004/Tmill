import { useNavigate } from 'react-router-dom'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PeriodDropdown } from '@/components/common/PeriodDropdown'
import { chartMuted, chartPalette } from '@/lib/chartColors'
import type { ProductionTrendPoint } from '@/services/productionService'

interface Props {
  points: ProductionTrendPoint[]
  unit: 'kg' | 'm'
}

export function ProductionTrend({ points, unit }: Props) {
  const navigate = useNavigate()

  const chartData = points.map((p) => ({
    ...p,
    label: format(new Date(p.date), points.length > 10 ? 'd MMM' : 'EEE d'),
  }))

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Production Trend</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Actual vs. target output ({unit})</p>
        </div>
        <PeriodDropdown />
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No production records in this range.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
                onClick={(state) => {
                  const idx = state?.activeTooltipIndex
                  if (typeof idx === 'number' && chartData[idx]) {
                    navigate(`/production?date=${chartData[idx].date}`)
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v: number) => Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                  contentStyle={{
                    borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
                    border: '1px solid hsl(var(--border))',
                    fontSize: 12,
                    background: 'hsl(var(--popover))',
                  }}
                  formatter={(value, name) => [
                    `${Intl.NumberFormat('en-IN').format(Number(value))} ${unit}`,
                    String(name),
                  ]}
                />
                <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]} maxBarSize={36} className="cursor-pointer">
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === chartData.length - 1 ? chartPalette[0] : chartMuted} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="target" name="Target" stroke={chartPalette[1]}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
