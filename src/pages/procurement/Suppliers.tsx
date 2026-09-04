import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Mail, MapPin, Package, Phone, Star, Truck, Wrench } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getPurchaseOrders, getSuppliers } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate, formatInrCompact, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Supplier, SupplierCategory } from '@/types'

const supplierCategories: SupplierCategory[] = ['Cotton', 'Spares', 'Packing Material', 'Consumables']

const categoryVariant: Record<SupplierCategory, NonNullable<BadgeProps['variant']>> = {
  Cotton: 'success',
  Spares: 'info',
  'Packing Material': 'warning',
  Consumables: 'secondary',
}

const categoryIcon = {
  Cotton: Truck,
  Spares: Wrench,
  'Packing Material': Package,
  Consumables: Building2,
} as const

const ALL = 'all'

function Rating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn('h-3 w-3', n <= value ? 'fill-amber-tint text-amber-tint' : 'text-muted-foreground/40')}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums text-muted-foreground">{value}/5</span>
    </span>
  )
}

function SupplierDetail({ supplier }: { supplier: Supplier }) {
  const orders = useAsync(() => getPurchaseOrders({ supplierId: supplier.id }), [supplier.id])
  const openValue = (orders.data ?? [])
    .filter((o) => o.status === 'Open' || o.status === 'Partially Received')
    .reduce((s, o) => s + o.valueInr, 0)
  const totalValue = (orders.data ?? []).reduce((s, o) => s + o.valueInr, 0)

  return (
    <div className="space-y-4 px-5 pb-6">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Purchase orders on file</div>
          <div className="text-lg font-bold tabular-nums text-foreground">{formatNumber(orders.data?.length ?? 0)}</div>
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Lifetime POs</div>
          <div className="text-lg font-bold tabular-nums text-foreground">{formatNumber(supplier.totalPOs)}</div>
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Ordered value</div>
          <div className="text-lg font-bold tabular-nums text-foreground">{formatInrCompact(totalValue)}</div>
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Open commitment</div>
          <div className="text-lg font-bold tabular-nums text-foreground">{formatInrCompact(openValue)}</div>
        </div>
      </div>

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
          <span className="text-xs text-muted-foreground">Supplying since</span>
          <span className="text-xs font-medium text-foreground">{formatDate(supplier.activeSince)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Rating</span>
          <Rating value={supplier.rating} />
        </div>
      </div>

      {supplier.suppliesOrigins && supplier.suppliesOrigins.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Cotton types supplied</div>
          <div className="flex flex-wrap gap-1.5">
            {supplier.suppliesOrigins.map((o) => (
              <Badge key={o} variant="outline">
                {o}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Purchase orders</div>
        {orders.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (orders.data ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No purchase orders raised on this supplier yet.
          </div>
        ) : (
          <div className="space-y-2">
            {(orders.data ?? []).map((po) => (
              <div key={po.id} className="rounded-md border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground">{po.poNo}</span>
                  <StatusBadge status={po.status} />
                </div>
                <div className="mt-1 truncate text-sm text-foreground">{po.itemName}</div>
                <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {formatNumber(po.qty)} {po.unit} · {formatInrCompact(po.valueInr)}
                  </span>
                  <span>Due {formatDate(po.expectedDate)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Suppliers() {
  const [category, setCategory] = useState<string>(ALL)
  const [selected, setSelected] = useState<Supplier | null>(null)

  const all = useAsync(() => getSuppliers({}), [])
  const filtered = useAsync(() => getSuppliers({ category: category === ALL ? undefined : category }), [category])

  const countsByCategory = useMemo(() => {
    const map = new Map<SupplierCategory, number>()
    for (const s of all.data ?? []) map.set(s.category, (map.get(s.category) ?? 0) + 1)
    return map
  }, [all.data])

  const columns = useMemo<ColumnDef<Supplier, any>[]>(
    () => [
      { accessorKey: 'name', header: 'Supplier' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant={categoryVariant[row.original.category]}>{row.original.category}</Badge>,
      },
      { accessorKey: 'country', header: 'Country' },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'contactPerson', header: 'Contact' },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      { accessorKey: 'rating', header: 'Rating', cell: ({ row }) => <Rating value={row.original.rating} /> },
      {
        accessorKey: 'totalPOs',
        header: 'Total POs',
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.totalPOs)}</span>,
      },
      {
        id: 'origins',
        header: 'Cotton Types',
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
        description="Supplier register for cotton, machinery spares, packing material and consumables."
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-17.5 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={5}>
          <StatCard
            label="Total suppliers"
            value={formatNumber(all.data?.length ?? 0)}
            sublabel="Across four buying categories"
            icon={Building2}
          />
          {supplierCategories.map((c) => (
            <StatCard
              key={c}
              label={c}
              value={formatNumber(countsByCategory.get(c) ?? 0)}
              sublabel={c === 'Cotton' ? 'Indian ELS · Egyptian · US Pima' : 'Approved vendors'}
              icon={categoryIcon[c]}
              tone={c === 'Cotton' ? 'success' : c === 'Spares' ? 'info' : 'default'}
            />
          ))}
        </StatGrid>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Supplier Register</CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatNumber(filtered.data?.length ?? 0)} suppliers{category !== ALL && ` · ${category}`}
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filtered.data ?? []}
            isLoading={filtered.isLoading}
            emptyMessage="No suppliers in this category."
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
                  {selected.category} supplier · {selected.city}, {selected.country}
                </SheetDescription>
              </SheetHeader>
              <SupplierDetail supplier={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
