import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Cog, Factory, Gauge } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getFactoryPerformance, getMachines, getProcessSummary, getProductionOrders } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKg, formatMeters, formatNumber, formatPct } from '@/lib/format'
import type { ProcessName } from '@/types'

const processNames: ProcessName[] = [
  'Blow Room',
  'Carding',
  'Combing',
  'Drawing',
  'Roving',
  'Ring Spinning',
  'Open End',
  'Winding',
  'TFO',
  'Gassing',
  'Weaving',
]

function bandColor(pct: number) {
  if (pct >= 95) return '#4a8a3c'
  if (pct >= 85) return '#b4632a'
  return '#b23a2f'
}

function bandClass(pct: number) {
  if (pct >= 95) return 'bg-success-500'
  if (pct >= 85) return 'bg-warning-500'
  return 'bg-danger-500'
}

interface ProcessLoadRow {
  process: ProcessName
  unit: 'kg' | 'm'
  actual: number
  target: number
  achievedPct: number
  orderCount: number
  inProgress: number
  machines: number
  running: number
  avgUtilizationPct: number
}

const processColumns: ColumnDef<ProcessLoadRow, any>[] = [
  { accessorKey: 'process', header: 'Process' },
  { accessorKey: 'machines', header: 'Machines' },
  {
    accessorKey: 'running',
    header: 'Running',
    cell: ({ row }) => `${row.original.running} / ${row.original.machines}`,
  },
  {
    accessorKey: 'avgUtilizationPct',
    header: 'Utilisation',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress
          value={Math.min(row.original.avgUtilizationPct, 100)}
          className="h-1.5 w-16"
          indicatorClassName={bandClass(row.original.avgUtilizationPct)}
        />
        <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatPct(row.original.avgUtilizationPct)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'actual',
    header: 'Output (30d)',
    cell: ({ row }) =>
      row.original.unit === 'm' ? formatMeters(row.original.actual) : formatKg(row.original.actual),
  },
  {
    accessorKey: 'target',
    header: 'Target (30d)',
    cell: ({ row }) =>
      row.original.unit === 'm' ? formatMeters(row.original.target) : formatKg(row.original.target),
  },
  {
    accessorKey: 'achievedPct',
    header: 'Achievement',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress
          value={Math.min(row.original.achievedPct, 100)}
          className="h-1.5 w-16"
          indicatorClassName={bandClass(row.original.achievedPct)}
        />
        <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatPct(row.original.achievedPct)}
        </span>
      </div>
    ),
  },
  { accessorKey: 'orderCount', header: 'Orders' },
  { accessorKey: 'inProgress', header: 'In Progress' },
]

export default function CapacityPlanning() {
  const factoriesQuery = useAsync(getFactories, [])
  const performance = useAsync(() => getFactoryPerformance('30d'), [])
  const machinesQuery = useAsync(() => getMachines({}), [])
  const ordersQuery = useAsync(() => getProductionOrders({}), [])
  const processQuery = useAsync(() => Promise.all(processNames.map((p) => getProcessSummary(p))), [])

  const isLoading =
    factoriesQuery.isLoading || performance.isLoading || machinesQuery.isLoading || ordersQuery.isLoading

  const units = useMemo(() => {
    const perf = new Map((performance.data ?? []).map((p) => [p.factoryId as string, p]))
    const machines = machinesQuery.data ?? []
    const orders = ordersQuery.data ?? []

    return (factoriesQuery.data ?? []).map((factory) => {
      const p = perf.get(factory.id)
      const unitMachines = machines.filter((m) => m.factoryId === factory.id)
      const unitOrders = orders.filter((o) => o.factoryId === factory.id)
      const utilSum = unitMachines.reduce((sum, m) => sum + m.utilizationPct, 0)
      return {
        ...factory,
        actual: p?.actual ?? 0,
        target: p?.target ?? 0,
        achievedPct: p?.achievedPct ?? 0,
        outputUnit: p?.unit ?? ('kg' as const),
        machineCount: unitMachines.length,
        runningCount: unitMachines.filter((m) => m.status === 'Running').length,
        avgUtilizationPct: unitMachines.length > 0 ? utilSum / unitMachines.length : 0,
        orderCount: unitOrders.length,
        activeOrders: unitOrders.filter(
          (o) => o.status === 'Planned' || o.status === 'In Progress' || o.status === 'Quality Check',
        ).length,
      }
    })
  }, [factoriesQuery.data, performance.data, machinesQuery.data, ordersQuery.data])

  const processRows = useMemo<ProcessLoadRow[]>(() => {
    const machines = machinesQuery.data ?? []
    return (processQuery.data ?? []).map((s) => {
      const procMachines = machines.filter((m) => m.process === s.process)
      const utilSum = procMachines.reduce((sum, m) => sum + m.utilizationPct, 0)
      return {
        process: s.process,
        unit: s.process === 'Weaving' ? 'm' : 'kg',
        actual: s.actual,
        target: s.target,
        achievedPct: s.achievedPct,
        orderCount: s.orderCount,
        inProgress: s.inProgress,
        machines: procMachines.length,
        running: procMachines.filter((m) => m.status === 'Running').length,
        avgUtilizationPct: procMachines.length > 0 ? utilSum / procMachines.length : 0,
      }
    })
  }, [processQuery.data, machinesQuery.data])

  const chartData = units.map((u) => ({
    name: u.shortName,
    fullName: u.name,
    achievedPct: Math.round(u.achievedPct * 10) / 10,
    plan: 100,
  }))

  const totals = useMemo(() => {
    const spindles = units.reduce((sum, u) => sum + u.spindles, 0)
    const rotors = units.reduce((sum, u) => sum + u.rotors, 0)
    const looms = units.reduce((sum, u) => sum + u.looms, 0)
    const machineCount = units.reduce((sum, u) => sum + u.machineCount, 0)
    const utilWeighted = units.reduce((sum, u) => sum + u.avgUtilizationPct * u.machineCount, 0)
    return {
      spindles,
      rotors,
      looms,
      machineCount,
      avgUtilizationPct: machineCount > 0 ? utilWeighted / machineCount : 0,
    }
  }, [units])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Capacity Planning"
        description="Installed capacity against the last 30 days of load, for all five units at Kappalur, Madurai."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-17 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={5}>
          <StatCard label="Spindles installed" value={formatNumber(totals.spindles)} icon={Factory} tone="info" />
          <StatCard label="Rotors installed" value={formatNumber(totals.rotors)} icon={Factory} tone="info" />
          <StatCard label="Looms installed" value={formatNumber(totals.looms)} icon={Factory} tone="info" />
          <StatCard
            label="Production machines"
            value={formatNumber(totals.machineCount)}
            sublabel="Across 11 process stages"
            icon={Cog}
          />
          <StatCard
            label="Average utilisation"
            value={formatPct(totals.avgUtilizationPct)}
            sublabel="Machine-weighted"
            icon={Gauge}
            tone={totals.avgUtilizationPct >= 90 ? 'success' : 'warning'}
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          ) : units.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                No units are registered.
              </CardContent>
            </Card>
          ) : (
            units.map((u) => {
              const fmt = u.outputUnit === 'm' ? formatMeters : formatKg
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{u.name}</span>
                        <Badge variant="secondary">{u.installedCapacity}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{u.countGroup}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num text-lg font-semibold text-foreground">
                        {formatPct(u.achievedPct)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">of 30-day target</div>
                    </div>
                  </div>

                  <Progress
                    value={Math.min(u.achievedPct, 100)}
                    className="mt-3"
                    indicatorClassName={bandClass(u.achievedPct)}
                  />

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div>
                      <div className="text-muted-foreground">Actual (30d)</div>
                      <div className="font-semibold tabular-nums text-foreground">{fmt(u.actual)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Target (30d)</div>
                      <div className="font-semibold tabular-nums text-foreground">{fmt(u.target)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Machines running</div>
                      <div className="font-semibold tabular-nums text-foreground">
                        {u.runningCount} / {u.machineCount} · {formatPct(u.avgUtilizationPct)} util
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Order load</div>
                      <div className="font-semibold tabular-nums text-foreground">
                        {formatNumber(u.activeOrders)} active / {formatNumber(u.orderCount)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
                    {u.spindles > 0 && <Badge variant="outline">{formatNumber(u.spindles)} spindles</Badge>}
                    {u.rotors > 0 && <Badge variant="outline">{formatNumber(u.rotors)} rotors</Badge>}
                    {u.looms > 0 && <Badge variant="outline">{formatNumber(u.looms)} looms</Badge>}
                    <Badge variant="outline">{u.location}</Badge>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        <Card className="h-full">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Load vs. Plan by Unit</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                No unit output recorded in the last 30 days.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      domain={[0, 110]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={{
                        borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
                        border: '1px solid hsl(var(--border))',
                        fontSize: 12,
                        background: 'hsl(var(--popover))',
                      }}
                      labelFormatter={(label) =>
                        chartData.find((d) => d.name === label)?.fullName ?? String(label)
                      }
                      formatter={(value, name) => [`${Number(value).toFixed(1)}%`, String(name)]}
                    />
                    <Bar dataKey="achievedPct" name="Achieved" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {chartData.map((d) => (
                        <Cell key={d.name} fill={bandColor(d.achievedPct)} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="plan" name="Plan" stroke="#b4632a" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Process-Level Load — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={processColumns}
            data={processRows}
            isLoading={processQuery.isLoading || machinesQuery.isLoading}
            emptyMessage="No process output recorded in the last 30 days."
            pageSize={11}
          />
        </CardContent>
      </Card>
    </div>
  )
}
