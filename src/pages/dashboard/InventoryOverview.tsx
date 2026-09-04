import { Link } from 'react-router-dom'
import { Boxes, Cloud, Layers, Shirt } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InventoryCategory, InventorySummary } from '@/types'

const iconByCategory: Record<InventoryCategory, typeof Cloud> = {
  'Raw Cotton': Cloud,
  WIP: Layers,
  'Finished Yarn': Boxes,
  Fabric: Shirt,
}

const linkByCategory: Record<InventoryCategory, string> = {
  'Raw Cotton': '/inventory/raw-materials',
  WIP: '/inventory/wip',
  'Finished Yarn': '/inventory/finished-goods',
  Fabric: '/inventory/finished-goods',
}

export function InventoryOverview({ data }: { data: InventorySummary[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Inventory Overview</CardTitle>
        <Link to="/inventory/raw-materials" className="text-xs font-medium text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {data.map((item) => {
          const Icon = iconByCategory[item.category]
          const pctOfReorder = Math.min((item.currentQty / (item.reorderLevel * 1.6)) * 100, 100)
          return (
            <Link
              key={item.category}
              to={linkByCategory[item.category]}
              className="block rounded-md -mx-1.5 px-1.5 py-1 transition-colors hover:bg-accent"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <Icon
                  className={cn('h-4 w-4 shrink-0', item.belowReorder ? 'text-warning-600' : 'text-muted-foreground')}
                />
                <span className="flex-1 truncate text-sm font-medium text-foreground">{item.category}</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatNumber(item.currentQty)} {item.unit}
                </span>
              </div>
              <Progress
                value={pctOfReorder}
                indicatorClassName={item.belowReorder ? 'bg-warning-500' : 'bg-info-500'}
              />
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
