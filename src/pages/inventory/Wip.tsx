import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, Layers, Workflow } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getInventorySummary, getStockMovements } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber } from '@/lib/format'
import type { StockMovement } from '@/types'

/** Where each work-in-progress item sits in the spinning line. */
const stageOrder: Record<string, number> = {
  'Carded Sliver': 1,
  'Combed Sliver': 2,
  'Roving Bobbins': 3,
  'Grey Cones (pre-winding)': 4,
}

const stageProcess: Record<string, string> = {
  'Carded Sliver': 'Carding — Trutzschler cards',
  'Combed Sliver': 'Combing — Rieter hi-speed combers',
  'Roving Bobbins': 'Roving — speed frames',
  'Grey Cones (pre-winding)': 'Ring spinning — ahead of autoconers',
}

const inTypes = new Set(['GRN', 'Prod Receipt'])
const outTypes = new Set(['Prod Consumption', 'Issue', 'Dispatch'])

interface StageFlow {
  item: string
  received: number
  consumed: number
  transferred: number
  movements: number
}

export default function Wip() {
  const inventory = useAsync(getInventorySummary, [])
  const movements = useAsync(() => getStockMovements({ category: 'WIP' }), [])
  const factories = useAsync(getFactories, [])

  const wip = inventory.data?.find((i) => i.category === 'WIP')

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.shortName])),
    [factories.data],
  )

  const stages = useMemo<StageFlow[]>(() => {
    const map = new Map<string, StageFlow>()
    for (const m of movements.data ?? []) {
      const entry = map.get(m.itemName) ?? { item: m.itemName, received: 0, consumed: 0, transferred: 0, movements: 0 }
      entry.movements += 1
      if (inTypes.has(m.type)) entry.received += m.qty
      else if (outTypes.has(m.type)) entry.consumed += m.qty
      else if (m.type === 'Transfer') entry.transferred += m.qty
      map.set(m.itemName, entry)
    }
    return [...map.values()].sort((a, b) => (stageOrder[a.item] ?? 99) - (stageOrder[b.item] ?? 99))
  }, [movements.data])

  const totalReceived = stages.reduce((s, x) => s + x.received, 0)
  const totalConsumed = stages.reduce((s, x) => s + x.consumed, 0)
  const coverPct = wip ? Math.min((wip.currentQty / (wip.reorderLevel * 1.6)) * 100, 100) : 0

  const columns = useMemo<ColumnDef<StockMovement, any>[]>(
    () => [
      { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
      { accessorKey: 'referenceNo', header: 'Reference' },
      { accessorKey: 'type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge> },
      { accessorKey: 'itemName', header: 'Stage Item' },
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
        title="Work in Progress"
        description="Sliver, roving and grey cones held between carding, combing, roving and ring spinning."
      />

      {inventory.isLoading || !wip ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-17.5 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard
            label="WIP stock"
            value={`${formatNumber(wip.currentQty)} ${wip.unit}`}
            sublabel={wip.belowReorder ? 'Below reorder level' : 'Above reorder level'}
            icon={Layers}
            tone={wip.belowReorder ? 'danger' : 'info'}
          />
          <StatCard
            label="Reorder level"
            value={`${formatNumber(wip.reorderLevel)} ${wip.unit}`}
            sublabel={`${formatNumber(wip.currentQty - wip.reorderLevel)} ${wip.unit} headroom`}
            icon={AlertTriangle}
            tone={wip.belowReorder ? 'warning' : 'default'}
          />
          <StatCard
            label="Days of cover"
            value={`${wip.daysOfStock} days`}
            sublabel="At current line speed"
            icon={CalendarClock}
            tone={wip.daysOfStock < 7 ? 'warning' : 'success'}
          />
          <StatCard label="Stages tracked" value={formatNumber(stages.length)} sublabel="Carding through winding" icon={Workflow} />
          <StatCard
            label="Received into WIP"
            value={`${formatNumber(totalReceived)} MT`}
            sublabel="Production receipts logged"
            icon={ArrowUpRight}
            tone="success"
          />
          <StatCard
            label="Consumed from WIP"
            value={`${formatNumber(totalConsumed)} MT`}
            sublabel="Issued to the next process"
            icon={ArrowDownRight}
            tone="warning"
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>WIP Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inventory.isLoading || !wip ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Held on the line</div>
                    <div className="text-2xl font-bold tabular-nums text-foreground">
                      {formatNumber(wip.currentQty)} <span className="text-base font-medium">{wip.unit}</span>
                    </div>
                  </div>
                  <Badge variant={wip.belowReorder ? 'danger' : 'success'}>
                    {wip.belowReorder ? 'Starving' : 'Balanced'}
                  </Badge>
                </div>
                <Progress value={coverPct} indicatorClassName={wip.belowReorder ? 'bg-warning-500' : 'bg-info-500'} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Reorder at {formatNumber(wip.reorderLevel)} {wip.unit}</span>
                  <span>{wip.daysOfStock} days of cover</span>
                </div>
                <div className="space-y-2.5 border-t border-border pt-3">
                  {stages.map((s) => (
                    <div key={s.item}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-foreground">{s.item}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatNumber(s.movements)} moves
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{stageProcess[s.item] ?? 'In-process material'}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Received vs Consumed by Stage</CardTitle>
            <p className="text-xs text-muted-foreground">Quantities in MT across the logged WIP movements.</p>
          </CardHeader>
          <CardContent>
            {movements.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stages.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No work-in-progress movements recorded.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stages} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="item"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tickFormatter={(v: string) => v.replace(' (pre-winding)', '')}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      tickFormatter={(v: number) => Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        fontSize: 12,
                        background: 'hsl(var(--popover))',
                      }}
                      formatter={(value, name) => [`${formatNumber(Number(value))} MT`, String(name)]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="received" name="Received" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="consumed" name="Consumed" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="transferred" name="Transferred" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WIP Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={movements.data ?? []}
            isLoading={movements.isLoading || factories.isLoading}
            emptyMessage="No work-in-progress movements recorded."
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
