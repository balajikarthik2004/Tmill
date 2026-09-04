import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, CircleDashed, ClipboardList, PauseOctagon, PlayCircle, ShieldAlert, XCircle } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/store/appStore'
import { getFactories, getProductionOrders } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import type { ProductionOrder, ProductionStatus } from '@/types'

const statuses: ProductionStatus[] = [
  'Planned',
  'In Progress',
  'Quality Check',
  'Completed',
  'Rejected',
  'On Hold',
]

const statusMeta: Record<ProductionStatus, { icon: typeof ClipboardList; tone: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  Planned: { icon: CircleDashed, tone: 'info' },
  'In Progress': { icon: PlayCircle, tone: 'warning' },
  'Quality Check': { icon: ShieldAlert, tone: 'warning' },
  Completed: { icon: CheckCircle2, tone: 'success' },
  Rejected: { icon: XCircle, tone: 'danger' },
  'On Hold': { icon: PauseOctagon, tone: 'danger' },
}

function progressPct(order: ProductionOrder) {
  return order.plannedQty > 0 ? Math.round((order.producedQty / order.plannedQty) * 100) : 0
}

function columnsFor(unitName: (id: string) => string): ColumnDef<ProductionOrder, any>[] {
  return [
    { accessorKey: 'orderNo', header: 'Order No' },
    { accessorKey: 'salesOrderNo', header: 'Sales Order', cell: ({ row }) => row.original.salesOrderNo ?? '—' },
    { accessorKey: 'productName', header: 'Product' },
    { accessorKey: 'productType', header: 'Type' },
    { accessorKey: 'factoryId', header: 'Unit', cell: ({ row }) => unitName(row.original.factoryId) },
    { accessorKey: 'process', header: 'Process' },
    { accessorKey: 'machineCode', header: 'Machine' },
    {
      accessorKey: 'plannedQty',
      header: 'Planned',
      cell: ({ row }) => `${formatNumber(row.original.plannedQty)} ${row.original.unit}`,
    },
    {
      accessorKey: 'producedQty',
      header: 'Produced',
      cell: ({ row }) => `${formatNumber(row.original.producedQty)} ${row.original.unit}`,
    },
    {
      id: 'progress',
      header: 'Progress',
      accessorFn: (row) => (row.plannedQty > 0 ? (row.producedQty / row.plannedQty) * 100 : 0),
      cell: ({ row }) => {
        const pct = progressPct(row.original)
        return (
          <div className="flex items-center gap-2">
            <Progress value={Math.min(pct, 100)} className="h-1.5 w-16" />
            <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">{pct}%</span>
          </div>
        )
      },
    },
    { accessorKey: 'shift', header: 'Shift' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'startDate', header: 'Start', cell: ({ row }) => formatDate(row.original.startDate) },
    { accessorKey: 'endDate', header: 'Target End', cell: ({ row }) => formatDate(row.original.endDate) },
  ]
}

export default function ProductionOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { factoryId } = useAppStore()

  const rawStatus = searchParams.get('status')
  const status = rawStatus && statuses.includes(rawStatus as ProductionStatus) ? (rawStatus as ProductionStatus) : null
  const highlightId = searchParams.get('highlight')

  const factoriesQuery = useAsync(getFactories, [])
  const allOrders = useAsync(() => getProductionOrders({ factoryId }), [factoryId])

  const unitName = useMemo(() => {
    const map = new Map((factoriesQuery.data ?? []).map((f) => [f.id as string, f.name]))
    return (id: string) => map.get(id) ?? id
  }, [factoriesQuery.data])

  const orders = useMemo(() => allOrders.data ?? [], [allOrders.data])

  const counts = useMemo(() => {
    const result = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<ProductionStatus, number>
    for (const o of orders) result[o.status] += 1
    return result
  }, [orders])

  const visible = useMemo(
    () => (status ? orders.filter((o) => o.status === status) : orders),
    [orders, status],
  )

  const highlighted = useMemo(
    () => (highlightId ? orders.find((o) => o.id === highlightId) ?? null : null),
    [orders, highlightId],
  )

  function setStatus(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('status')
    else params.set('status', next)
    setSearchParams(params, { replace: true })
  }

  const plannedTotal = visible.reduce((sum, o) => sum + o.plannedQty, 0)
  const producedTotal = visible.reduce((sum, o) => sum + o.producedQty, 0)
  const scopeLabel = factoryId === 'all' ? 'all five units' : unitName(factoryId)

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Production Orders"
        description={`Order book for ${scopeLabel} — ${formatNumber(orders.length)} orders released to the shop floor.`}
      />

      {allOrders.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-17 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          {statuses.map((s) => (
            <StatCard
              key={s}
              label={s}
              value={formatNumber(counts[s])}
              sublabel={orders.length > 0 ? formatPct((counts[s] / orders.length) * 100, 0) : '0%'}
              icon={statusMeta[s].icon}
              tone={statusMeta[s].tone}
            />
          ))}
        </StatGrid>
      )}

      {highlighted && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>
              {highlighted.orderNo} · {highlighted.productName}
            </CardTitle>
            <StatusBadge status={highlighted.status} />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Unit / Process</div>
              <div className="font-medium text-foreground">
                {unitName(highlighted.factoryId)} · {highlighted.process}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Machine / Shift</div>
              <div className="font-medium text-foreground">
                {highlighted.machineCode} · Shift {highlighted.shift}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Produced / Planned</div>
              <div className="font-medium tabular-nums text-foreground">
                {formatNumber(highlighted.producedQty)} / {formatNumber(highlighted.plannedQty)} {highlighted.unit}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Window</div>
              <div className="font-medium text-foreground">
                {formatDate(highlighted.startDate)} → {formatDate(highlighted.endDate)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              Order Book
              {status ? ` · ${status}` : ''}
            </CardTitle>
            <div className="text-xs tabular-nums text-muted-foreground">
              {formatNumber(visible.length)} orders · {formatNumber(producedTotal)} of {formatNumber(plannedTotal)}{' '}
              planned quantity produced
            </div>
          </div>
          <Tabs value={status ?? 'all'} onValueChange={setStatus}>
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="all">All ({formatNumber(orders.length)})</TabsTrigger>
              {statuses.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {s} ({formatNumber(counts[s])})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columnsFor(unitName)}
            data={visible}
            isLoading={allOrders.isLoading}
            emptyMessage={
              status ? `No production orders are currently ${status.toLowerCase()}.` : 'No production orders released.'
            }
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
