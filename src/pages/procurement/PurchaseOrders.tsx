import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ShoppingCart } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getPurchaseOrders } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatInr, formatInrCompact, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PoStatus, PurchaseOrder } from '@/types'

const poStatuses: PoStatus[] = ['Open', 'Partially Received', 'Received', 'Closed', 'Cancelled']

const statusVariant: Record<PoStatus, 'info' | 'warning' | 'success' | 'secondary' | 'danger'> = {
  Open: 'info',
  'Partially Received': 'warning',
  Received: 'success',
  Closed: 'secondary',
  Cancelled: 'danger',
}

const ALL = 'all'

export default function PurchaseOrders() {
  const [status, setStatus] = useState<string>(ALL)

  const all = useAsync(() => getPurchaseOrders({}), [])
  const filtered = useAsync(() => getPurchaseOrders({ status: status === ALL ? undefined : status }), [status])

  const countsByStatus = useMemo(() => {
    const map = new Map<PoStatus, number>()
    for (const p of all.data ?? []) map.set(p.status, (map.get(p.status) ?? 0) + 1)
    return map
  }, [all.data])

  const total = all.data?.length ?? 0
  const totalValue = (all.data ?? []).reduce((s, p) => s + p.valueInr, 0)
  const filteredValue = (filtered.data ?? []).reduce((s, p) => s + p.valueInr, 0)

  const columns = useMemo<ColumnDef<PurchaseOrder, any>[]>(
    () => [
      { accessorKey: 'poNo', header: 'PO No' },
      { accessorKey: 'supplierName', header: 'Supplier' },
      { accessorKey: 'itemName', header: 'Item' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
      },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.qty)}</span>,
      },
      {
        accessorKey: 'receivedQty',
        header: 'Received',
        cell: ({ row }) => {
          const pct = row.original.qty === 0 ? 0 : Math.round((row.original.receivedQty / row.original.qty) * 100)
          return (
            <div className="flex items-center gap-2">
              <Progress
                value={Math.min(pct, 100)}
                className="h-1.5 w-16"
                indicatorClassName={pct >= 100 ? 'bg-success-500' : pct > 0 ? 'bg-warning-500' : 'bg-muted-foreground/40'}
              />
              <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatNumber(row.original.receivedQty)} ({pct}%)
              </span>
            </div>
          )
        },
      },
      { accessorKey: 'unit', header: 'Unit' },
      {
        accessorKey: 'ratePerUnit',
        header: 'Rate',
        cell: ({ row }) => <span className="tabular-nums">{formatInr(row.original.ratePerUnit)}</span>,
      },
      {
        accessorKey: 'valueInr',
        header: 'Value',
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{formatInrCompact(row.original.valueInr)}</span>
        ),
      },
      {
        accessorKey: 'expectedDate',
        header: 'Expected',
        cell: ({ row }) => {
          const overdue =
            new Date(row.original.expectedDate) < new Date() &&
            (row.original.status === 'Open' || row.original.status === 'Partially Received')
          return (
            <span className={cn(overdue && 'font-medium text-danger-600')}>{formatDate(row.original.expectedDate)}</span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} variant={statusVariant[row.original.status]} />,
      },
    ],
    [],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Purchase Orders"
        description="Orders placed on cotton, spares, packing and consumables suppliers, with receipt progress against each."
        actions={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {poStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {all.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <button type="button" onClick={() => setStatus(ALL)} className="text-left">
            <Card
              className={cn(
                'h-full p-3 transition-all hover:border-primary/40',
                status === ALL && 'border-primary/60 bg-accent/50',
              )}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShoppingCart className="h-3.5 w-3.5" />
                All POs
              </div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{formatNumber(total)}</div>
            </Card>
          </button>
          {poStatuses.map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className="text-left">
              <Card
                className={cn(
                  'h-full p-3 transition-all hover:border-primary/40',
                  status === s && 'border-primary/60 bg-accent/50',
                )}
              >
                <div className="truncate text-xs text-muted-foreground">{s}</div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                  {formatNumber(countsByStatus.get(s) ?? 0)}
                </div>
              </Card>
            </button>
          ))}
          <Card className="h-full p-3">
            <div className="truncate text-xs text-muted-foreground">Total PO value</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{formatInrCompact(totalValue)}</div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Purchase Order Register</CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatNumber(filtered.data?.length ?? 0)} of {formatNumber(total)} orders ·{' '}
            {formatInrCompact(filteredValue)}
            {status !== ALL && ` · ${status}`}
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filtered.data ?? []}
            isLoading={filtered.isLoading}
            emptyMessage="No purchase orders match this filter."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
