import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Activity, AlertOctagon, Cog, Gauge, PauseCircle, Wrench } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getMachines } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Machine, MachineStatus, ProcessName } from '@/types'

const processOrder: ProcessName[] = [
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

const statusVariant: Record<MachineStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  Running: 'success',
  Idle: 'warning',
  Breakdown: 'danger',
  Maintenance: 'info',
}

const ALL = 'all'

function MeterCell({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <Progress
        value={value}
        className="h-1.5 w-14"
        indicatorClassName={value >= 85 ? 'bg-success-500' : value >= 70 ? 'bg-warning-500' : 'bg-danger-500'}
      />
      <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">{formatPct(value, 1)}</span>
    </div>
  )
}

export default function Machines() {
  const [factoryId, setFactoryId] = useState<string>(ALL)
  const [process, setProcess] = useState<string>(ALL)

  const factories = useAsync(getFactories, [])
  const all = useAsync(() => getMachines({}), [])
  const filtered = useAsync(
    () =>
      getMachines({
        factoryId: factoryId === ALL ? undefined : factoryId,
        process: process === ALL ? undefined : (process as ProcessName),
      }),
    [factoryId, process],
  )

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.shortName])),
    [factories.data],
  )

  const availableProcesses = useMemo(() => {
    const present = new Set((all.data ?? []).map((m) => m.process))
    return processOrder.filter((p) => present.has(p))
  }, [all.data])

  const shown = useMemo(() => filtered.data ?? [], [filtered.data])
  const counts = useMemo(() => {
    const map = new Map<MachineStatus, number>()
    for (const m of shown) map.set(m.status, (map.get(m.status) ?? 0) + 1)
    return map
  }, [shown])

  const avgOee = shown.length === 0 ? 0 : shown.reduce((s, m) => s + m.oeePct, 0) / shown.length
  const criticalCount = shown.filter((m) => m.isCritical).length

  const columns = useMemo<ColumnDef<Machine, any>[]>(
    () => [
      { accessorKey: 'code', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.code}</span> },
      { accessorKey: 'name', header: 'Machine' },
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
      { accessorKey: 'make', header: 'Make / Model' },
      {
        accessorKey: 'installedYear',
        header: 'Installed',
        cell: ({ row }) => <span className="tabular-nums">{row.original.installedYear}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} variant={statusVariant[row.original.status]} />,
      },
      { accessorKey: 'oeePct', header: 'OEE', cell: ({ row }) => <MeterCell value={row.original.oeePct} /> },
      {
        accessorKey: 'utilizationPct',
        header: 'Utilisation',
        cell: ({ row }) => <MeterCell value={row.original.utilizationPct} />,
      },
      {
        accessorKey: 'isCritical',
        header: 'Critical',
        cell: ({ row }) =>
          row.original.isCritical ? <Badge variant="danger">Critical</Badge> : <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'lastMaintenanceDate',
        header: 'Last Maintained',
        cell: ({ row }) => formatDate(row.original.lastMaintenanceDate),
      },
      {
        accessorKey: 'nextPmDueDate',
        header: 'Next PM Due',
        cell: ({ row }) => {
          const overdue = new Date(row.original.nextPmDueDate) < new Date()
          return (
            <span className={cn(overdue && 'font-medium text-danger-600')}>
              {formatDate(row.original.nextPmDueDate)}
              {overdue && ' · overdue'}
            </span>
          )
        },
      },
    ],
    [factoryNames],
  )

  const scopeLabel =
    factoryId === ALL
      ? 'All five units'
      : (factories.data ?? []).find((f) => f.id === factoryId)?.name ?? factoryId

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Machines"
        description="Machine master across blow room, carding, combing, drawing, roving, ring spinning, open end, winding, TFO, gassing and weaving."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={factoryId} onValueChange={setFactoryId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All units</SelectItem>
                {(factories.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={process} onValueChange={setProcess}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All processes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All processes</SelectItem>
                {availableProcesses.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {filtered.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-17.5 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard label="Machines" value={formatNumber(shown.length)} sublabel={scopeLabel} icon={Cog} />
          <StatCard
            label="Running"
            value={formatNumber(counts.get('Running') ?? 0)}
            sublabel={`${formatPct(shown.length === 0 ? 0 : ((counts.get('Running') ?? 0) / shown.length) * 100, 0)} of scope`}
            icon={Activity}
            tone="success"
          />
          <StatCard label="Idle" value={formatNumber(counts.get('Idle') ?? 0)} sublabel="Awaiting a lot or shift" icon={PauseCircle} tone="warning" />
          <StatCard
            label="Breakdown"
            value={formatNumber(counts.get('Breakdown') ?? 0)}
            sublabel={`${formatNumber(criticalCount)} machines flagged critical`}
            icon={AlertOctagon}
            tone="danger"
          />
          <StatCard
            label="Under maintenance"
            value={formatNumber(counts.get('Maintenance') ?? 0)}
            sublabel="Preventive work in progress"
            icon={Wrench}
            tone="info"
          />
          <StatCard label="Average OEE" value={formatPct(avgOee, 1)} sublabel="Across the machines shown" icon={Gauge} tone="info" />
        </StatGrid>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Machine Master</CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatNumber(shown.length)} machines · {scopeLabel}
            {process !== ALL && ` · ${process}`}
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={shown}
            isLoading={filtered.isLoading || factories.isLoading}
            emptyMessage="No machines match this filter."
            pageSize={15}
          />
        </CardContent>
      </Card>
    </div>
  )
}
