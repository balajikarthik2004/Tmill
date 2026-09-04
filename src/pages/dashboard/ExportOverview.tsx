import { Link } from 'react-router-dom'
import { Globe2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatInrCompact } from '@/lib/format'

interface ExportSummary {
  published: { countries: number; regions: string[]; exportSharePct: number; annualSalesUsd: number }
  exportOrderCount: number
  exportValueInr: number
  activeCountries: number
  byRegion: { region: string; orders: number; valueInr: number }[]
}

const regionColors: Record<string, string> = {
  Europe: 'bg-brand-500',
  America: 'bg-copper-500',
  'South Asia': 'bg-info-500',
  Australia: 'bg-warning-500',
}

export function ExportOverview({ data }: { data: ExportSummary }) {
  const maxValue = Math.max(...data.byRegion.map((r) => r.valueInr), 1)

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Export Business</CardTitle>
        <Link to="/sales/export-orders" className="text-xs font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-3.5">
        <div className="flex items-center gap-2.5 rounded-md bg-success-50 p-2.5">
          <Globe2 className="h-5 w-5 shrink-0 text-success-600" />
          <div className="text-xs leading-tight">
            <div className="font-semibold text-success-600">
              {data.published.exportSharePct}% exported · {data.published.countries} countries
            </div>
            <div className="text-muted-foreground">
              Annual sales over US${(data.published.annualSalesUsd / 1_000_000).toFixed(0)}M
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {data.byRegion.map((r) => (
            <div key={r.region}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{r.region}</span>
                <span className="tabular-nums text-muted-foreground">{formatInrCompact(r.valueInr)}</span>
              </div>
              <Progress
                value={(r.valueInr / maxValue) * 100}
                indicatorClassName={regionColors[r.region] ?? 'bg-primary'}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
