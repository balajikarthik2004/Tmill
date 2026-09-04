import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

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
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="h-full">
        <Card className="h-full p-4 glass-card transition-colors hover:border-brand-500/40">
          <div className="flex items-center gap-2.5">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm', visual.iconBg)}>
              <Icon className={cn('h-4.5 w-4.5', visual.iconColor)} />
            </div>
            <div className="text-xs font-medium text-muted-foreground">{kpi.label}</div>
          </div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">{kpi.displayValue}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TrendPill trend={kpi.trend} />
            {visual.compareLabel && <span className="text-[11px] text-muted-foreground">{visual.compareLabel}</span>}
            {kpi.footnote && <span className="text-[11px] text-muted-foreground">· {kpi.footnote}</span>}
          </div>
        </Card>
      </motion.div>
    </Link>
  )
}

