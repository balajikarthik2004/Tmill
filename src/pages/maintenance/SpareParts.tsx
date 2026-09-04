import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleCheck, PackageSearch, TriangleAlert } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getSpareParts } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SparePart } from '@/types'

function coveragePct(part: SparePart) {
  if (part.reorderLevel <= 0) return 100
  return Math.min(100, (part.currentStock / part.reorderLevel) * 100)
}

export default function SpareParts() {
  const [lowOnly, setLowOnly] = useState(false)
  const parts = useAsync(getSpareParts, [])

  const allParts = useMemo(() => parts.data ?? [], [parts.data])
  const lowCount = allParts.filter((p) => p.isLow).length

  const rows = useMemo(
    () =>
      allParts
        .filter((p) => !lowOnly || p.isLow)
        .sort((a, b) => coveragePct(a) - coveragePct(b)),
    [allParts, lowOnly],
  )

  const columns = useMemo<ColumnDef<SparePart, any>[]>(
    () => [
      { accessorKey: 'partCode', header: 'Part Code' },
      { accessorKey: 'name', header: 'Part' },
      {
        id: 'compatibleMachines',
        header: 'Fits Machines',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            {row.original.compatibleMachines.map((code) => (
              <Badge key={code} variant="outline">
                {code}
              </Badge>
            ))}
          </span>
        ),
      },
      {
        id: 'stock',
        header: 'Stock vs Reorder',
        accessorFn: (row) => coveragePct(row),
        cell: ({ row }) => {
          const part = row.original
          return (
            <div className="flex items-center gap-2">
              <Progress
                value={coveragePct(part)}
                className="h-1.5 w-20"
                indicatorClassName={cn(part.isLow ? 'bg-danger-500' : 'bg-success-500')}
              />
              <span
                className={cn(
                  'w-20 shrink-0 text-xs tabular-nums',
                  part.isLow ? 'font-semibold text-danger-600' : 'text-muted-foreground',
                )}
              >
                {formatNumber(part.currentStock)} / {formatNumber(part.reorderLevel)}
              </span>
            </div>
          )
        },
      },
      { accessorKey: 'unit', header: 'Unit' },
      {
        accessorKey: 'isLow',
        header: 'Flag',
        cell: ({ row }) =>
          row.original.isLow ? (
            <Badge variant="danger">
              <TriangleAlert className="h-3 w-3" />
              Below reorder
            </Badge>
          ) : (
            <Badge variant="success">Healthy</Badge>
          ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Spare Parts"
        description="Travellers, cots, aprons, clearer modules, splicer kits and loom spares held against the machine registry."
        actions={
          <Button
            variant={lowOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLowOnly((v) => !v)}
          >
            <TriangleAlert />
            {lowOnly ? 'Showing low stock' : 'Show low stock only'}
          </Button>
        }
      />

      {parts.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={3}>
          <StatCard
            label="Parts tracked"
            value={formatNumber(allParts.length)}
            sublabel="Across all five units"
            icon={PackageSearch}
            tone="info"
          />
          <StatCard
            label="Below reorder level"
            value={formatNumber(lowCount)}
            sublabel="Raise a requisition"
            icon={TriangleAlert}
            tone="danger"
          />
          <StatCard
            label="Healthy stock"
            value={formatNumber(allParts.length - lowCount)}
            sublabel="At or above reorder level"
            icon={CircleCheck}
            tone="success"
          />
        </StatGrid>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Spares Inventory</CardTitle>
          <p className="text-xs text-muted-foreground">
            Sorted by coverage — the thinnest stock against its reorder level appears first.
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={parts.isLoading}
            emptyMessage={
              lowOnly ? 'Every spare is at or above its reorder level.' : 'No spare parts recorded.'
            }
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
