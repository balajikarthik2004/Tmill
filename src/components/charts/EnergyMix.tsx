import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PeriodDropdown } from '@/components/common/PeriodDropdown'
import { formatNumber } from '@/lib/format'
import type { EnergySummary } from '@/types'

export function EnergyMix({ summary }: { summary: EnergySummary }) {
  const mixData = [
    { name: 'Renewable', value: summary.renewablePct, color: '#16a34a' },
    { name: 'Grid', value: summary.gridPct, color: '#cbd5e1' },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Energy Consumption</CardTitle>
        <PeriodDropdown />
      </CardHeader>
      <CardContent>
        <Link to="/energy/dashboard" className="flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mixData} dataKey="value" innerRadius="70%" outerRadius="100%" isAnimationActive={false}>
                  {mixData.map((d) => (
                    <Cell key={d.name} fill={d.color} stroke="hsl(var(--card))" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold tabular-nums text-foreground">{formatNumber(summary.totalKwh)}</span>
              <span className="text-[10px] text-muted-foreground">kWh</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              <span className="text-muted-foreground">Renewable</span>
              <span className="font-semibold text-foreground">{summary.renewablePct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <span className="text-muted-foreground">Grid</span>
              <span className="font-semibold text-foreground">{summary.gridPct}%</span>
            </div>
          </div>
        </Link>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3.5">
          <div>
            <div className="text-[11px] text-muted-foreground">Energy per kg</div>
            <div className="text-sm font-bold tabular-nums text-foreground">{summary.kwhPerKg} kWh</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Target</div>
            <div className="text-sm font-bold tabular-nums text-foreground">{summary.targetKwhPerKg} kWh</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
