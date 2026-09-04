import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Building2, Globe2, Mail, MapPin, Phone, Star, Users } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCustomers, getSalesOrders } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { RiskBadge } from '@/components/tables/RiskBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types'

const regionColors: Record<string, string> = {
  Europe: '#0f6e56',
  America: '#3a7d8c',
  'South Asia': '#b4632a',
  Australia: '#7c4a6e',
  Domestic: '#4a8a3c',
}

const currencySymbols: Record<Customer['currency'], string> = { INR: '₹', USD: '$', EUR: '€' }

const ALL = 'all'

function formatCredit(customer: Customer) {
  return `${currencySymbols[customer.currency]}${Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(customer.creditLimit)}`
}

function Rating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('h-3 w-3', n <= value ? 'fill-warning-500 text-warning-500' : 'text-muted-foreground/40')} />
      ))}
      <span className="ml-1 text-xs tabular-nums text-muted-foreground">{value}/5</span>
    </span>
  )
}

function CustomerDetail({ customer }: { customer: Customer }) {
  const orders = useAsync(() => getSalesOrders({ customerId: customer.id }), [customer.id])
  const rows: { label: string; value: string }[] = [
    { label: 'Customer ID', value: customer.id },
    { label: 'Segment', value: customer.segment },
    { label: 'Region', value: customer.region ?? 'Domestic (India)' },
    { label: 'City', value: customer.city },
    { label: 'Country', value: customer.country },
    { label: 'Contact person', value: customer.contactPerson },
    { label: 'Email', value: customer.email },
    { label: 'Phone', value: customer.phone },
    { label: 'Billing currency', value: customer.currency },
    { label: 'Credit limit', value: formatCredit(customer) },
    { label: 'Customer since', value: formatDate(customer.activeSince) },
    { label: 'Lifetime orders', value: formatNumber(customer.totalOrders) },
  ]

  return (
    <div className="space-y-4 px-5 pb-6">
      <div className="space-y-2 rounded-md border border-border p-3 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">
            {customer.city}, {customer.country}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">{customer.contactPerson}</span>
        </div>
        <div className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="break-all text-foreground">{customer.email}</span>
        </div>
        <div className="flex items-start gap-2">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">{customer.phone}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">Rating</span>
          <Rating value={customer.rating} />
        </div>
      </div>

      <div className="rounded-md border border-border">
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
          Master record
        </div>
        <dl className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{r.label}</dt>
              <dd className="break-all text-right text-xs font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Open sales orders</div>
        {orders.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (orders.data ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No sales orders booked for this customer.
          </div>
        ) : (
          <div className="space-y-2">
            {(orders.data ?? []).map((o) => (
              <div key={o.id} className="rounded-md border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground">{o.orderNo}</span>
                  <RiskBadge risk={o.risk} />
                </div>
                <div className="mt-1 truncate text-sm text-foreground">{o.productName}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {formatNumber(o.qtyOrdered)} {o.unit} · due {formatDate(o.dueDate)}
                  </span>
                  <span>{o.stage}</span>
                </div>
                <Progress value={o.productionPct} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Customers() {
  const [segment, setSegment] = useState<string>(ALL)
  const [selected, setSelected] = useState<Customer | null>(null)

  const all = useAsync(() => getCustomers({}), [])
  const filtered = useAsync(
    () => getCustomers({ segment: segment === ALL ? undefined : (segment as 'Domestic' | 'Export') }),
    [segment],
  )

  const byRegion = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of all.data ?? []) {
      const key = c.region ?? 'Domestic'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
  }, [all.data])

  const exportCustomers = (all.data ?? []).filter((c) => c.segment === 'Export')
  const domesticCustomers = (all.data ?? []).filter((c) => c.segment === 'Domestic')
  const countries = new Set(exportCustomers.map((c) => c.country)).size
  const totalOrders = (all.data ?? []).reduce((s, c) => s + c.totalOrders, 0)
  const avgRating =
    (all.data ?? []).length === 0 ? 0 : (all.data ?? []).reduce((s, c) => s + c.rating, 0) / (all.data ?? []).length
  const totalCustomers = all.data?.length ?? 0

  const columns = useMemo<ColumnDef<Customer, any>[]>(
    () => [
      { accessorKey: 'name', header: 'Customer' },
      {
        accessorKey: 'segment',
        header: 'Segment',
        cell: ({ row }) => (
          <Badge variant={row.original.segment === 'Export' ? 'info' : 'secondary'}>{row.original.segment}</Badge>
        ),
      },
      {
        id: 'region',
        header: 'Region',
        accessorFn: (c) => c.region ?? 'Domestic',
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: regionColors[row.original.region ?? 'Domestic'] ?? '#9aa39b' }}
            />
            {row.original.region ?? 'Domestic'}
          </span>
        ),
      },
      { accessorKey: 'country', header: 'Country' },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'contactPerson', header: 'Contact' },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      { accessorKey: 'phone', header: 'Phone' },
      {
        accessorKey: 'creditLimit',
        header: 'Credit Limit',
        cell: ({ row }) => <span className="tabular-nums">{formatCredit(row.original)}</span>,
      },
      { accessorKey: 'currency', header: 'Currency' },
      {
        accessorKey: 'activeSince',
        header: 'Since',
        cell: ({ row }) => formatDate(row.original.activeSince),
      },
      {
        accessorKey: 'totalOrders',
        header: 'Orders',
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.totalOrders)}</span>,
      },
      { accessorKey: 'rating', header: 'Rating', cell: ({ row }) => <Rating value={row.original.rating} /> },
    ],
    [],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Customers"
        description="Customer master for the export-led order book across America, Australia, Europe and South Asia, plus domestic buyers."
        actions={
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All customers</SelectItem>
              <SelectItem value="Export">Export</SelectItem>
              <SelectItem value="Domestic">Domestic</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {all.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-17.5 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard label="Customers" value={formatNumber(totalCustomers)} sublabel="On the master register" icon={Users} />
          <StatCard
            label="Export customers"
            value={formatNumber(exportCustomers.length)}
            sublabel={`${formatPct(totalCustomers === 0 ? 0 : (exportCustomers.length / totalCustomers) * 100, 0)} of the book`}
            icon={Globe2}
            tone="info"
          />
          <StatCard
            label="Domestic customers"
            value={formatNumber(domesticCustomers.length)}
            sublabel="Coimbatore, Tiruppur, Mumbai"
            icon={Building2}
            tone="success"
          />
          <StatCard label="Export countries" value={formatNumber(countries)} sublabel="Distinct destinations" icon={MapPin} tone="warning" />
          <StatCard label="Lifetime orders" value={formatNumber(totalOrders)} sublabel="Across all customers" icon={Users} />
          <StatCard label="Average rating" value={avgRating.toFixed(1)} sublabel="Out of 5" icon={Star} tone="warning" />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Customers by Region</CardTitle>
          </CardHeader>
          <CardContent>
            {all.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : byRegion.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No customers on the register.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byRegion}
                        dataKey="count"
                        nameKey="region"
                        innerRadius="68%"
                        outerRadius="98%"
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {byRegion.map((r) => (
                          <Cell key={r.region} fill={regionColors[r.region] ?? '#9aa39b'} stroke="hsl(var(--card))" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${formatNumber(Number(value))} customers`, String(name)]}
                        contentStyle={{
                          borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
                          border: '1px solid hsl(var(--border))',
                          fontSize: 12,
                          background: 'hsl(var(--popover))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatNumber(totalCustomers)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {byRegion.map((r) => (
                    <div key={r.region} className="flex items-center justify-between px-1.5 py-1 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: regionColors[r.region] ?? '#9aa39b' }}
                        />
                        <span className="font-medium text-foreground">{r.region}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(r.count)} · {formatPct((r.count / totalCustomers) * 100, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Customer Master</CardTitle>
            <span className="text-xs text-muted-foreground">
              {formatNumber(filtered.data?.length ?? 0)} records{segment !== ALL && ` · ${segment}`}
            </span>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filtered.data ?? []}
              isLoading={filtered.isLoading}
              emptyMessage="No customers match this filter."
              onRowClick={(row) => setSelected(row)}
              pageSize={12}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.segment} · {selected.region ?? 'India'} · customer since {formatDate(selected.activeSince)}
                </SheetDescription>
              </SheetHeader>
              <CustomerDetail customer={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
