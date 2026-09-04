import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Boxes, FlaskConical, Layers, Weight } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCottonLots, getSuppliers } from '@/services'
import { formatDate, formatKg, formatNumber, formatPct } from '@/lib/format'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import type { CottonLot, CottonOrigin } from '@/types'

/** The three cotton types published on tmills.com. */
const origins: CottonOrigin[] = ['Indian extra-long staple', 'Egyptian Cotton', 'US Pima']
const lotStatuses: CottonLot['status'][] = ['In Testing', 'Approved', 'In Use', 'Consumed', 'On Hold']

const originTone: Record<CottonOrigin, 'info' | 'success' | 'warning'> = {
  'Indian extra-long staple': 'info',
  'Egyptian Cotton': 'success',
  'US Pima': 'warning',
}

function buildColumns(supplierName: (id: string) => string): ColumnDef<CottonLot, any>[] {
  return [
    {
      accessorKey: 'lotNumber',
      header: 'Lot Number',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.lotNumber}</span>,
    },
    {
      accessorKey: 'origin',
      header: 'Origin',
      cell: ({ row }) => <Badge variant={originTone[row.original.origin]}>{row.original.origin}</Badge>,
    },
    {
      id: 'supplier',
      header: 'Supplier',
      accessorFn: (row) => supplierName(row.supplierId),
      cell: ({ row }) => supplierName(row.original.supplierId),
    },
    {
      accessorKey: 'bales',
      header: 'Bales',
      cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.bales)}</span>,
    },
    {
      accessorKey: 'weightKg',
      header: 'Weight',
      cell: ({ row }) => <span className="tabular-nums">{formatKg(row.original.weightKg)}</span>,
    },
    {
      accessorKey: 'micronaire',
      header: 'Mic',
      cell: ({ row }) => <span className="tabular-nums">{row.original.micronaire.toFixed(2)}</span>,
    },
    {
      accessorKey: 'staple',
      header: 'Staple (mm)',
      cell: ({ row }) => <span className="tabular-nums">{row.original.staple.toFixed(1)}</span>,
    },
    {
      accessorKey: 'strength',
      header: 'Strength (g/tex)',
      cell: ({ row }) => <span className="tabular-nums">{row.original.strength.toFixed(1)}</span>,
    },
    {
      accessorKey: 'trashPct',
      header: 'Trash %',
      cell: ({ row }) => <span className="tabular-nums">{formatPct(row.original.trashPct)}</span>,
    },
    {
      accessorKey: 'moisturePct',
      header: 'Moisture %',
      cell: ({ row }) => <span className="tabular-nums">{formatPct(row.original.moisturePct)}</span>,
    },
    {
      accessorKey: 'receivedDate',
      header: 'Received',
      cell: ({ row }) => formatDate(row.original.receivedDate),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ]
}

function ParamRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <div>
        <div className="text-xs font-medium text-foreground">{label}</div>
        {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
      </div>
      <div className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  )
}

export default function CottonLots() {
  const [origin, setOrigin] = useState<'all' | CottonOrigin>('all')
  const [status, setStatus] = useState<'all' | CottonLot['status']>('all')
  const [selected, setSelected] = useState<CottonLot | null>(null)

  const { data: lots, isLoading } = useAsync(
    () =>
      getCottonLots({
        origin: origin === 'all' ? undefined : origin,
        status: status === 'all' ? undefined : status,
      }),
    [origin, status],
  )
  const { data: allLots } = useAsync(() => getCottonLots(), [])
  const { data: suppliers } = useAsync(() => getSuppliers(), [])

  const supplierNames = useMemo(() => new Map((suppliers ?? []).map((s) => [s.id, s.name])), [suppliers])
  const supplierName = useMemo(
    () => (id: string) => supplierNames.get(id) ?? 'Unlisted supplier',
    [supplierNames],
  )
  const columns = useMemo(() => buildColumns(supplierName), [supplierName])

  const stats = useMemo(() => {
    const list = allLots ?? []
    const inStock = list.filter((l) => l.status !== 'Consumed')
    return {
      totalLots: list.length,
      bales: list.reduce((sum, l) => sum + l.bales, 0),
      tonnesInStock: inStock.reduce((sum, l) => sum + l.weightKg, 0) / 1000,
      inTesting: list.filter((l) => l.status === 'In Testing').length,
    }
  }, [allLots])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Cotton Lots"
        description="Bale intake register for Indian extra-long staple, Egyptian Cotton and US Pima."
      />

      {allLots === undefined ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </StatGrid>
      ) : (
        <StatGrid>
          <StatCard label="Total lots" value={formatNumber(stats.totalLots)} icon={Layers} />
          <StatCard label="Bales received" value={formatNumber(stats.bales)} icon={Boxes} tone="info" />
          <StatCard
            label="Tonnes in stock"
            value={stats.tonnesInStock.toFixed(1)}
            sublabel="Excludes consumed lots"
            icon={Weight}
            tone="success"
          />
          <StatCard label="Lots in testing" value={formatNumber(stats.inTesting)} icon={FlaskConical} tone="warning" />
        </StatGrid>
      )}

      <Card>
        <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Lot Register</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              HVI and AFIS readings from the Central Testing Laboratory. Select a row for the full profile.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={origin} onValueChange={(v) => setOrigin(v as 'all' | CottonOrigin)}>
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue placeholder="Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All origins</SelectItem>
                {origins.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as 'all' | CottonLot['status'])}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {lotStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={lots ?? []}
            isLoading={isLoading}
            emptyMessage="No cotton lots match these filters."
            onRowClick={(row) => setSelected(row)}
            pageSize={12}
          />
        </CardContent>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader className="pb-3">
            <SheetTitle>{selected?.lotNumber ?? 'Cotton lot'}</SheetTitle>
            <SheetDescription>
              {selected ? `${selected.origin} · ${supplierName(selected.supplierId)}` : null}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-5 px-5 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={originTone[selected.origin]}>{selected.origin}</Badge>
                <StatusBadge status={selected.status} />
              </div>

              <div className="rounded-lg border border-border p-3.5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  USTER HVI readings
                </div>
                <ParamRow label="Micronaire" value={selected.micronaire.toFixed(2)} note="Fibre fineness / maturity" />
                <ParamRow label="Staple length" value={`${selected.staple.toFixed(1)} mm`} note="Upper half mean length" />
                <ParamRow label="Strength" value={`${selected.strength.toFixed(1)} g/tex`} note="Bundle tenacity" />
              </div>

              <div className="rounded-lg border border-border p-3.5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  AFIS PRO-2 &amp; Trash Separator
                </div>
                <ParamRow label="Trash content" value={formatPct(selected.trashPct)} note="Trash Separator" />
                <ParamRow label="Moisture" value={formatPct(selected.moisturePct)} note="Conditioned bale moisture" />
              </div>

              <div className="rounded-lg border border-border p-3.5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intake</div>
                <ParamRow label="Bales" value={formatNumber(selected.bales)} />
                <ParamRow label="Net weight" value={formatKg(selected.weightKg)} />
                <ParamRow label="Supplier" value={supplierName(selected.supplierId)} />
                <ParamRow label="Supplier lot ref" value={selected.supplierLotRef} />
                <ParamRow label="Received" value={formatDate(selected.receivedDate)} />
                <ParamRow label="Warehouse" value={selected.warehouseLocation} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
