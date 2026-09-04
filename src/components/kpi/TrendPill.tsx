import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Trend } from '@/types'

export function TrendPill({ trend, className }: { trend: Trend; className?: string }) {
  const isUp = trend.direction === 'up'
  const isFlat = trend.direction === 'flat'
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset',
        isFlat && 'bg-secondary text-muted-foreground ring-border',
        !isFlat && isUp && 'bg-success-50 text-success-700 ring-success-100',
        !isFlat && !isUp && 'bg-danger-50 text-danger-700 ring-danger-100',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {trend.changePct > 0 ? '+' : ''}
      {trend.changePct.toFixed(1)}%
    </span>
  )
}
