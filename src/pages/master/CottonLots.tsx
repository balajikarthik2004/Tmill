import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Boxes, FlaskConical, Scale, Sprout, Warehouse } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCottonLots, getSuppliers } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import type { CottonLot, CottonOrigin } from '@/types'

const origins: CottonOrigin[] = ['Indian extra-long staple', 'Egyptian Cotton', 'US Pima']

const lotStatuses: CottonLot['status'][] = ['In Testing', 'Approved', 'In Use', 'Consumed', 'On Hold']

const originColors: Record<CottonOrigin, string> = {
  'Indian extra-long staple': '#2563eb',
  'Egyptian Cotton': '#0d9488',
  'US Pima': '#d97706',
}

const statusVariant: Record<CottonLot['status'], 'warning' | 'success' | 'info' | 'secondary' | 'danger'> = {
  'In Testing': 'warning',
  Approved: 'success',
  'In Use': 'info',
  Consumed: 'secondary',
  'On Hold': 'danger',
}

const ALL = 'all'

function avg(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length
}

function LotDetail({ lot, supplierName }: { lot: CottonLot; supplierName: string }) {
  const hvi: { label: string; value: string; note: string }[] = [
    { label: 'Micronaire', value: lot.micronaire.toFixed(2), note: 'USTER HVI — fineness / maturity' },
    { label: 'Staple length', value: `${lot.staple.toFixed(1)} mm`, note: 'USTER HVI — upper half mean length' },
    { label: 'Strength', value: `${lot.strength.toFixed(1)} g/tex`, note: 'USTER HVI — bundle tenacity' },
    { label: 'Trash', value: formatPct(lot.trashPct, 1), note: 'AFIS PRO-2 / trash separator' },
    { label: 'Moisture', value: formatPct(lot.moisturePct, 1), note: 'Regain at receipt' },
  ]

  const master: { label: string; value: string }[] = [
    { label: 'Lot number', value: lot.lotNumber },
    { label: 'Origin', value: lot.origin },
    { label: 'Supplier', value: supplierName },
    { label: 'Supplier lot reference', value: lot.supplierLotRef },
    { label: 'Bales', value: formatNumber(lot.bales) },
    { label: 'Net weight', value: `${formatNumber(lot.weightKg)} kg` },
    { label: 'Received', value: formatDate(lot.receivedDate) },
    { label: 'Warehouse location', value: lot.warehouseLocation },
    { label: 'Status', value: lot.status },
  ]

  return (
    <div className="space-y-4 px-5 pb-6">
      <div className="rounded-md border border-border">
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
          HVI / AFIS test parameters
        </div>
        <div className="divide-y divide-border">
          {hvi.map((p) => (
            <div key={p.label} className="flex items-start justify-between gap-3 px-3 py-2">
              <div>
                <div className="text-xs font-medium text-foreground">{p.label}</div>
                <div className="text-[11px] text-muted-foreground">{p.note}</div>
              </div>
              <div className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{p.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border">
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Lot record</div>
        <dl className="divide-y divide-border">
          {master.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-3 px-3 py-2">
              <dt className="shrink-0 text-xs text-muted-foreground">{r.label}</dt>
              <dd className="break-all text-right text-xs font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

export default function CottonLots() {
  const [origin, setOrigin] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [selected, setSelected] = useState<CottonLot | null>(null)

  const all = useAsync(() => getCottonLots({}), [])
  const filtered = useAsync(
    () =>
      getCottonLots({
        origin: origin === ALL ? undefined : (origin as CottonOrigin),
        status: status === ALL ? undefined : status,
      }),
    [origin, status],
  )
  const suppliers = useAsync(() => getSuppliers({}), [])

  const supplierNames = useMemo(() => new Map((suppliers.data ?? []).map((s) => [s.id, s.name])), [suppliers.data])

  const data = useMemo(() => all.data ?? [], [all.data])
  const shown = filtered.data ?? []

  const byOrigin = useMemo(
    () =>
      origins
        .map((o) => {
          const lots = data.filter((l) => l.origin === o)
          return {
            origin: o,
            lots: lots.length,
            bales: lots.reduce((s, l) => s + l.bales, 0),
            weightKg: lots.reduce((s, l) => s + l.weightKg, 0),
            micronaire: avg(lots.map((l) => l.micronaire)),
            staple: avg(lots.map((l) => l.staple)),
            strength: avg(lots.map((l) => l.strength)),
            trashPct: avg(lots.map((l) => l.trashPct)),
            moisturePct: avg(lots.map((l) => l.moisturePct)),
          }
        })
        .filter((o) => o.lots > 0),
    [data],
  )

  const totalWeight = data.reduce((s, l) => s + l.weightKg, 0)
  const totalBales = data.reduce((s, l) => s + l.bales, 0)
  const inTesting = data.filter((l) => l.status === 'In Testing').length
  const approved = data.filter((l) => l.status === 'Approved' || l.status === 'In Use').length
  const onHold = data.filter((l) => l.status === 'On Hold').length

  const columns = useMemo<ColumnDef<CottonLot, any>[]>(
    () => [
      {
        accessorKey: 'lotNumber',
        header: 'Lot No',
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.lotNumber}</span>,
      },
      {
        accessorKey: 'origin',
        header: 'Origin',
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: originColors[row.original.origin] }} />
            {row.original.origin}
          </span>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        accessorFn: (l) => supplierNames.get(l.supplierId) ?? l.supplierId,
        cell: ({ row }) => supplierNames.get(row.original.supplierId) ?? row.original.supplierId,
      },
      { accessorKey: 'supplierLotRef', header: 'Supplier Ref' },
      {
        accessorKey: 'bales',
        header: 'Bales',
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.bales)}</span>,
      },
      {
        accessorKey: 'weightKg',
        header: 'Weight',
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.weightKg)} kg</span>,
      },
      {
        accessorKey: 'micronaire',
        header: 'Mic',
        cell: ({ row }) => <span className="tabular-nums">{row.original.micronaire.toFixed(2)}</span>,
      },
      {
        accessorKey: 'staple',
        header: 'Staple',
        cell: ({ row }) => <span className="tabular-nums">{row.original.staple.toFixed(1)} mm</span>,
      },
      {
        accessorKey: 'strength',
        header: 'Strength',
        cell: ({ row }) => <span className="tabular-nums">{row.original.strength.toFixed(1)} g/tex</span>,
      },
      {
        accessorKey: 'trashPct',
        header: 'Trash',
        cell: ({ row }) => <span className="tabular-nums">{formatPct(row.original.trashPct, 1)}</span>,
      },
      {
        accessorKey: 'moisturePct',
        header: 'Moisture',
        cell: ({ row }) => <span className="tabular-nums">{formatPct(row.original.moisturePct, 1)}</span>,
      },
      {
        accessorKey: 'receivedDate',
        header: 'Received',
        cell: ({ row }) => formatDate(row.original.receivedDate),
      },
      { accessorKey: 'warehouseLocation', header: 'Location' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} variant={statusVariant[row.original.status]} />,
      },
    ],
    [supplierNames],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Cotton Lots"
        description="Lot master for Indian extra-long staple, Egyptian Cotton and US Pima, with the HVI and AFIS readings taken in the Central Testing Laboratory."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All origins" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All origins</SelectItem>
                {origins.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {lotStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <StatCard label="Cotton lots" value={formatNumber(data.length)} sublabel="On the lot master" icon={Sprout} />
          <StatCard label="Bales" value={formatNumber(totalBales)} sublabel="Across all lots" icon={Boxes} />
          <StatCard
            label="Net weight"
            value={`${formatNumber(Math.round(totalWeight / 1000))} MT`}
            sublabel={`${formatNumber(totalWeight)} kg`}
            icon={Scale}
          />
          <StatCard label="In testing" value={formatNumber(inTesting)} sublabel="Awaiting HVI / AFIS clearance" icon={FlaskConical} tone="warning" />
          <StatCard label="Approved or in use" value={formatNumber(approved)} sublabel="Cleared for the blow room" icon={Warehouse} tone="success" />
          <StatCard label="On hold" value={formatNumber(onHold)} sublabel="Quarantined pending review" icon={FlaskConical} tone="danger" />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lot Weight by Origin</CardTitle>
          </CardHeader>
          <CardContent>
            {all.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : byOrigin.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No cotton lots on the master.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byOrigin}
                        dataKey="weightKg"
                        nameKey="origin"
                        innerRadius="68%"
                        outerRadius="98%"
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {byOrigin.map((o) => (
                          <Cell key={o.origin} fill={originColors[o.origin]} stroke="hsl(var(--card))" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${formatNumber(Number(value))} kg`, String(name)]}
                        contentStyle={{
                          borderRadius: 8,
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
                      {formatNumber(Math.round(totalWeight / 1000))} MT
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {byOrigin.map((o) => (
                    <div key={o.origin} className="flex items-center justify-between gap-2 px-1.5 py-1 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: originColors[o.origin] }} />
                        <span className="truncate font-medium text-foreground">{o.origin}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatNumber(o.lots)} lots · {formatPct((o.weightKg / totalWeight) * 100, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Average Fibre Parameters by Origin</CardTitle>
            <p className="text-xs text-muted-foreground">
              Mean USTER HVI and AFIS PRO-2 readings recorded against each cotton type.
            </p>
          </CardHeader>
          <CardContent>
            {all.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : byOrigin.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No fibre readings recorded.
              </div>
            ) : (
              <div className="scrollbar-thin overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      {['Origin', 'Lots', 'Bales', 'Micronaire', 'Staple', 'Strength', 'Trash', 'Moisture'].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byOrigin.map((o) => (
                      <tr key={o.origin} className="border-t border-border">
                        <td className="whitespace-nowrap px-3.5 py-2.5">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: originColors[o.origin] }} />
                            <span className="font-medium text-foreground">{o.origin}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 tabular-nums text-foreground">{formatNumber(o.lots)}</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 tabular-nums text-foreground">{formatNumber(o.bales)}</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 tabular-nums text-foreground">{o.micronaire.toFixed(2)}</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 tabular-nums text-foreground">{o.staple.toFixed(1)} mm</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 tabular-nums text-foreground">{o.strength.toFixed(1)} g/tex</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 tabular-nums text-foreground">{formatPct(o.trashPct, 1)}</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 tabular-nums text-foreground">{formatPct(o.moisturePct, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Cotton Lot Master</CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatNumber(shown.length)} of {formatNumber(data.length)} lots
            {origin !== ALL && ` · ${origin}`}
            {status !== ALL && ` · ${status}`}
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={shown}
            isLoading={filtered.isLoading || suppliers.isLoading}
            emptyMessage="No cotton lots match this filter."
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
                <SheetTitle>{selected.lotNumber}</SheetTitle>
                <SheetDescription>
                  {selected.origin} · {formatNumber(selected.bales)} bales · received {formatDate(selected.receivedDate)}
                </SheetDescription>
              </SheetHeader>
              <div className="px-5 pb-3">
                <Badge variant={statusVariant[selected.status]}>{selected.status}</Badge>
              </div>
              <LotDetail
                lot={selected}
                supplierName={supplierNames.get(selected.supplierId) ?? selected.supplierId}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
