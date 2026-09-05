import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, CircleSlash, ClipboardList, Cog, Gauge, PauseCircle, PlayCircle, Target } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/store/appStore'
import { getFactories, getMachines, getProcessSummary, getProductionOrders } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatKg, formatMeters, formatNumber, formatPct } from '@/lib/format'
import type { Machine, ProcessName, ProductionOrder } from '@/types'

/** What each stage actually does on the Kappalur shop floor. */
const processNotes: Record<ProcessName, string> = {
  'Blow Room': 'Bale laydown, opening and cleaning — cotton is plucked from the laydown and cleaned before card feed.',
  Carding: 'Individualises fibres, removes trash and short fibre, and delivers a uniform carded sliver.',
  Combing: 'Removes short fibres and remaining neps to produce the combed sliver needed for fine counts.',
  Drawing: 'Doubling and drafting with auto levelling to correct sliver evenness before roving.',
  Roving: 'Attenuates drawn sliver into roving with the twist needed to survive ring-frame creeling.',
  'Ring Spinning': 'Converts roving into single yarn — compact spinning for the fine and premium counts.',
  'Open End': 'Rotor spinning of coarse counts (NE 6s–10s) straight from sliver, no roving stage.',
  Winding: 'Cone winding with electronic yarn clearing to remove faults and build package-ready cones.',
  TFO: 'Two-for-one twisting of two singles into doubled yarn at controlled twist per inch.',
  Gassing: 'Singeing the yarn surface to burn off protruding fibre and deliver a smooth, lustrous gassed yarn.',
  Weaving: 'Greige fabric production on air jet and Sulzer looms across the 300-loom weaving unit.',
}

/** The stage each process feeds, so the page reads as part of one line. */
const feedsInto: Partial<Record<ProcessName, string>> = {
  'Blow Room': 'Carding',
  Carding: 'Combing / Drawing',
  Combing: 'Drawing',
  Drawing: 'Roving',
  Roving: 'Ring Spinning',
  'Ring Spinning': 'Winding',
  'Open End': 'Winding',
  Winding: 'TFO / Gassing / Dispatch',
  TFO: 'Gassing / Dispatch',
  Gassing: 'Dispatch',
}

function machineColumns(unitName: (id: string) => string): ColumnDef<Machine, any>[] {
  return [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Machine' },
    { accessorKey: 'make', header: 'Make' },
    { accessorKey: 'factoryId', header: 'Unit', cell: ({ row }) => unitName(row.original.factoryId) },
    { accessorKey: 'installedYear', header: 'Installed' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      accessorKey: 'oeePct',
      header: 'OEE %',
      cell: ({ row }) => <span className="tabular-nums">{row.original.oeePct.toFixed(1)}%</span>,
    },
    {
      accessorKey: 'utilizationPct',
      header: 'Utilisation %',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Progress value={Math.min(row.original.utilizationPct, 100)} className="h-1.5 w-16" />
          <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">
            {row.original.utilizationPct.toFixed(1)}%
          </span>
        </div>
      ),
    },
  ]
}

function orderColumns(unitName: (id: string) => string): ColumnDef<ProductionOrder, any>[] {
  return [
    { accessorKey: 'orderNo', header: 'Order No' },
    { accessorKey: 'productName', header: 'Product' },
    { accessorKey: 'productType', header: 'Type' },
    { accessorKey: 'factoryId', header: 'Unit', cell: ({ row }) => unitName(row.original.factoryId) },
    { accessorKey: 'machineCode', header: 'Machine' },
    { accessorKey: 'shift', header: 'Shift' },
    {
      accessorKey: 'plannedQty',
      header: 'Planned',
      cell: ({ row }) => `${formatNumber(row.original.plannedQty)} ${row.original.unit}`,
    },
    {
      id: 'progress',
      header: 'Progress',
      accessorFn: (row) => (row.plannedQty > 0 ? (row.producedQty / row.plannedQty) * 100 : 0),
      cell: ({ row }) => {
        const pct =
          row.original.plannedQty > 0 ? Math.round((row.original.producedQty / row.original.plannedQty) * 100) : 0
        return (
          <div className="flex items-center gap-2">
            <Progress value={Math.min(pct, 100)} className="h-1.5 w-16" />
            <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">{pct}%</span>
          </div>
        )
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'endDate', header: 'Target Date', cell: ({ row }) => formatDate(row.original.endDate) },
  ]
}

/**
 * One process stage of the spinning / weaving line. Every process route renders
 * this with its own `process`, so the eleven stages stay consistent.
 */
export function ProcessPage({ process }: { process: ProcessName }) {
  const navigate = useNavigate()
  const { factoryId } = useAppStore()

  const factoriesQuery = useAsync(getFactories, [])
  const summary = useAsync(() => getProcessSummary(process, factoryId), [process, factoryId])
  const allMachines = useAsync(() => getMachines({ process }), [process])
  const orders = useAsync(() => getProductionOrders({ process, factoryId }), [process, factoryId])

  const unitName = useMemo(() => {
    const map = new Map((factoriesQuery.data ?? []).map((f) => [f.id as string, f.name]))
    return (id: string) => map.get(id) ?? id
  }, [factoriesQuery.data])

  const machines = useMemo(() => {
    const rows = allMachines.data ?? []
    return factoryId === 'all' ? rows : rows.filter((m) => m.factoryId === factoryId)
  }, [allMachines.data, factoryId])

  /** Machine makes actually installed for this stage, straight off the registry. */
  const makes = useMemo(
    () => [...new Set((allMachines.data ?? []).map((m) => m.make))].sort(),
    [allMachines.data],
  )

  const unitsRunning = useMemo(
    () => [...new Set((allMachines.data ?? []).map((m) => m.factoryId))],
    [allMachines.data],
  )

  const counts = useMemo(() => {
    const running = machines.filter((m) => m.status === 'Running').length
    const idle = machines.filter((m) => m.status === 'Idle').length
    const breakdown = machines.filter((m) => m.status === 'Breakdown').length
    const maintenance = machines.filter((m) => m.status === 'Maintenance').length
    const oeeSum = machines.reduce((sum, m) => sum + m.oeePct, 0)
    return {
      running,
      idle,
      breakdown,
      maintenance,
      avgOee: machines.length > 0 ? oeeSum / machines.length : 0,
    }
  }, [machines])

  const outputUnit = process === 'Weaving' ? 'm' : 'kg'
  const formatOutput = (v: number) => (outputUnit === 'm' ? formatMeters(v) : formatKg(v))
  const scopeLabel = factoryId === 'all' ? 'all units' : unitName(factoryId)
  const sum = summary.data

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title={process}
        description={`${processNotes[process]}${
          feedsInto[process] ? ` Feeds ${feedsInto[process]}.` : ''
        } Showing ${scopeLabel}.`}
      />

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Cog className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Installed Machinery</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-1.5">
          {allMachines.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-40 rounded-full" />)
          ) : makes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No machines are registered for this stage.</p>
          ) : (
            <>
              {makes.map((make) => (
                <Badge key={make} variant="outline">
                  {make}
                </Badge>
              ))}
              <span className="ml-1 text-xs text-muted-foreground">
                Run in {unitsRunning.map(unitName).join(', ')}
              </span>
            </>
          )}
        </CardContent>
      </Card>

      {summary.isLoading || !sum || allMachines.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-17 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard
            label="Output — last 30 days"
            value={formatOutput(sum.actual)}
            sublabel={`Target ${formatOutput(sum.target)}`}
            icon={Target}
            tone="info"
          />
          <StatCard
            label="Achievement"
            value={formatPct(sum.achievedPct)}
            sublabel={sum.achievedPct >= 100 ? 'Above target' : `${formatPct(100 - sum.achievedPct)} short`}
            icon={Activity}
            tone={sum.achievedPct >= 95 ? 'success' : sum.achievedPct >= 85 ? 'warning' : 'danger'}
          />
          <StatCard
            label="Machines"
            value={formatNumber(machines.length)}
            sublabel={`${counts.maintenance} under maintenance`}
            icon={Cog}
          />
          <StatCard
            label="Production orders"
            value={formatNumber(orders.data?.length ?? sum.orderCount)}
            sublabel={`${sum.inProgress} in progress`}
            icon={ClipboardList}
            tone="warning"
            to="/planning/production-orders"
          />
          <StatCard label="Running" value={formatNumber(counts.running)} icon={PlayCircle} tone="success" />
          <StatCard label="Idle" value={formatNumber(counts.idle)} icon={PauseCircle} tone="warning" />
          <StatCard label="Breakdown" value={formatNumber(counts.breakdown)} icon={CircleSlash} tone="danger" />
          <StatCard
            label="Average OEE"
            value={formatPct(counts.avgOee)}
            sublabel="Across machines in scope"
            icon={Gauge}
            tone="info"
          />
        </StatGrid>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{process} Machines</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={machineColumns(unitName)}
            data={machines}
            isLoading={allMachines.isLoading}
            emptyMessage={`No ${process} machines are installed in ${scopeLabel}.`}
            onRowClick={(row) => navigate(`/maintenance/machine-dashboard?machine=${row.code}`)}
            pageSize={10}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{process} Production Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={orderColumns(unitName)}
            data={orders.data ?? []}
            isLoading={orders.isLoading}
            emptyMessage={`No production orders are routed to ${process} in ${scopeLabel}.`}
            onRowClick={(row) => navigate(`/planning/production-orders?highlight=${row.id}`)}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
