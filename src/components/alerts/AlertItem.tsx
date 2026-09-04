import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { formatRelativeShort } from '@/lib/format'
import type { Alert } from '@/types'

const dotColor: Record<Alert['severity'], string> = {
  critical: 'bg-danger-500',
  high: 'bg-warning-500',
  medium: 'bg-warning-500',
  low: 'bg-info-500',
  info: 'bg-info-500',
}

export function AlertItem({ alert }: { alert: Alert }) {
  return (
    <Link
      to={alert.linkTo}
      className="flex items-center justify-between gap-3 rounded-md -mx-1.5 px-1.5 py-1.5 transition-colors hover:bg-accent"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColor[alert.severity])} />
        <span className="truncate text-sm text-foreground">{alert.title}</span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeShort(alert.timestamp)}</span>
    </Link>
  )
}
