import { Badge } from '@/components/ui/badge'
import type { RiskLevel } from '@/types'

const config: Record<RiskLevel, { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' }> = {
  onSchedule: { label: 'On Schedule', variant: 'success' },
  atRisk: { label: 'At Risk', variant: 'warning' },
  delayed: { label: 'Delayed', variant: 'danger' },
  completed: { label: 'Completed', variant: 'secondary' },
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const { label, variant } = config[risk]
  return <Badge variant={variant}>{label}</Badge>
}
