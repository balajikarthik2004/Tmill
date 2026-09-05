import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeftRight } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getStockMovements } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InventoryCategory, StockMovement, StockMovementType } from '@/types'

const movementTypes: StockMovementType[] = [
  'GRN',
  'Issue',
  'Transfer',
  'Prod Consumption',
  'Prod Receipt',
  'Dispatch',
  'Adjustment',
]

const categories: InventoryCategory[] = ['Raw Cotton', 'WIP', 'Finished Yarn']

const typeVariant: Record<StockMovementType, NonNullable<BadgeProps['variant']>> = {
  GRN: 'success',
  Issue: 'warning',
  Transfer: 'info',
  'Prod Consumption': 'warning',
  'Prod Receipt': 'success',
  Dispatch: 'info',
  Adjustment: 'secondary',
}

const ALL = 'all'

export default function StockMovements() {
  const [type, setType] = useState<string>(ALL)
  const [category, setCategory] = useState<string>(ALL)

  const all = useAsync(() => getStockMovements({}), [])
  const filtered = useAsync(
    () =>
      getStockMovements({
        type: type === ALL ? undefined : (type as StockMovementType),
        category: category === ALL ? undefined : (category as InventoryCategory),
      }),
    [type, category],
  )
  const factories = useAsync(getFactories, [])

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.shortName])),
    [factories.data],
  )

  const countsByType = useMemo(() => {
    const map = new Map<StockMovementType, number>()
    for (const m of all.data ?? []) map.set(m.type, (map.get(m.type) ?? 0) + 1)
    return map
  }, [all.data])

  const columns = useMemo<ColumnDef<StockMovement, any>[]>(
    () => [
      { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
      { accessorKey: 'referenceNo', header: 'Reference No' },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <Badge variant={typeVariant[row.original.type]}>{row.original.type}</Badge>,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
      },
      { accessorKey: 'itemName', header: 'Item' },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.qty)} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'factoryId',
        header: 'Unit',
        cell: ({ row }) => factoryNames.get(row.original.factoryId) ?? row.original.factoryId,
      },
    ],
    [factoryNames],
  )

  const totalCount = all.data?.length ?? 0

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Stock Movements"
        description="Every goods receipt, issue, transfer, production consumption, production receipt, dispatch and adjustment across the five units."
        actions={
          <div className="flex items-center gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All movement types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All movement types</SelectItem>
                {movementTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {all.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <button type="button" onClick={() => setType(ALL)} className="text-left">
            <Card
              className={cn(
                'h-full p-3 transition-all hover:border-primary/40',
                type === ALL && 'border-primary/60 bg-accent/50',
              )}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                All movements
              </div>
              <div className="mt-0.5 num text-lg font-semibold text-foreground">{formatNumber(totalCount)}</div>
            </Card>
          </button>
          {movementTypes.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className="text-left">
              <Card
                className={cn(
                  'h-full p-3 transition-all hover:border-primary/40',
                  type === t && 'border-primary/60 bg-accent/50',
                )}
              >
                <div className="truncate text-xs text-muted-foreground">{t}</div>
                <div className="mt-0.5 num text-lg font-semibold text-foreground">
                  {formatNumber(countsByType.get(t) ?? 0)}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Movement Ledger</CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatNumber(filtered.data?.length ?? 0)} of {formatNumber(totalCount)} movements
            {type !== ALL && ` · ${type}`}
            {category !== ALL && ` · ${category}`}
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filtered.data ?? []}
            isLoading={filtered.isLoading || factories.isLoading}
            emptyMessage="No stock movements match this filter."
            pageSize={15}
          />
        </CardContent>
      </Card>
    </div>
  )
}
