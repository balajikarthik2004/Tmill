import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PackageCheck } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCottonLots, getGrns } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Grn as GrnRecord, GrnStatus } from '@/types'

const grnStatuses: GrnStatus[] = ['Pending QC', 'Accepted', 'Partially Accepted', 'Rejected']

const statusVariant: Record<GrnStatus, 'warning' | 'success' | 'info' | 'danger'> = {
  'Pending QC': 'warning',
  Accepted: 'success',
  'Partially Accepted': 'info',
  Rejected: 'danger',
}

const ALL = 'all'

function acceptancePct(g: GrnRecord) {
  return g.qtyReceived === 0 ? 0 : (g.qtyAccepted / g.qtyReceived) * 100
}

export default function Grn() {
  const [status, setStatus] = useState<string>(ALL)

  const all = useAsync(() => getGrns({}), [])
  const filtered = useAsync(() => getGrns({ status: status === ALL ? undefined : status }), [status])
  const lots = useAsync(() => getCottonLots({}), [])

  const lotNumbers = useMemo(() => new Map((lots.data ?? []).map((l) => [l.id, l.lotNumber])), [lots.data])

  const countsByStatus = useMemo(() => {
    const map = new Map<GrnStatus, number>()
    for (const g of all.data ?? []) map.set(g.status, (map.get(g.status) ?? 0) + 1)
    return map
  }, [all.data])

  const total = all.data?.length ?? 0
  const totalReceived = (all.data ?? []).reduce((s, g) => s + g.qtyReceived, 0)
  const totalAccepted = (all.data ?? []).reduce((s, g) => s + g.qtyAccepted, 0)
  const overallAcceptance = totalReceived === 0 ? 0 : (totalAccepted / totalReceived) * 100

  const columns = useMemo<ColumnDef<GrnRecord, any>[]>(
    () => [
      { accessorKey: 'grnNo', header: 'GRN No' },
      { accessorKey: 'poNo', header: 'PO No' },
      { accessorKey: 'supplierName', header: 'Supplier' },
      { accessorKey: 'itemName', header: 'Item' },
      {
        accessorKey: 'qtyReceived',
        header: 'Received',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.qtyReceived)} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'qtyAccepted',
        header: 'Accepted',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.qtyAccepted)} {row.original.unit}
          </span>
        ),
      },
      {
        id: 'acceptance',
        header: 'Acceptance',
        accessorFn: (g) => acceptancePct(g),
        cell: ({ row }) => {
          const pct = acceptancePct(row.original)
          return (
            <div className="flex items-center gap-2">
              <Progress
                value={pct}
                className="h-1.5 w-16"
                indicatorClassName={pct >= 99 ? 'bg-success-500' : pct >= 60 ? 'bg-warning-500' : 'bg-danger-500'}
              />
              <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">{formatPct(pct, 0)}</span>
            </div>
          )
        },
      },
      {
        id: 'cottonLot',
        header: 'Cotton Lot',
        accessorFn: (g) => (g.cottonLotId ? (lotNumbers.get(g.cottonLotId) ?? g.cottonLotId) : ''),
        cell: ({ row }) =>
          row.original.cottonLotId ? (
            <Badge variant="outline">{lotNumbers.get(row.original.cottonLotId) ?? row.original.cottonLotId}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { accessorKey: 'inspectedBy', header: 'Inspected By' },
      { accessorKey: 'receivedDate', header: 'Received On', cell: ({ row }) => formatDate(row.original.receivedDate) },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} variant={statusVariant[row.original.status]} />,
      },
    ],
    [lotNumbers],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Goods Receipt Notes"
        description="Inbound receipts inspected against their purchase orders, with cotton receipts linked to the lot raised in the Central Testing Laboratory."
        actions={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {grnStatuses.map((s) => (
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
                <PackageCheck className="h-3.5 w-3.5" />
                All receipts
              </div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{formatNumber(total)}</div>
            </Card>
          </button>
          {grnStatuses.map((s) => (
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
            <div className="truncate text-xs text-muted-foreground">Overall acceptance</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{formatPct(overallAcceptance, 1)}</div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Receipt Register</CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatNumber(filtered.data?.length ?? 0)} of {formatNumber(total)} receipts
            {status !== ALL && ` · ${status}`}
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filtered.data ?? []}
            isLoading={filtered.isLoading || lots.isLoading}
            emptyMessage="No goods receipt notes match this filter."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
