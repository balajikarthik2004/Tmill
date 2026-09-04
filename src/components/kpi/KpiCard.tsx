import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { kpiVisuals } from '@/lib/kpiVisuals'
import { TrendPill } from './TrendPill'
import type { KpiCardData } from '@/types'

export function KpiCard({ kpi }: { kpi: KpiCardData }) {
  const visual = kpiVisuals[kpi.id]
  const Icon = visual.icon

  return (
    <Link to={kpi.linkTo} className="group block h-full">
      <Card className="hover-lift relative h-full overflow-hidden p-4">
        {/* Hairline accent that warms up on hover */}
        <span className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-brand-400 to-copper-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
              visual.iconBg,
              visual.iconRing,
            )}
          >
            <Icon className={cn('h-4 w-4', visual.iconColor)} />
          </div>
          <div className="min-w-0 text-xs font-medium leading-tight text-muted-foreground">{kpi.label}</div>
        </div>

        <div className="num mt-3.5 text-[1.6rem] font-semibold leading-none text-foreground">
          {kpi.displayValue}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <TrendPill trend={kpi.trend} />
          {visual.compareLabel && <span className="text-[11px] text-muted-foreground">{visual.compareLabel}</span>}
          {kpi.footnote && <span className="text-[11px] text-muted-foreground">· {kpi.footnote}</span>}
        </div>
      </Card>
    </Link>
  )
}
