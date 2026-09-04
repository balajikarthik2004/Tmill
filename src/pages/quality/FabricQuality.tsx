import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleCheck, Droplets, Layers, Trash2 } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getMachines, getQualityTests, getRejections } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatKg, formatNumber, formatPct } from '@/lib/format'
import type { QualityTest, Rejection } from '@/types'

function average(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

export default function FabricQuality() {
  const tests = useAsync(() => getQualityTests({ stage: 'Fabric' }), [])
  const rejections = useAsync(getRejections, [])
  const looms = useAsync(() => getMachines({ process: 'Weaving' }), [])
  const factories = useAsync(getFactories, [])

  const loomById = useMemo(() => new Map((looms.data ?? []).map((m) => [m.id, m])), [looms.data])
  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.name])),
    [factories.data],
  )

  const rows = tests.data ?? []
  const passCount = rows.filter((t) => t.result === 'Pass').length
  const avgStrength = average(
    rows.map((t) => t.parameters.strength).filter((v): v is number => v !== undefined),
  )
  const avgMoisture = average(
    rows.map((t) => t.parameters.moisturePct).filter((v): v is number => v !== undefined),
  )

  const fabricRejections = useMemo(
    () =>
      (rejections.data ?? [])
        .filter((r) => r.stage === 'Fabric')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [rejections.data],
  )
  const rejectedKg = fabricRejections.reduce((sum, r) => sum + r.qtyKg, 0)

  const loomMakes = useMemo(() => {
    const map = new Map<string, number>()
    for (const loom of looms.data ?? []) map.set(loom.make, (map.get(loom.make) ?? 0) + 1)
    return [...map.entries()].map(([make, count]) => ({ make, count }))
  }, [looms.data])

  const testColumns = useMemo<ColumnDef<QualityTest, any>[]>(
    () => [
      { accessorKey: 'testNo', header: 'Test No' },
      { accessorKey: 'instrument', header: 'Instrument' },
      {
        id: 'loom',
        header: 'Loom',
        accessorFn: (row) => (row.machineId ? (loomById.get(row.machineId)?.code ?? '') : ''),
        cell: ({ row }) => {
          const loom = row.original.machineId ? loomById.get(row.original.machineId) : undefined
          if (!loom) return <span className="text-muted-foreground">—</span>
          return (
            <span className="flex items-center gap-2">
              <span className="font-medium">{loom.code}</span>
              <span className="text-xs text-muted-foreground">{loom.make}</span>
            </span>
          )
        },
      },
      {
        id: 'strength',
        header: 'Strength (g/tex)',
        accessorFn: (row) => row.parameters.strength ?? 0,
        cell: ({ row }) => row.original.parameters.strength?.toFixed(1) ?? '—',
      },
      {
        id: 'moisture',
        header: 'Moisture %',
        accessorFn: (row) => row.parameters.moisturePct ?? 0,
        cell: ({ row }) => row.original.parameters.moisturePct?.toFixed(1) ?? '—',
      },
      {
        accessorKey: 'result',
        header: 'Result',
        cell: ({ row }) => <StatusBadge status={row.original.result} />,
      },
      { accessorKey: 'testedBy', header: 'Tested By' },
      {
        accessorKey: 'testedDate',
        header: 'Date',
        cell: ({ row }) => formatDate(row.original.testedDate),
      },
    ],
    [loomById],
  )

  const rejectionColumns = useMemo<ColumnDef<Rejection, any>[]>(
    () => [
      { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
      { accessorKey: 'reason', header: 'Reason' },
      {
        accessorKey: 'qtyKg',
        header: 'Qty',
        cell: ({ row }) => <span className="tabular-nums">{formatKg(row.original.qtyKg)}</span>,
      },
      {
        accessorKey: 'factoryId',
        header: 'Unit',
        cell: ({ row }) => (
          <Badge variant="outline">{factoryNames.get(row.original.factoryId) ?? row.original.factoryId}</Badge>
        ),
      },
    ],
    [factoryNames],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Fabric Quality"
        description="Greige fabric from the 300-loom weaving unit, checked on the USTER Eva Tester and USTER Strength Tester."
      />

      {tests.isLoading || rejections.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={5}>
          <StatCard label="Fabric tests" value={formatNumber(rows.length)} icon={Layers} tone="info" />
          <StatCard
            label="Pass rate"
            value={rows.length ? formatPct((passCount / rows.length) * 100) : '—'}
            sublabel={`${formatNumber(passCount)} passed`}
            icon={CircleCheck}
            tone="success"
          />
          <StatCard
            label="Avg strength"
            value={rows.length ? `${avgStrength.toFixed(1)} g/tex` : '—'}
            sublabel="USTER Strength Tester"
          />
          <StatCard
            label="Avg moisture"
            value={rows.length ? `${avgMoisture.toFixed(1)}%` : '—'}
            sublabel="USTER Eva Tester"
            icon={Droplets}
          />
          <StatCard
            label="Fabric rejections"
            value={formatKg(rejectedKg)}
            sublabel={`${formatNumber(fabricRejections.length)} entries`}
            icon={Trash2}
            tone="danger"
            to="/quality/rejections"
          />
        </StatGrid>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Fabric Test Results</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Every greige roll inspected before it leaves the weaving unit
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            {loomMakes.map((loom) => (
              <Badge key={loom.make} variant="secondary">
                {loom.make} · {loom.count}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={testColumns}
            data={rows}
            isLoading={tests.isLoading || looms.isLoading}
            emptyMessage="No fabric tests recorded."
            pageSize={10}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fabric-Stage Rejections</CardTitle>
          <p className="text-xs text-muted-foreground">
            Greige fabric written off at inspection — {formatKg(rejectedKg)} across{' '}
            {formatNumber(fabricRejections.length)} entries
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={rejectionColumns}
            data={fabricRejections}
            isLoading={rejections.isLoading || factories.isLoading}
            emptyMessage="No fabric-stage rejections recorded."
            pageSize={8}
          />
        </CardContent>
      </Card>
    </div>
  )
}
