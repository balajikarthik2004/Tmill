import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertTriangle, Boxes, CalendarClock, Cloud, Package, Scale } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCottonLots, getFactories, getInventorySummary, getStockMovements } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CottonOrigin, StockMovement } from '@/types'

const originColors: Record<CottonOrigin, string> = {
  'Indian extra-long staple': '#2563eb',
  'Egyptian Cotton': '#0d9488',
  'US Pima': '#d97706',
}

/** Lots still physically in the godown — anything not yet fully consumed. */
const onHandStatuses = new Set(['In Testing', 'Approved', 'In Use', 'On Hold'])

export default function RawMaterials() {
  const inventory = useAsync(getInventorySummary, [])
  const lots = useAsync(() => getCottonLots({}), [])
  const movements = useAsync(() => getStockMovements({ category: 'Raw Cotton' }), [])
  const factories = useAsync(getFactories, [])

  const cotton = inventory.data?.find((i) => i.category === 'Raw Cotton')

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.shortName])),
    [factories.data],
  )

  const onHand = useMemo(() => (lots.data ?? []).filter((l) => onHandStatuses.has(l.status)), [lots.data])

  const byOrigin = useMemo(() => {
    const map = new Map<CottonOrigin, { origin: CottonOrigin; lots: number; bales: number; weightKg: number }>()
    for (const lot of onHand) {
      const entry = map.get(lot.origin) ?? { origin: lot.origin, lots: 0, bales: 0, weightKg: 0 }
      entry.lots += 1
      entry.bales += lot.bales
      entry.weightKg += lot.weightKg
      map.set(lot.origin, entry)
    }
    return [...map.values()].sort((a, b) => b.weightKg - a.weightKg)
  }, [onHand])

  const totalOnHandKg = byOrigin.reduce((sum, o) => sum + o.weightKg, 0)
  const totalBales = byOrigin.reduce((sum, o) => sum + o.bales, 0)
  const inTesting = onHand.filter((l) => l.status === 'In Testing').length
  const coverPct = cotton ? Math.min((cotton.currentQty / (cotton.reorderLevel * 1.6)) * 100, 100) : 0

  const columns = useMemo<ColumnDef<StockMovement, any>[]>(
    () => [
      { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
      { accessorKey: 'referenceNo', header: 'Reference' },
      { accessorKey: 'type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge> },
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
        title="Raw Materials"
        description="Raw cotton stock position, lots on hand across the godowns and every raw-cotton movement."
      />

      {inventory.isLoading || !cotton ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-17.5 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard
            label="Raw cotton stock"
            value={`${formatNumber(cotton.currentQty)} ${cotton.unit}`}
            sublabel={cotton.belowReorder ? 'Below reorder level' : 'Above reorder level'}
            icon={Cloud}
            tone={cotton.belowReorder ? 'danger' : 'info'}
          />
          <StatCard
            label="Reorder level"
            value={`${formatNumber(cotton.reorderLevel)} ${cotton.unit}`}
            sublabel={`${formatNumber(cotton.currentQty - cotton.reorderLevel)} ${cotton.unit} headroom`}
            icon={AlertTriangle}
            tone={cotton.belowReorder ? 'warning' : 'default'}
          />
          <StatCard
            label="Days of cover"
            value={`${cotton.daysOfStock} days`}
            sublabel="At current consumption"
            icon={CalendarClock}
            tone={cotton.daysOfStock < 15 ? 'warning' : 'success'}
          />
          <StatCard label="Lots on hand" value={formatNumber(onHand.length)} sublabel={`${inTesting} in testing`} icon={Boxes} />
          <StatCard label="Bales on hand" value={formatNumber(totalBales)} sublabel="Across cotton godowns A–C" icon={Package} />
          <StatCard
            label="Lot weight on hand"
            value={`${formatNumber(Math.round(totalOnHandKg / 1000))} MT`}
            sublabel={`${formatNumber(totalOnHandKg)} kg`}
            icon={Scale}
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Stock vs Reorder Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inventory.isLoading || !cotton ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Current stock</div>
                    <div className="text-2xl font-bold tabular-nums text-foreground">
                      {formatNumber(cotton.currentQty)} <span className="text-base font-medium">{cotton.unit}</span>
                    </div>
                  </div>
                  <Badge variant={cotton.belowReorder ? 'danger' : 'success'}>
                    {cotton.belowReorder ? 'Replenish' : 'Healthy'}
                  </Badge>
                </div>
                <Progress
                  value={coverPct}
                  indicatorClassName={cotton.belowReorder ? 'bg-warning-500' : 'bg-info-500'}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Reorder at {formatNumber(cotton.reorderLevel)} {cotton.unit}</span>
                  <span>{cotton.daysOfStock} days of cover</span>
                </div>
                <div className="space-y-2 border-t border-border pt-3">
                  {byOrigin.map((o) => (
                    <div key={o.origin} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: originColors[o.origin] }} />
                        <span className="truncate text-foreground">{o.origin}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatNumber(o.lots)} lots · {formatNumber(o.bales)} bales
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Cotton Lots On Hand by Origin</CardTitle>
          </CardHeader>
          <CardContent>
            {lots.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : byOrigin.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No cotton lots are currently on hand.
              </div>
            ) : (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                <div className="relative h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byOrigin}
                        dataKey="weightKg"
                        nameKey="origin"
                        innerRadius="66%"
                        outerRadius="96%"
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {byOrigin.map((o) => (
                          <Cell key={o.origin} fill={originColors[o.origin]} stroke="hsl(var(--card))" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => {
                          const n = Number(value)
                          return [`${formatNumber(n)} kg (${formatPct((n / totalOnHandKg) * 100, 1)})`, String(name)]
                        }}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid hsl(var(--border))',
                          fontSize: 12,
                          background: 'hsl(var(--popover))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">On hand</span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatNumber(Math.round(totalOnHandKg / 1000))} MT
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {byOrigin.map((o) => (
                    <div key={o.origin} className="rounded-md border border-border p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: originColors[o.origin] }} />
                        <span className="truncate text-sm font-medium text-foreground">{o.origin}</span>
                        <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatPct((o.weightKg / totalOnHandKg) * 100, 0)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(o.lots)} lots · {formatNumber(o.bales)} bales · {formatNumber(o.weightKg)} kg
                      </div>
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
          <CardTitle>Cotton Lots in the Godown</CardTitle>
        </CardHeader>
        <CardContent>
          {lots.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : onHand.length === 0 ? (
            <div className="rounded-md border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No cotton lots are currently on hand.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {onHand.slice(0, 12).map((lot) => (
                <div key={lot.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{lot.lotNumber}</span>
                    <StatusBadge status={lot.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-full')}
                      style={{ backgroundColor: originColors[lot.origin] }}
                    />
                    <span className="truncate text-xs text-muted-foreground">{lot.origin}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Bales</span>
                    <span className="text-right tabular-nums text-foreground">{formatNumber(lot.bales)}</span>
                    <span className="text-muted-foreground">Weight</span>
                    <span className="text-right tabular-nums text-foreground">{formatNumber(lot.weightKg)} kg</span>
                    <span className="text-muted-foreground">Mic / Staple</span>
                    <span className="text-right tabular-nums text-foreground">
                      {lot.micronaire} / {lot.staple} mm
                    </span>
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-right text-foreground">{lot.warehouseLocation}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Cotton Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={movements.data ?? []}
            isLoading={movements.isLoading || factories.isLoading}
            emptyMessage="No raw cotton movements recorded."
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
