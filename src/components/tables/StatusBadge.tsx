import { Badge, type BadgeProps } from '@/components/ui/badge'

const positiveStatuses = new Set(['Completed', 'Running', 'Approved', 'Pass', 'Resolved', 'Closed', 'Delivered', 'In Use'])
const warningStatuses = new Set(['In Progress', 'Quality Check', 'Scheduled', 'Due', 'Pending', 'In Transit', 'Investigating', 'Idle', 'Rework'])
const negativeStatuses = new Set(['Rejected', 'Breakdown', 'Overdue', 'Fail', 'Open', 'On Hold'])

function variantFor(status: string): NonNullable<BadgeProps['variant']> {
  if (positiveStatuses.has(status)) return 'success'
  if (warningStatuses.has(status)) return 'warning'
  if (negativeStatuses.has(status)) return 'danger'
  return 'secondary'
}

export function StatusBadge({ status, variant }: { status: string; variant?: BadgeProps['variant'] }) {
  return <Badge variant={variant ?? variantFor(status)}>{status}</Badge>
}
