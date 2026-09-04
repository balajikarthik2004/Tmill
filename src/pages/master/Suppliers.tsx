import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, Globe2, Mail, MapPin, Phone, Star, Truck, Wrench } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getSuppliers } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Supplier, SupplierCategory } from '@/types'

const supplierCategories: SupplierCategory[] = ['Cotton', 'Spares', 'Packing Material', 'Consumables']

const categoryVariant: Record<SupplierCategory, NonNullable<BadgeProps['variant']>> = {
  Cotton: 'success',
  Spares: 'info',
  'Packing Material': 'warning',
  Consumables: 'secondary',
}

const categoryColor: Record<SupplierCategory, string> = {
  Cotton: '#4a8a3c',
  Spares: '#0f6e56',
  'Packing Material': '#b4632a',
  Consumables: '#7c4a6e',
}

const cottonOrigins = ['Indian extra-long staple', 'Egyptian Cotton', 'US Pima']

const ALL = 'all'

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

function SupplierMasterDetail({ supplier }: { supplier: Supplier }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Supplier ID', value: supplier.id },
    { label: 'Legal name', value: supplier.name },
    { label: 'Buying category', value: supplier.category },
    { label: 'City', value: supplier.city },
    { label: 'Country', value: supplier.country },
    { label: 'Contact person', value: supplier.contactPerson },
    { label: 'Email', value: supplier.email },
    { label: 'Phone', value: supplier.phone },
    { label: 'Supplying since', value: formatDate(supplier.activeSince) },
    { label: 'Lifetime purchase orders', value: formatNumber(supplier.totalPOs) },
    { label: 'Cotton types supplied', value: supplier.suppliesOrigins?.join(', ') ?? 'Not a cotton supplier' },
  ]

  return (
    <div className="space-y-4 px-5 pb-6">
      <div className="space-y-2 rounded-md border border-border p-3 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">
            {supplier.city}, {supplier.country}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">{supplier.contactPerson}</span>
        </div>
        <div className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="break-all text-foreground">{supplier.email}</span>
        </div>
        <div className="flex items-start gap-2">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">{supplier.phone}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">Vendor rating</span>
          <Rating value={supplier.rating} />
        </div>
      </div>

      <div className="rounded-md border border-border">
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Master record</div>
        <dl className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-3 px-3 py-2">
              <dt className="shrink-0 text-xs text-muted-foreground">{r.label}</dt>
              <dd className="break-all text-right text-xs font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {supplier.suppliesOrigins && supplier.suppliesOrigins.length > 0 && (
        <div className="rounded-md border border-border p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Approved cotton types</div>
          <div className="flex flex-wrap gap-1.5">
            {supplier.suppliesOrigins.map((o) => (
              <Badge key={o} variant="success">
                {o}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Suppliers() {
  const [category, setCategory] = useState<string>(ALL)
  const [selected, setSelected] = useState<Supplier | null>(null)

  const all = useAsync(() => getSuppliers({}), [])
  const filtered = useAsync(() => getSuppliers({ category: category === ALL ? undefined : category }), [category])

  const data = useMemo(() => all.data ?? [], [all.data])

  const countsByCategory = useMemo(() => {
    const map = new Map<SupplierCategory, number>()
    for (const s of data) map.set(s.category, (map.get(s.category) ?? 0) + 1)
    return map
  }, [data])

  const byCountry = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of data) map.set(s.country, (map.get(s.country) ?? 0) + 1)
    return [...map.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count)
  }, [data])

  const originCoverage = useMemo(
    () =>
      cottonOrigins.map((origin) => ({
        origin,
        suppliers: data.filter((s) => s.suppliesOrigins?.includes(origin)),
      })),
    [data],
  )

  const countries = new Set(data.map((s) => s.country)).size
  const avgRating = data.length === 0 ? 0 : data.reduce((s, x) => s + x.rating, 0) / data.length
  const maxCountry = Math.max(...byCountry.map((c) => c.count), 1)

  const columns = useMemo<ColumnDef<Supplier, any>[]>(
    () => [
      { accessorKey: 'name', header: 'Supplier' },
      { accessorKey: 'id', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant={categoryVariant[row.original.category]}>{row.original.category}</Badge>,
      },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'country', header: 'Country' },
      { accessorKey: 'contactPerson', header: 'Contact' },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      { accessorKey: 'phone', header: 'Phone' },
      {
        accessorKey: 'activeSince',
        header: 'Since',
        cell: ({ row }) => formatDate(row.original.activeSince),
      },
      {
        accessorKey: 'totalPOs',
        header: 'Lifetime POs',
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.totalPOs)}</span>,
      },
      { accessorKey: 'rating', header: 'Rating', cell: ({ row }) => <Rating value={row.original.rating} /> },
      {
        id: 'origins',
        header: 'Cotton Types',
        accessorFn: (s) => s.suppliesOrigins?.join(', ') ?? '',
        cell: ({ row }) =>
          row.original.suppliesOrigins?.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.suppliesOrigins.map((o) => (
                <Badge key={o} variant="outline">
                  {o}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Suppliers"
        description="Supplier master — approved vendors for cotton, machinery spares, packing material and consumables, with the cotton types each is cleared to supply."
        actions={
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {supplierCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
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
          <StatCard label="Suppliers" value={formatNumber(data.length)} sublabel="On the master register" icon={Building2} />
          <StatCard
            label="Cotton"
            value={formatNumber(countsByCategory.get('Cotton') ?? 0)}
            sublabel="Indian ELS · Egyptian · US Pima"
            icon={Truck}
            tone="success"
          />
          <StatCard
            label="Spares"
            value={formatNumber(countsByCategory.get('Spares') ?? 0)}
            sublabel="Rieter, Trutzschler, Schlafhorst, Savio"
            icon={Wrench}
            tone="info"
          />
          <StatCard
            label="Packing Material"
            value={formatNumber(countsByCategory.get('Packing Material') ?? 0)}
            sublabel="Cartons, pallets, film"
            tone="warning"
          />
          <StatCard
            label="Consumables"
            value={formatNumber(countsByCategory.get('Consumables') ?? 0)}
            sublabel="Oils, solvents, lab reagents"
          />
          <StatCard
            label="Sourcing countries"
            value={formatNumber(countries)}
            sublabel={`Average rating ${avgRating.toFixed(1)}/5`}
            icon={Globe2}
            tone="info"
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Suppliers by Sourcing Country</CardTitle>
          </CardHeader>
          <CardContent>
            {all.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : byCountry.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No suppliers on the register.
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCountry} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="country"
                      width={72}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={{
                        borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
                        border: '1px solid hsl(var(--border))',
                        fontSize: 12,
                        background: 'hsl(var(--popover))',
                      }}
                      formatter={(value) => [`${formatNumber(Number(value))} suppliers`, 'Suppliers']}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      {byCountry.map((c) => (
                        <Cell key={c.country} fill={c.count === maxCountry ? '#0f6e56' : '#93c3b2'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cotton Type Coverage</CardTitle>
            <p className="text-xs text-muted-foreground">Approved suppliers behind each published cotton type.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {all.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              originCoverage.map((o) => (
                <div key={o.origin}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-foreground">{o.origin}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{o.suppliers.length} suppliers</span>
                  </div>
                  <Progress
                    value={(o.suppliers.length / Math.max(countsByCategory.get('Cotton') ?? 1, 1)) * 100}
                    className="h-1.5"
                    indicatorClassName="bg-success-500"
                  />
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {o.suppliers.map((s) => s.name).join(' · ') || 'No approved supplier'}
                  </div>
                </div>
              ))
            )}
            {!all.isLoading && (
              <div className="border-t border-border pt-3">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">Category split</div>
                <div className="space-y-1.5">
                  {supplierCategories.map((c) => (
                    <div key={c} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor[c] }} />
                        <span className="text-foreground">{c}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(countsByCategory.get(c) ?? 0)} ·{' '}
                        {formatPct(data.length === 0 ? 0 : ((countsByCategory.get(c) ?? 0) / data.length) * 100, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Supplier Master</CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatNumber(filtered.data?.length ?? 0)} records{category !== ALL && ` · ${category}`}
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filtered.data ?? []}
            isLoading={filtered.isLoading}
            emptyMessage="No suppliers match this filter."
            onRowClick={(row) => setSelected(row)}
            pageSize={12}
          />
        </CardContent>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.category} · {selected.city}, {selected.country} · supplying since{' '}
                  {formatDate(selected.activeSince)}
                </SheetDescription>
              </SheetHeader>
              <SupplierMasterDetail supplier={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
