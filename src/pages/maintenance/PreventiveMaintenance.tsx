import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarCheck, CalendarClock, CircleCheck, TriangleAlert } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getMachines, getPmTasks } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PmTask } from '@/types'

const statusOptions = ['all', 'Due', 'Scheduled', 'Overdue', 'Completed']

const dayMs = 24 * 60 * 60 * 1000

function daysFromToday(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / dayMs)
}

export default function PreventiveMaintenance() {
  const [status, setStatus] = useState('all')

  const tasks = useAsync(getPmTasks, [])
  const machines = useAsync(() => getMachines(), [])
  const factories = useAsync(getFactories, [])

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.name])),
    [factories.data],
  )
  const machineById = useMemo(
    () => new Map((machines.data ?? []).map((m) => [m.id, m])),
    [machines.data],
  )

  const allTasks = useMemo(() => tasks.data ?? [], [tasks.data])
  const counts = {
    due: allTasks.filter((t) => t.status === 'Due').length,
    scheduled: allTasks.filter((t) => t.status === 'Scheduled').length,
    overdue: allTasks.filter((t) => t.status === 'Overdue').length,
    completed: allTasks.filter((t) => t.status === 'Completed').length,
  }

  const overdueTasks = useMemo(
    () =>
      allTasks
        .filter((t) => t.status === 'Overdue')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    [allTasks],
  )

  const rows = useMemo(
    () =>
      allTasks
        .filter((t) => status === 'all' || t.status === status)
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    [allTasks, status],
  )

  const columns = useMemo<ColumnDef<PmTask, any>[]>(() => {
    const rowClass = (task: PmTask) => (task.status === 'Overdue' ? 'font-semibold text-danger-600' : '')
    return [
      {
        accessorKey: 'machineCode',
        header: 'Machine',
        cell: ({ row }) => (
          <span className={cn('flex items-center gap-1.5', rowClass(row.original))}>
            {row.original.status === 'Overdue' && <TriangleAlert className="h-3.5 w-3.5" />}
            {row.original.machineCode}
          </span>
        ),
      },
      {
        id: 'make',
        header: 'Make',
        accessorFn: (row) => machineById.get(row.machineId)?.make ?? '',
        cell: ({ row }) => (
          <span className={cn('text-muted-foreground', rowClass(row.original))}>
            {machineById.get(row.original.machineId)?.make ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'factoryId',
        header: 'Unit',
        cell: ({ row }) => (
          <span className={cn(rowClass(row.original))}>
            {factoryNames.get(row.original.factoryId) ?? row.original.factoryId}
          </span>
        ),
      },
      {
        accessorKey: 'frequency',
        header: 'Frequency',
        cell: ({ row }) => <Badge variant="outline">{row.original.frequency}</Badge>,
      },
      {
        accessorKey: 'scheduledDate',
        header: 'Scheduled',
        cell: ({ row }) => {
          const days = daysFromToday(row.original.scheduledDate)
          const isOverdue = row.original.status === 'Overdue'
          return (
            <span className={cn('tabular-nums', rowClass(row.original))}>
              {formatDate(row.original.scheduledDate)}
              <span className={cn('ml-2 text-xs', isOverdue ? 'text-danger-600' : 'text-muted-foreground')}>
                {days < 0
                  ? `${Math.abs(days)}d late`
                  : days === 0
                    ? 'today'
                    : `in ${days}d`}
              </span>
            </span>
          )
        },
      },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned To',
        cell: ({ row }) => <span className={cn(rowClass(row.original))}>{row.original.assignedTo}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ]
  }, [factoryNames, machineById])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Preventive Maintenance"
        description="Weekly, monthly and quarterly service rounds across the spinning, post-spinning and weaving machinery."
        actions={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'all' ? 'All statuses' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {tasks.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard label="Due" value={formatNumber(counts.due)} icon={CalendarClock} tone="warning" />
          <StatCard label="Scheduled" value={formatNumber(counts.scheduled)} icon={CalendarCheck} tone="info" />
          <StatCard label="Overdue" value={formatNumber(counts.overdue)} icon={TriangleAlert} tone="danger" />
          <StatCard label="Completed" value={formatNumber(counts.completed)} icon={CircleCheck} tone="success" />
        </StatGrid>
      )}

      {overdueTasks.length > 0 && (
        <Card className="border-danger-500/40">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <TriangleAlert className="h-4 w-4 text-danger-600" />
            <CardTitle>Overdue Service Rounds</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {overdueTasks.map((task) => (
              <span
                key={task.id}
                className="flex items-center gap-2 rounded-md border border-danger-500/40 bg-danger-50 px-2.5 py-1.5 text-xs"
              >
                <span className="font-semibold text-danger-600">{task.machineCode}</span>
                <span className="text-danger-600">
                  {Math.abs(daysFromToday(task.scheduledDate))}d late
                </span>
                <span className="text-muted-foreground">{task.assignedTo}</span>
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>PM Schedule</CardTitle>
          <p className="text-xs text-muted-foreground">Overdue rounds are flagged in red.</p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={tasks.isLoading || factories.isLoading || machines.isLoading}
            emptyMessage="No preventive maintenance tasks match this filter."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
