import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Globe2, MapPin, Star, Users } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCustomers, getSalesOrders } from '@/services'
import { formatDate, formatInrCompact, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataTable } from '@/components/tables/DataTable'
import { RiskBadge } from '@/components/tables/RiskBadge'
import type { Customer, CustomerSegment } from '@/types'

const creditFormatters: Record<Customer['currency'], Intl.NumberFormat> = {
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: 'compact' }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact' }),
}

function formatCreditLimit(customer: Customer): string {
  return creditFormatters[customer.currency].format(customer.creditLimit)
}

function Rating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" title={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('h-3 w-3', i <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
        />
      ))}
    </span>
  )
}

function SegmentBadge({ segment }: { segment: CustomerSegment }) {
  return <Badge variant={segment === 'Export' ? 'info' : 'secondary'}>{segment}</Badge>
}

const columns: ColumnDef<Customer, any>[] = [
  {
    accessorKey: 'name',
    header: 'Customer',
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
  },
  { accessorKey: 'country', header: 'Country' },
  {
    accessorKey: 'region',
    header: 'Region',
    cell: ({ row }) => row.original.region ?? <span className="text-muted-foreground">Domestic</span>,
  },
  {
    accessorKey: 'segment',
    header: 'Segment',
    cell: ({ row }) => <SegmentBadge segment={row.original.segment} />,
  },
  { accessorKey: 'city', header: 'City' },
  { accessorKey: 'contactPerson', header: 'Contact Person' },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  { accessorKey: 'currency', header: 'Currency' },
  {
    accessorKey: 'creditLimit',
    header: 'Credit Limit',
    cell: ({ row }) => <span className="tabular-nums">{formatCreditLimit(row.original)}</span>,
  },
  { accessorKey: 'rating', header: 'Rating', cell: ({ row }) => <Rating value={row.original.rating} /> },
  {
    accessorKey: 'totalOrders',
    header: 'Total Orders',
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.totalOrders)}</span>,
  },
]

const segmentFilters: { key: 'All' | CustomerSegment; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Export', label: 'Export' },
  { key: 'Domestic', label: 'Domestic' },
]

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{value}</span>
    </div>
  )
}

function CustomerDetail({ customer }: { customer: Customer | null }) {
  const { data: orders, isLoading } = useAsync(
    () => (customer ? getSalesOrders({ customerId: customer.id }) : Promise.resolve([])),
    [customer?.id],
  )

  if (!customer) return null

  const recent = [...(orders ?? [])]
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 8)
  const orderValue = (orders ?? []).reduce((sum, o) => sum + o.valueInr, 0)

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border p-3.5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</div>
        <DetailRow label="Segment" value={<SegmentBadge segment={customer.segment} />} />
        <DetailRow label="Region" value={customer.region ?? 'Domestic (India)'} />
        <DetailRow label="Country" value={customer.country} />
        <DetailRow label="City" value={customer.city} />
        <DetailRow label="Active since" value={formatDate(customer.activeSince)} />
        <DetailRow label="Rating" value={<Rating value={customer.rating} />} />
      </div>

      <div className="rounded-lg border border-border p-3.5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Commercial</div>
        <DetailRow label="Currency" value={customer.currency} />
        <DetailRow label="Credit limit" value={formatCreditLimit(customer)} />
        <DetailRow label="Lifetime orders" value={formatNumber(customer.totalOrders)} />
        <DetailRow label="Open order book" value={formatInrCompact(orderValue)} />
      </div>

      <div className="rounded-lg border border-border p-3.5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</div>
        <DetailRow label="Contact person" value={customer.contactPerson} />
        <DetailRow label="Email" value={customer.email} />
        <DetailRow label="Phone" value={customer.phone} />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent sales orders
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No sales orders on the books for {customer.name}.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((order) => (
              <li key={order.id} className="rounded-md border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{order.orderNo}</span>
                  <RiskBadge risk={order.risk} />
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {order.productName} · {formatNumber(order.qtyOrdered)} {order.unit}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Due {formatDate(order.dueDate)}</span>
                  <span className="tabular-nums">{formatInrCompact(order.valueInr)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function Customers() {
  const [segment, setSegment] = useState<'All' | CustomerSegment>('All')
  const [selected, setSelected] = useState<Customer | null>(null)

  const { data, isLoading } = useAsync(
    () => getCustomers(segment === 'All' ? {} : { segment }),
    [segment],
  )
  const { data: allCustomers } = useAsync(() => getCustomers(), [])

  const stats = useMemo(() => {
    const list = allCustomers ?? []
    return {
      total: list.length,
      exportCount: list.filter((c) => c.segment === 'Export').length,
      domesticCount: list.filter((c) => c.segment === 'Domestic').length,
      countries: new Set(list.map((c) => c.country)).size,
    }
  }, [allCustomers])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Customers"
        description="Buyer register across the export regions and the domestic order book."
      />

      {allCustomers === undefined ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </StatGrid>
      ) : (
        <StatGrid>
          <StatCard label="Total customers" value={formatNumber(stats.total)} icon={Users} />
          <StatCard
            label="Export customers"
            value={formatNumber(stats.exportCount)}
            sublabel="America · Australia · Europe · South Asia"
            icon={Globe2}
            tone="success"
          />
          <StatCard label="Domestic customers" value={formatNumber(stats.domesticCount)} icon={Building2} tone="info" />
          <StatCard label="Countries served" value={formatNumber(stats.countries)} icon={MapPin} tone="warning" />
        </StatGrid>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Customer Register</CardTitle>
          <div className="flex items-center gap-1.5">
            {segmentFilters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={segment === f.key ? 'default' : 'outline'}
                onClick={() => setSegment(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data ?? []}
            isLoading={isLoading}
            emptyMessage="No customers in this segment."
            onRowClick={(row) => setSelected(row)}
            pageSize={12}
          />
        </CardContent>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader className="pb-3">
            <SheetTitle>{selected?.name ?? 'Customer'}</SheetTitle>
            <SheetDescription>
              {selected ? `${selected.city}, ${selected.country} · ${selected.region ?? 'Domestic'}` : null}
            </SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-6">
            <CustomerDetail key={selected?.id ?? 'none'} customer={selected} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
