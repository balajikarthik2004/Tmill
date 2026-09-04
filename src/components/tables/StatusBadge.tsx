import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const positiveStatuses = new Set(['Completed', 'Running', 'Approved', 'Pass', 'Resolved', 'Closed', 'Delivered', 'In Use'])
const warningStatuses = new Set(['In Progress', 'Quality Check', 'Scheduled', 'Due', 'Pending', 'In Transit', 'Investigating', 'Idle', 'Rework'])
const negativeStatuses = new Set(['Rejected', 'Breakdown', 'Overdue', 'Fail', 'Open', 'On Hold'])

function variantFor(status: string): NonNullable<BadgeProps['variant']> {
  if (positiveStatuses.has(status)) return 'success'
  if (warningStatuses.has(status)) return 'warning'
  if (negativeStatuses.has(status)) return 'danger'
  return 'secondary'
}

const dotByVariant: Record<string, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  copper: 'bg-copper-500',
  secondary: 'bg-muted-foreground/60',
  default: 'bg-primary-foreground/80',
  outline: 'bg-muted-foreground/60',
}

export function StatusBadge({ status, variant }: { status: string; variant?: BadgeProps['variant'] }) {
  const resolved = variant ?? variantFor(status)
  return (
    <Badge variant={resolved}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotByVariant[resolved] ?? 'bg-current')} />
      {status}
    </Badge>
  )
}
