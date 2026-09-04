import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardList } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getPurchaseRequisitions } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PrStatus, PurchaseRequisition } from '@/types'

const prStatuses: PrStatus[] = ['Draft', 'Submitted', 'Approved', 'Converted', 'Rejected']

const statusVariant: Record<PrStatus, 'secondary' | 'info' | 'success' | 'warning' | 'danger'> = {
  Draft: 'secondary',
  Submitted: 'info',
  Approved: 'success',
  Converted: 'warning',
  Rejected: 'danger',
}

const ALL = 'all'

export default function PurchaseRequisitions() {
  const [status, setStatus] = useState<string>(ALL)

  const all = useAsync(() => getPurchaseRequisitions({}), [])
  const filtered = useAsync(
    () => getPurchaseRequisitions({ status: status === ALL ? undefined : status }),
    [status],
  )
  const factories = useAsync(getFactories, [])

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.shortName])),
    [factories.data],
  )

  const countsByStatus = useMemo(() => {
    const map = new Map<PrStatus, number>()
    for (const p of all.data ?? []) map.set(p.status, (map.get(p.status) ?? 0) + 1)
    return map
  }, [all.data])

  const columns = useMemo<ColumnDef<PurchaseRequisition, any>[]>(
    () => [
      { accessorKey: 'prNo', header: 'PR No' },
      { accessorKey: 'raisedDate', header: 'Raised', cell: ({ row }) => formatDate(row.original.raisedDate) },
      { accessorKey: 'requiredBy', header: 'Required By', cell: ({ row }) => formatDate(row.original.requiredBy) },
      { accessorKey: 'itemName', header: 'Item' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
      },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.qty)} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'factoryId',
        header: 'Unit',
        cell: ({ row }) => factoryNames.get(row.original.factoryId) ?? row.original.factoryId,
      },
      { accessorKey: 'raisedBy', header: 'Raised By' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} variant={statusVariant[row.original.status]} />,
      },
    ],
    [factoryNames],
  )

  const total = all.data?.length ?? 0

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Purchase Requisitions"
        description="Material requests raised by the mills for cotton, spares, packing material and consumables."
        actions={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {prStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {all.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <button type="button" onClick={() => setStatus(ALL)} className="text-left">
            <Card
              className={cn(
                'h-full p-3 transition-all hover:border-primary/40',
                status === ALL && 'border-primary/60 bg-accent/50',
              )}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" />
                All requisitions
              </div>
              <div className="mt-0.5 num text-lg font-semibold text-foreground">{formatNumber(total)}</div>
            </Card>
          </button>
          {prStatuses.map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className="text-left">
              <Card
                className={cn(
                  'h-full p-3 transition-all hover:border-primary/40',
                  status === s && 'border-primary/60 bg-accent/50',
                )}
              >
                <div className="truncate text-xs text-muted-foreground">{s}</div>
                <div className="mt-0.5 num text-lg font-semibold text-foreground">
                  {formatNumber(countsByStatus.get(s) ?? 0)}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Requisition Register</CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatNumber(filtered.data?.length ?? 0)} of {formatNumber(total)} requisitions
            {status !== ALL && ` · ${status}`}
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filtered.data ?? []}
            isLoading={filtered.isLoading || factories.isLoading}
            emptyMessage="No purchase requisitions match this filter."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
