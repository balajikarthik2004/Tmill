import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertTriangle, Boxes, CalendarClock, PackageCheck, Shirt, Truck } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getInventorySummary, getStockMovements } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InventoryCategory, InventorySummary, StockMovement } from '@/types'
import { chartPalette } from '@/lib/chartColors'

const finishedCategories: InventoryCategory[] = ['Finished Yarn', 'Fabric']

const sliceColors = [...chartPalette]

const receiptTypes = new Set(['Prod Receipt', 'GRN'])

interface ItemFlow {
  item: string
  category: InventoryCategory
  unit: string
  produced: number
  dispatched: number
  movements: number
}

function PositionCard({ summary, icon: Icon }: { summary: InventorySummary; icon: typeof Boxes }) {
  const coverPct = Math.min((summary.currentQty / (summary.reorderLevel * 1.6)) * 100, 100)
  return (
    <Card className={cn(summary.belowReorder && 'border-warning-500/60')}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', summary.belowReorder ? 'text-warning-600' : 'text-muted-foreground')} />
          <CardTitle>{summary.category}</CardTitle>
        </div>
        <Badge variant={summary.belowReorder ? 'danger' : 'success'}>
          {summary.belowReorder ? 'Below reorder level' : 'Above reorder level'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Current stock</div>
            <div className="num text-2xl font-semibold text-foreground">
              {formatNumber(summary.currentQty)} <span className="text-base font-medium">{summary.unit}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Days of cover</div>
            <div className="text-lg font-semibold tabular-nums text-foreground">{summary.daysOfStock}</div>
          </div>
        </div>
        <Progress value={coverPct} indicatorClassName={summary.belowReorder ? 'bg-warning-500' : 'bg-success-500'} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Reorder at {formatNumber(summary.reorderLevel)} {summary.unit}
          </span>
          <span className={cn(summary.belowReorder && 'font-medium text-warning-600')}>
            {summary.belowReorder
              ? `Short by ${formatNumber(summary.reorderLevel - summary.currentQty)} ${summary.unit}`
              : `${formatNumber(summary.currentQty - summary.reorderLevel)} ${summary.unit} headroom`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FinishedGoods() {
  const inventory = useAsync(getInventorySummary, [])
  const movements = useAsync(() => getStockMovements({}), [])
  const factories = useAsync(getFactories, [])

  const yarn = inventory.data?.find((i) => i.category === 'Finished Yarn')
  const fabric = inventory.data?.find((i) => i.category === 'Fabric')
  const belowReorder = (inventory.data ?? []).filter(
    (i) => finishedCategories.includes(i.category) && i.belowReorder,
  )

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.shortName])),
    [factories.data],
  )

  const finishedMovements = useMemo(
    () => (movements.data ?? []).filter((m) => finishedCategories.includes(m.category)),
    [movements.data],
  )

  const flows = useMemo<ItemFlow[]>(() => {
    const map = new Map<string, ItemFlow>()
    for (const m of finishedMovements) {
      const entry =
        map.get(m.itemName) ??
        { item: m.itemName, category: m.category, unit: m.unit, produced: 0, dispatched: 0, movements: 0 }
      entry.movements += 1
      if (receiptTypes.has(m.type)) entry.produced += m.qty
      else if (m.type === 'Dispatch') entry.dispatched += m.qty
      map.set(m.itemName, entry)
    }
    return [...map.values()].sort((a, b) => b.produced - a.produced)
  }, [finishedMovements])

  const yarnFlows = flows.filter((f) => f.category === 'Finished Yarn')
  const fabricFlows = flows.filter((f) => f.category === 'Fabric')
  const yarnProduced = yarnFlows.reduce((s, f) => s + f.produced, 0)
  const totalDispatched = flows.reduce((s, f) => s + f.dispatched, 0)

  const columns = useMemo<ColumnDef<StockMovement, any>[]>(
    () => [
      { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
      { accessorKey: 'referenceNo', header: 'Reference' },
      { accessorKey: 'type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge> },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <Badge variant={row.original.category === 'Fabric' ? 'info' : 'secondary'}>{row.original.category}</Badge>
        ),
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

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Finished Goods"
        description="Finished yarn from the spinning and post-spinning units, and greige fabric from the weaving unit."
      />

      {belowReorder.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning-500/60 bg-warning-50 p-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
          <div className="text-sm">
            <span className="font-semibold text-warning-600">
              {belowReorder.map((i) => i.category).join(' and ')} below reorder level.
            </span>{' '}
            <span className="text-foreground">
              {belowReorder
                .map(
                  (i) =>
                    `${i.category} is at ${formatNumber(i.currentQty)} ${i.unit} against a reorder level of ${formatNumber(i.reorderLevel)} ${i.unit} (${i.daysOfStock} days of cover)`,
                )
                .join('; ')}
              .
            </span>
          </div>
        </div>
      )}

      {inventory.isLoading || !yarn || !fabric ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-17.5 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard
            label="Finished yarn stock"
            value={`${formatNumber(yarn.currentQty)} ${yarn.unit}`}
            sublabel={yarn.belowReorder ? 'Below reorder level' : 'Above reorder level'}
            icon={Boxes}
            tone={yarn.belowReorder ? 'danger' : 'success'}
          />
          <StatCard
            label="Yarn days of cover"
            value={`${yarn.daysOfStock} days`}
            sublabel={`Reorder at ${formatNumber(yarn.reorderLevel)} ${yarn.unit}`}
            icon={CalendarClock}
            tone={yarn.daysOfStock < 10 ? 'warning' : 'default'}
          />
          <StatCard
            label="Greige fabric stock"
            value={`${formatNumber(fabric.currentQty)} ${fabric.unit}`}
            sublabel={fabric.belowReorder ? 'Below reorder level' : 'Above reorder level'}
            icon={Shirt}
            tone={fabric.belowReorder ? 'danger' : 'success'}
          />
          <StatCard
            label="Fabric days of cover"
            value={`${fabric.daysOfStock} days`}
            sublabel={`Reorder at ${formatNumber(fabric.reorderLevel)} ${fabric.unit}`}
            icon={CalendarClock}
            tone={fabric.daysOfStock < 10 ? 'warning' : 'default'}
          />
          <StatCard
            label="Finished items tracked"
            value={formatNumber(flows.length)}
            sublabel={`${yarnFlows.length} yarn · ${fabricFlows.length} fabric`}
            icon={PackageCheck}
          />
          <StatCard
            label="Dispatched"
            value={formatNumber(totalDispatched)}
            sublabel="Across finished-goods movements"
            icon={Truck}
            tone="info"
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {inventory.isLoading || !yarn ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : (
          <PositionCard summary={yarn} icon={Boxes} />
        )}
        {inventory.isLoading || !fabric ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : (
          <PositionCard summary={fabric} icon={Shirt} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Finished Stock Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">
              Quantity produced into and dispatched out of finished stores, by item.
            </p>
          </CardHeader>
          <CardContent>
            {movements.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : flows.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No finished-goods movements recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {finishedCategories.map((category) => {
                  const group = flows.filter((f) => f.category === category)
                  if (group.length === 0) return null
                  const max = Math.max(...group.map((g) => g.produced), 1)
                  return (
                    <div key={category}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {category}
                      </div>
                      <div className="space-y-2.5">
                        {group.map((f) => (
                          <div key={f.item}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                              <span className="truncate font-medium text-foreground">{f.item}</span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {formatNumber(f.produced)} {f.unit} in · {formatNumber(f.dispatched)} {f.unit} out
                              </span>
                            </div>
                            <Progress
                              value={(f.produced / max) * 100}
                              indicatorClassName={category === 'Fabric' ? 'bg-success-500' : 'bg-info-500'}
                              className="h-1.5"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finished Yarn Mix</CardTitle>
            <p className="text-xs text-muted-foreground">Share of yarn received into finished stores.</p>
          </CardHeader>
          <CardContent>
            {movements.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : yarnFlows.length === 0 || yarnProduced === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No finished yarn receipts recorded.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={yarnFlows}
                        dataKey="produced"
                        nameKey="item"
                        innerRadius="68%"
                        outerRadius="98%"
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {yarnFlows.map((f, i) => (
                          <Cell key={f.item} fill={sliceColors[i % sliceColors.length]} stroke="hsl(var(--card))" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => {
                          const n = Number(value)
                          return [`${formatNumber(n)} MT (${formatPct((n / yarnProduced) * 100, 1)})`, String(name)]
                        }}
                        contentStyle={{
                          borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
                          border: '1px solid hsl(var(--border))',
                          fontSize: 12,
                          background: 'hsl(var(--popover))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Received</span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatNumber(yarnProduced)} MT
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {yarnFlows.map((f, i) => (
                    <div key={f.item} className="flex items-center justify-between gap-2 px-1.5 py-1 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: sliceColors[i % sliceColors.length] }}
                        />
                        <span className="truncate font-medium text-foreground">{f.item}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatPct((f.produced / yarnProduced) * 100, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finished Goods Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={finishedMovements}
            isLoading={movements.isLoading || factories.isLoading}
            emptyMessage="No finished-goods movements recorded."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
