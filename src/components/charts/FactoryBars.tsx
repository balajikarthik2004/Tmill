import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { FactoryPerformance } from '@/services/productionService'

function barColor(pct: number) {
  if (pct >= 95) return 'bg-success-500'
  if (pct >= 85) return 'bg-warning-500'
  return 'bg-danger-500'
}

export function FactoryBars({ data }: { data: FactoryPerformance[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Factory Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {data.map((f) => (
          <Link
            key={f.factoryId}
            to={`/production?factory=${f.factoryId}`}
            className="block rounded-md -mx-1.5 px-1.5 py-1 transition-colors hover:bg-accent"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm font-medium text-foreground">{f.name}</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {Math.round(f.achievedPct)}%
              </span>
            </div>
            <Progress
              value={Math.min(f.achievedPct, 100)}
              indicatorClassName={cn(barColor(f.achievedPct))}
            />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
