import type { ColumnDef } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banknote, Globe2, Package, Users2 } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getExportSummary, getSalesOrders } from '@/services'
import { formatDate, formatInrCompact, formatNumber } from '@/lib/format'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/tables/DataTable'
import { RiskBadge } from '@/components/tables/RiskBadge'
import type { SalesOrder } from '@/types'

type ExportSummary = Awaited<ReturnType<typeof getExportSummary>>

/** The four export regions published on tmills.com. */
const regionColors: Record<string, string> = {
  America: '#7c4a6e',
  Australia: '#3a7d8c',
  Europe: '#0f6e56',
  'South Asia': '#b4632a',
}

const columns: ColumnDef<SalesOrder, any>[] = [
  {
    accessorKey: 'orderNo',
    header: 'Order No',
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.orderNo}</span>,
  },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'country', header: 'Country' },
  {
    accessorKey: 'region',
    header: 'Region',
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: regionColors[row.original.region ?? ''] ?? '#9aa39b' }}
        />
        {row.original.region ?? '—'}
      </span>
    ),
  },
  { accessorKey: 'productName', header: 'Product' },
  {
    accessorKey: 'qtyOrdered',
    header: 'Qty',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNumber(row.original.qtyOrdered)} {row.original.unit}
      </span>
    ),
  },
  { accessorKey: 'dueDate', header: 'Due', cell: ({ row }) => formatDate(row.original.dueDate) },
  { accessorKey: 'risk', header: 'Risk', cell: ({ row }) => <RiskBadge risk={row.original.risk} /> },
  {
    accessorKey: 'valueInr',
    header: 'Value',
    cell: ({ row }) => <span className="tabular-nums">{formatInrCompact(row.original.valueInr)}</span>,
  },
]

function PublishedProfile({ summary }: { summary: ExportSummary }) {
  const { published } = summary
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-forest-950 via-forest-800 to-brand-700 p-4 text-white shadow-md ring-1 ring-forest-700/40">
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Published export profile</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <div className="num text-2xl font-semibold">{published.exportSharePct}%</div>
          <div className="text-xs text-white/75">of production exported</div>
        </div>
        <div>
          <div className="num text-2xl font-semibold">{published.countries}</div>
          <div className="text-xs text-white/75">countries served</div>
        </div>
        <div>
          <div className="num text-2xl font-semibold">
            US${(published.annualSalesUsd / 1_000_000).toFixed(0)}M+
          </div>
          <div className="text-xs text-white/75">annual sales</div>
        </div>
        <div>
          <div className="num text-2xl font-semibold">{published.regions.length}</div>
          <div className="text-xs text-white/75">regions</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {published.regions.map((region) => (
          <Badge key={region} className="border-white/25 bg-white/15 text-white" variant="outline">
            {region}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function RegionChart({ summary }: { summary: ExportSummary }) {
  const data = summary.byRegion
  const total = data.reduce((sum, r) => sum + r.valueInr, 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Export Value by Region</CardTitle>
        <p className="text-xs text-muted-foreground">Live order book across the four published regions</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 || total === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No export orders on the books.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="region"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(v: number) => Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}
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
                    formatter={(value) => [formatInrCompact(Number(value)), 'Order value']}
                  />
                  <Bar dataKey="valueInr" name="Order value" radius={[4, 4, 0, 0]} maxBarSize={64}>
                    {data.map((r) => (
                      <Cell key={r.region} fill={regionColors[r.region] ?? '#9aa39b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {data.map((r) => (
                <div key={r.region} className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: regionColors[r.region] ?? '#9aa39b' }}
                    />
                    <span className="font-medium text-foreground">{r.region}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.orders} orders · {((r.valueInr / total) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ExportOrders() {
  const { data: summary } = useAsync(() => getExportSummary(), [])
  const { data: orders, isLoading } = useAsync(() => getSalesOrders({ exportOnly: true }), [])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Export Orders"
        description="The export order book — America, Australia, Europe and South Asia."
      />

      {summary === undefined ? <Skeleton className="h-[168px] w-full rounded-xl" /> : <PublishedProfile summary={summary} />}

      {summary === undefined ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </StatGrid>
      ) : (
        <StatGrid>
          <StatCard label="Export orders" value={formatNumber(summary.exportOrderCount)} icon={Package} tone="info" />
          <StatCard
            label="Export order value"
            value={formatInrCompact(summary.exportValueInr)}
            icon={Banknote}
            tone="success"
          />
          <StatCard
            label="Active destinations"
            value={formatNumber(summary.activeCountries)}
            sublabel={`of ${summary.published.countries} countries served`}
            icon={Globe2}
            tone="warning"
          />
          <StatCard label="Export customers" value={formatNumber(summary.exportCustomers)} icon={Users2} />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          {summary === undefined ? (
            <Skeleton className="h-[380px] w-full rounded-lg" />
          ) : (
            <RegionChart summary={summary} />
          )}
        </div>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Export Order Book</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={orders ?? []}
              isLoading={isLoading}
              emptyMessage="No export orders on the books."
              pageSize={12}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
