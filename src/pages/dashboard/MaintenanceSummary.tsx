import { Link } from 'react-router-dom'
import { AlertTriangle, PackageMinus, ShieldAlert, Wrench } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MaintenanceSummary as MaintenanceSummaryData } from '@/types'

export function MaintenanceSummary({ data }: { data: MaintenanceSummaryData }) {
  const stats = [
    { label: 'Breakdowns', value: data.breakdowns, icon: Wrench, to: '/maintenance/breakdown', color: 'text-danger-600' },
    { label: 'PM Due', value: data.pmDue, icon: ShieldAlert, to: '/maintenance/pm', color: 'text-warning-600' },
    { label: 'Critical Machines', value: data.criticalMachines, icon: AlertTriangle, to: '/maintenance/machine-dashboard', color: 'text-warning-600' },
    { label: 'Spare Parts Low', value: data.lowSpares, icon: PackageMinus, to: '/maintenance/spare-parts', color: 'text-info-600' },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Maintenance</CardTitle>
        <Link to="/maintenance/machine-dashboard" className="text-xs font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              to={s.to}
              className="flex items-center gap-3 rounded-md -mx-1.5 px-1.5 py-1 transition-colors hover:bg-accent"
            >
              <Icon className={cn('h-4 w-4 shrink-0', s.color)} />
              <span className="flex-1 text-sm font-medium text-foreground">{s.label}</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{s.value}</span>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
