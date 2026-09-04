import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleCheck, CircleDot, MessageSquare, Search } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getComplaints, getComplaintSummary } from '@/services'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber, formatRelative } from '@/lib/format'
import type { CustomerComplaint } from '@/types'

const statusOptions = ['all', 'Open', 'Investigating', 'Resolved', 'Closed']

export default function Complaints() {
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<CustomerComplaint | null>(null)

  const complaints = useAsync(getComplaints, [])
  const summary = useAsync(getComplaintSummary, [])

  const rows = useMemo(
    () =>
      (complaints.data ?? [])
        .filter((c) => status === 'all' || c.status === status)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [complaints.data, status],
  )

  const columns = useMemo<ColumnDef<CustomerComplaint, any>[]>(
    () => [
      { accessorKey: 'complaintNo', header: 'Complaint No' },
      { accessorKey: 'customerName', header: 'Customer' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="block max-w-72 truncate text-muted-foreground">{row.original.description}</span>
        ),
      },
      { accessorKey: 'date', header: 'Raised', cell: ({ row }) => formatDate(row.original.date) },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Customer Complaints"
        description="Quality feedback from domestic and export customers, routed to the Central Testing Laboratory for investigation."
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

      {summary.isLoading || !summary.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard
            label="Open"
            value={formatNumber(summary.data.byStatus.Open)}
            sublabel="Awaiting first response"
            icon={CircleDot}
            tone="danger"
          />
          <StatCard
            label="Investigating"
            value={formatNumber(summary.data.byStatus.Investigating)}
            sublabel="Lab re-test in progress"
            icon={Search}
            tone="warning"
          />
          <StatCard
            label="Resolved"
            value={formatNumber(summary.data.byStatus.Resolved)}
            sublabel="Corrective action agreed"
            icon={CircleCheck}
            tone="success"
          />
          <StatCard
            label="Closed"
            value={formatNumber(summary.data.byStatus.Closed)}
            sublabel={`${formatNumber(summary.data.total)} complaints in total`}
            icon={MessageSquare}
            tone="success"
          />
        </StatGrid>
      )}

      {summary.data && summary.data.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Complaint Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {summary.data.byCategory.map((c) => (
              <Badge key={c.category} variant="secondary">
                {c.category} · {formatNumber(c.count)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Complaint Register</CardTitle>
          <p className="text-xs text-muted-foreground">Select a row for the full complaint record.</p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={complaints.isLoading}
            emptyMessage="No complaints match this filter."
            onRowClick={(row) => setSelected(row)}
            pageSize={12}
          />
        </CardContent>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.complaintNo}</SheetTitle>
                <SheetDescription>
                  Raised by {selected.customerName} · {formatRelative(selected.date)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-5 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <Badge variant="outline">{selected.category}</Badge>
                  <Badge variant="secondary">{formatDate(selected.date)}</Badge>
                </div>

                <div className="rounded-md border border-border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Complaint</div>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{selected.description}</p>
                </div>

                <div className="divide-y divide-border rounded-md border border-border">
                  <div className="flex items-center justify-between gap-3 p-3">
                    <span className="text-xs text-muted-foreground">Customer</span>
                    <span className="text-sm font-medium text-foreground">{selected.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <span className="text-xs text-muted-foreground">Category</span>
                    <span className="text-sm font-medium text-foreground">{selected.category}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <span className="text-xs text-muted-foreground">Raised on</span>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatDate(selected.date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <span className="text-xs text-muted-foreground">Linked sales order</span>
                    <span className="text-sm font-medium text-foreground">
                      {selected.salesOrderId ?? 'Not linked'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
