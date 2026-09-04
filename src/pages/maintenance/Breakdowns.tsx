import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleDot, Clock, Cog, Timer } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getBreakdowns, getFactories, getMachines } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatNumber } from '@/lib/format'
import type { BreakdownRecord } from '@/types'

const hourMs = 60 * 60 * 1000

function elapsedHours(record: BreakdownRecord) {
  if (record.durationHrs !== undefined) return record.durationHrs
  const end = record.endTime ? new Date(record.endTime).getTime() : Date.now()
  return Math.max(0, (end - new Date(record.startTime).getTime()) / hourMs)
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(1)} h`
  const days = Math.floor(hours / 24)
  return `${days}d ${Math.round(hours - days * 24)}h`
}

export default function Breakdowns() {
  const breakdowns = useAsync(getBreakdowns, [])
  const machines = useAsync(() => getMachines(), [])
  const factories = useAsync(getFactories, [])

  const machineById = useMemo(
    () => new Map((machines.data ?? []).map((m) => [m.id, m])),
    [machines.data],
  )
  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.name])),
    [factories.data],
  )

  const rows = useMemo(
    () =>
      (breakdowns.data ?? [])
        .slice()
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [breakdowns.data],
  )

  const openCount = rows.filter((r) => r.status === 'Open').length
  const inProgressCount = rows.filter((r) => r.status === 'In Progress').length
  const machinesAffected = new Set(rows.map((r) => r.machineId)).size
  const totalDowntime = rows.reduce((sum, r) => sum + elapsedHours(r), 0)

  const columns = useMemo<ColumnDef<BreakdownRecord, any>[]>(
    () => [
      { accessorKey: 'machineCode', header: 'Machine' },
      {
        id: 'make',
        header: 'Make',
        accessorFn: (row) => machineById.get(row.machineId)?.make ?? '',
        cell: ({ row }) => machineById.get(row.original.machineId)?.make ?? '—',
      },
      {
        id: 'process',
        header: 'Process',
        accessorFn: (row) => machineById.get(row.machineId)?.process ?? '',
        cell: ({ row }) => {
          const process = machineById.get(row.original.machineId)?.process
          return process ? <Badge variant="outline">{process}</Badge> : <span>—</span>
        },
      },
      {
        accessorKey: 'factoryId',
        header: 'Unit',
        cell: ({ row }) => factoryNames.get(row.original.factoryId) ?? row.original.factoryId,
      },
      { accessorKey: 'reason', header: 'Reason' },
      {
        accessorKey: 'startTime',
        header: 'Started',
        cell: ({ row }) => (
          <span className="tabular-nums">{formatDateTime(row.original.startTime)}</span>
        ),
      },
      {
        id: 'duration',
        header: 'Down For',
        accessorFn: (row) => elapsedHours(row),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-danger-600">
            {formatDuration(elapsedHours(row.original))}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [machineById, factoryNames],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Breakdowns"
        description="Unplanned stoppages on the Rieter, Trutzschler, Schlafhorst, Savio and loom fleet."
      />

      {breakdowns.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard label="Open" value={formatNumber(openCount)} icon={CircleDot} tone="danger" />
          <StatCard label="In progress" value={formatNumber(inProgressCount)} icon={Timer} tone="warning" />
          <StatCard
            label="Machines affected"
            value={formatNumber(machinesAffected)}
            icon={Cog}
            tone="info"
            to="/maintenance/machine-dashboard"
          />
          <StatCard
            label="Accumulated downtime"
            value={formatDuration(totalDowntime)}
            sublabel="Across all open stoppages"
            icon={Clock}
            tone="warning"
          />
        </StatGrid>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Breakdown Register</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every stoppage is matched to the machine make it occurred on.
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={breakdowns.isLoading || machines.isLoading || factories.isLoading}
            emptyMessage="No breakdowns are open — the whole fleet is running or in planned maintenance."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
