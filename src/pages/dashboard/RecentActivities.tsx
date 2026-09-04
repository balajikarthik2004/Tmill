import { Link } from 'react-router-dom'
import {
  ClipboardCheck,
  FileText,
  FlaskConical,
  PackageCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatRelativeShort } from '@/lib/format'
import type { Activity, ActivityType } from '@/types'

const iconByType: Record<ActivityType, { icon: typeof FileText; color: string }> = {
  'SO Received': { icon: ShoppingBag, color: 'text-info-600 bg-info-50' },
  'PO Started': { icon: ClipboardCheck, color: 'text-violet-600 bg-violet-100' },
  'Quality Test': { icon: FlaskConical, color: 'text-teal-600 bg-teal-100' },
  'Material Received': { icon: PackageCheck, color: 'text-success-600 bg-success-50' },
  'Invoice Generated': { icon: FileText, color: 'text-amber-600 bg-amber-100' },
  'Dispatch Completed': { icon: Truck, color: 'text-indigo-600 bg-indigo-100' },
}

export function RecentActivities({ activities, isLoading }: { activities: Activity[]; isLoading?: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Activities</CardTitle>
        <Link to="/reports" className="text-xs font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
        ) : (
          activities.slice(0, 5).map((activity) => {
            const { icon: Icon, color } = iconByType[activity.type]
            return (
              <Link
                key={activity.id}
                to={activity.linkTo}
                className="flex items-center gap-2.5 rounded-md -mx-1.5 px-1.5 py-1.5 transition-colors hover:bg-accent"
              >
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', color)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{activity.description}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeShort(activity.timestamp)}</span>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
