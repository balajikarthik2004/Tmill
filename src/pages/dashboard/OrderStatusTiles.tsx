import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import type { OrderStatusTiles as OrderStatusTilesData } from '@/types'

const tiles = [
  { key: 'onSchedule' as const, label: 'On Schedule', to: '/sales/sales-orders?risk=onSchedule', classes: 'bg-success-50 text-success-600' },
  { key: 'atRisk' as const, label: 'At Risk', to: '/sales/sales-orders?risk=high', classes: 'bg-warning-50 text-warning-600' },
  { key: 'delayed' as const, label: 'Delayed', to: '/sales/sales-orders?risk=delayed', classes: 'bg-danger-50 text-danger-600' },
  { key: 'completed' as const, label: 'Completed', to: '/sales/sales-orders?risk=completed', classes: 'bg-info-50 text-info-600' },
]

export function OrderStatusTiles({ data }: { data: OrderStatusTilesData }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Active Orders</CardTitle>
        <Link to="/sales/sales-orders" className="text-xs font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            to={tile.to}
            className={`rounded-md p-3 transition-transform hover:-translate-y-0.5 ${tile.classes}`}
          >
            <div className="text-xs font-medium">{tile.label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{formatNumber(data[tile.key])}</div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
