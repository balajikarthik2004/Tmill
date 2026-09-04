import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Cog, Gauge, Play, TriangleAlert, Wrench, CirclePause, Activity } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getMachineFleetSummary, getMachines } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Machine, MachineStatus, ProcessName } from '@/types'

const chartTooltipStyle = {
  borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  background: 'hsl(var(--popover))',
}

const statusColors: Record<MachineStatus, string> = {
  Running: '#4a8a3c',
  Idle: '#b4632a',
  Breakdown: '#b23a2f',
  Maintenance: '#0f6e56',
}

const statusOrder: MachineStatus[] = ['Running', 'Idle', 'Breakdown', 'Maintenance']

/** Processes backed by the machinery published on tmills.com. */
const processOptions: ProcessName[] = [
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

function oeeColor(pct: number) {
  if (pct >= 88) return '#4a8a3c'
  if (pct >= 80) return '#b4632a'
  return '#b23a2f'
}

function oeeBarTone(pct: number) {
  if (pct >= 88) return 'bg-success-500'
  if (pct >= 80) return 'bg-warning-500'
  return 'bg-danger-500'
}

export default function MachineDashboard() {
  const [factoryId, setFactoryId] = useState('all')
  const [process, setProcess] = useState('all')

  const filters = useMemo(
    () => ({
      factoryId: factoryId === 'all' ? undefined : factoryId,
      process: process === 'all' ? undefined : (process as ProcessName),
    }),
    [factoryId, process],
  )

  const machines = useAsync(() => getMachines(filters), [factoryId, process])
  const summary = useAsync(() => getMachineFleetSummary(filters), [factoryId, process])
  const factories = useAsync(getFactories, [])

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.name])),
    [factories.data],
  )

  const statusSlices = useMemo(
    () =>
      statusOrder
        .map((status) => ({ name: status, value: summary.data?.byStatus[status] ?? 0 }))
        .filter((s) => s.value > 0),
    [summary.data],
  )
  const statusTotal = statusSlices.reduce((sum, s) => sum + s.value, 0)

  const oeeGroups = useMemo(() => {
    if (!summary.data) return []
    return factoryId === 'all' ? summary.data.byUnit : summary.data.byProcess
  }, [summary.data, factoryId])

  const columns = useMemo<ColumnDef<Machine, any>[]>(
    () => [
      { accessorKey: 'code', header: 'Machine' },
      {
        accessorKey: 'factoryId',
        header: 'Unit',
        cell: ({ row }) => factoryNames.get(row.original.factoryId) ?? row.original.factoryId,
      },
      {
        accessorKey: 'process',
        header: 'Process',
        cell: ({ row }) => <Badge variant="outline">{row.original.process}</Badge>,
      },
      { accessorKey: 'make', header: 'Make' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'oeePct',
        header: 'OEE',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Progress
              value={row.original.oeePct}
              className="h-1.5 w-16"
              indicatorClassName={cn(oeeBarTone(row.original.oeePct))}
            />
            <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">
              {row.original.oeePct.toFixed(1)}%
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'utilizationPct',
        header: 'Utilisation',
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.utilizationPct.toFixed(1)}%
          </span>
        ),
      },
      {
        accessorKey: 'isCritical',
        header: 'Critical',
        cell: ({ row }) =>
          row.original.isCritical ? (
            <Badge variant="danger">
              <TriangleAlert className="h-3 w-3" />
              Critical
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [factoryNames],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Machine Dashboard"
        description="Blow room to loom shed — live status, OEE and utilisation for every machine in the registry."
        actions={
          <div className="flex items-center gap-2">
            <Select value={factoryId} onValueChange={setFactoryId}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units</SelectItem>
                {(factories.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={process} onValueChange={setProcess}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All processes</SelectItem>
                {processOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {summary.isLoading || !summary.data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Machines" value={formatNumber(summary.data.total)} icon={Cog} tone="info" />
          <StatCard
            label="Running"
            value={formatNumber(summary.data.byStatus.Running)}
            icon={Play}
            tone="success"
          />
          <StatCard
            label="Idle"
            value={formatNumber(summary.data.byStatus.Idle)}
            icon={CirclePause}
            tone="warning"
          />
          <StatCard
            label="Breakdown"
            value={formatNumber(summary.data.byStatus.Breakdown)}
            icon={TriangleAlert}
            tone="danger"
            to="/maintenance/breakdown"
          />
          <StatCard
            label="Under maintenance"
            value={formatNumber(summary.data.byStatus.Maintenance)}
            icon={Wrench}
            tone="info"
            to="/maintenance/pm"
          />
          <StatCard
            label="Avg OEE"
            value={formatPct(summary.data.avgOeePct)}
            sublabel={`${formatNumber(summary.data.critical)} critical assets`}
            icon={Gauge}
          />
          <StatCard
            label="Avg utilisation"
            value={formatPct(summary.data.avgUtilizationPct)}
            icon={Activity}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Fleet Status</CardTitle>
            <p className="text-xs text-muted-foreground">Live disposition of the filtered fleet</p>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : statusTotal === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                No machines match this filter.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusSlices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="66%"
                        outerRadius="96%"
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {statusSlices.map((slice) => (
                          <Cell
                            key={slice.name}
                            fill={statusColors[slice.name]}
                            stroke="hsl(var(--card))"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value, name) => {
                          const n = Number(value)
                          return [`${formatNumber(n)} (${((n / statusTotal) * 100).toFixed(0)}%)`, String(name)]
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Machines
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatNumber(statusTotal)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {statusSlices.map((slice) => (
                    <div key={slice.name} className="flex items-center justify-between px-1.5 py-1 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: statusColors[slice.name] }}
                        />
                        <span className="font-medium text-foreground">{slice.name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(slice.value)} · {((slice.value / statusTotal) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{factoryId === 'all' ? 'Average OEE by Unit' : 'Average OEE by Process'}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Overall equipment effectiveness, machine-weighted
            </p>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : oeeGroups.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                No machines match this filter.
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={oeeGroups} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      height={48}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={chartTooltipStyle}
                      formatter={(value, name) => [`${Number(value).toFixed(1)}%`, String(name)]}
                    />
                    <Bar dataKey="avgOeePct" name="Avg OEE" radius={[4, 4, 0, 0]} maxBarSize={54}>
                      {oeeGroups.map((group) => (
                        <Cell key={group.key} fill={oeeColor(group.avgOeePct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machine Registry</CardTitle>
          <p className="text-xs text-muted-foreground">
            Blendomat, Trutzschler, Rieter, Schlafhorst, Savio and loom assets across all five units.
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={machines.data ?? []}
            isLoading={machines.isLoading || factories.isLoading}
            emptyMessage="No machines match this filter."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
