import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Clock, Container, Truck } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getDispatches } from '@/services'
import { formatDate, formatNumber } from '@/lib/format'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import type { Dispatch as DispatchRecord } from '@/types'

type DispatchStatus = DispatchRecord['status']

const statuses: DispatchStatus[] = ['Pending', 'Dispatched', 'In Transit', 'Delivered']

const columns: ColumnDef<DispatchRecord, any>[] = [
  {
    accessorKey: 'dispatchNo',
    header: 'Dispatch No',
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.dispatchNo}</span>,
  },
  { accessorKey: 'salesOrderNo', header: 'Sales Order' },
  { accessorKey: 'customerName', header: 'Customer' },
  {
    accessorKey: 'dispatchDate',
    header: 'Dispatch Date',
    cell: ({ row }) => formatDate(row.original.dispatchDate),
  },
  {
    accessorKey: 'qty',
    header: 'Quantity',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNumber(row.original.qty)} {row.original.unit}
      </span>
    ),
  },
  {
    id: 'carrier',
    header: 'Vehicle / Container',
    accessorFn: (row) => row.containerNo ?? row.vehicleNo ?? '',
    cell: ({ row }) => {
      const { containerNo, vehicleNo } = row.original
      if (containerNo) {
        return (
          <span className="flex items-center gap-1.5">
            <Container className="h-3.5 w-3.5 text-info-600" />
            <span className="tabular-nums">{containerNo}</span>
          </span>
        )
      }
      if (vehicleNo) {
        return (
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="tabular-nums">{vehicleNo}</span>
          </span>
        )
      }
      return <span className="text-muted-foreground">Not allotted</span>
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

export default function Dispatch() {
  const [status, setStatus] = useState<'All' | DispatchStatus>('All')

  const { data, isLoading } = useAsync(
    () => getDispatches(status === 'All' ? {} : { status }),
    [status],
  )
  const { data: allDispatches } = useAsync(() => getDispatches(), [])

  const counts = useMemo(() => {
    const list = allDispatches ?? []
    return {
      Pending: list.filter((d) => d.status === 'Pending').length,
      Dispatched: list.filter((d) => d.status === 'Dispatched').length,
      'In Transit': list.filter((d) => d.status === 'In Transit').length,
      Delivered: list.filter((d) => d.status === 'Delivered').length,
    } satisfies Record<DispatchStatus, number>
  }, [allDispatches])

  const shippedQty = useMemo(
    () => (data ?? []).reduce((sum, d) => sum + d.qty, 0),
    [data],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Dispatch"
        description="Shipment register — containerised export consignments and domestic road dispatches."
      />

      {allDispatches === undefined ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </StatGrid>
      ) : (
        <StatGrid>
          <StatCard label="Pending" value={formatNumber(counts.Pending)} icon={Clock} tone="warning" />
          <StatCard label="Dispatched" value={formatNumber(counts.Dispatched)} icon={Truck} tone="info" />
          <StatCard label="In Transit" value={formatNumber(counts['In Transit'])} icon={Container} tone="default" />
          <StatCard label="Delivered" value={formatNumber(counts.Delivered)} icon={CheckCircle2} tone="success" />
        </StatGrid>
      )}

      <Card>
        <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Dispatch Register</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatNumber(data?.length ?? 0)} consignments · {formatNumber(shippedQty)} units
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant={status === 'All' ? 'default' : 'outline'} onClick={() => setStatus('All')}>
              All
            </Button>
            {statuses.map((s) => (
              <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
                {s}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data ?? []}
            isLoading={isLoading}
            emptyMessage="No dispatches with this status."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
