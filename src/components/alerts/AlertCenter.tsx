import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertItem } from './AlertItem'
import type { Alert } from '@/types'

export function AlertCenter({ alerts, isLoading }: { alerts: Alert[]; isLoading?: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Alerts</CardTitle>
        <Link to="/reports" className="text-xs font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
        ) : alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No alerts — everything is running smoothly.</p>
        ) : (
          alerts.slice(0, 5).map((alert) => <AlertItem key={alert.id} alert={alert} />)
        )}
      </CardContent>
    </Card>
  )
}
