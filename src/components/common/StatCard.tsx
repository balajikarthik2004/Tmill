import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  to?: string
}

const tones = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  info: 'bg-info-50 text-info-600',
}

export function StatCard({ label, value, sublabel, icon: Icon, tone = 'default', to }: StatCardProps) {
  const body = (
    <Card className={cn('h-full p-3.5', to && 'transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md')}>
      <div className="flex items-start gap-2.5">
        {Icon && (
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{value}</div>
          {sublabel && <div className="text-[11px] leading-snug text-muted-foreground">{sublabel}</div>}
        </div>
      </div>
    </Card>
  )

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  )
}

export function StatGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 | 5 | 6 }) {
  const colClass = {
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
  }[cols]
  return <div className={cn('grid grid-cols-2 gap-3', colClass)}>{children}</div>
}
