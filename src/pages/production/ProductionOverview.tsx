import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format } from 'date-fns'
import { Activity, BarChart3, ClipboardList, Layers, Package, Ruler, X } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/store/appStore'
import {
  getFactories,
  getFactoryPerformance,
  getProductTypeBreakdown,
  getProductionDay,
  getProductionOrders,
  getProductionSummary,
  getProductionTrend,
} from '@/services'
import type { ProductTypeSlice, ProductionTrendPoint } from '@/services/productionService'
import { PageHeader } from '@/components/common/PageHeader'
import { PeriodDropdown } from '@/components/common/PeriodDropdown'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatKg, formatMeters, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FactoryId, ProductType, ProductionOrder } from '@/types'

const factoryIds: FactoryId[] = ['all', 'mill-1', 'mill-2', 'mill-3', 'oe-unit']
const productTypes: ProductType[] = ['Single', 'Double', 'Open End', 'Compact', 'Gassed']

const productColors: Record<ProductType, string> = {
  Single: '#2563eb',
  Double: '#0d9488',
  'Open End': '#d97706',
  Compact: '#7c3aed',
  Gassed: '#db2777',
}

function barColor(pct: number) {
  if (pct >= 95) return 'bg-success-500'
  if (pct >= 85) return 'bg-warning-500'
  return 'bg-danger-500'
}

// ---- Trend chart with a highlighted day ---------------------------------

function TrendChart({
  points,
  unit,
  selectedDate,
  onSelectDate,
}: {
  points: ProductionTrendPoint[]
  unit: 'kg' | 'm'
  selectedDate: string | null
  onSelectDate: (date: string) => void
}) {
  const chartData = points.map((p) => ({
    ...p,
    label: format(new Date(p.date), points.length > 10 ? 'd MMM' : 'EEE d'),
  }))

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Actual vs. Target Output</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daily production ({unit}){selectedDate ? ` · ${formatDate(selectedDate)} highlighted` : ''}
          </p>
        </div>
        <PeriodDropdown />
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No production records in this range.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
                onClick={(state) => {
                  const idx = state?.activeTooltipIndex
                  if (typeof idx === 'number' && chartData[idx]) onSelectDate(chartData[idx].date)
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
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
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    fontSize: 12,
                    background: 'hsl(var(--popover))',
                  }}
                  formatter={(value, name) => [
                    `${Intl.NumberFormat('en-IN').format(Number(value))} ${unit}`,
                    String(name),
                  ]}
                />
                <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]} maxBarSize={36} className="cursor-pointer">
                  {chartData.map((p, i) => (
                    <Cell
                      key={p.date}
                      fill={
                        selectedDate
                          ? p.date === selectedDate
                            ? '#1d4ed8'
                            : '#dbeafe'
                          : i === chartData.length - 1
                            ? '#2563eb'
                            : '#93c5fd'
                      }
                    />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="target" name="Target" stroke="#d97706" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---- Product-type mix with a highlighted slice ---------------------------

function ProductMix({
  data,
  selected,
  onSelect,
}: {
  data: ProductTypeSlice[]
  selected: ProductType | null
  onSelect: (type: ProductType) => void
}) {
  const total = data.reduce((sum, d) => sum + d.qty, 0)

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Product-Type Mix</CardTitle>
        <PeriodDropdown />
      </CardHeader>
      <CardContent>
        {data.length === 0 || total === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No production records in this range.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="qty"
                    nameKey="productType"
                    innerRadius="68%"
                    outerRadius="98%"
                    paddingAngle={2}
                    isAnimationActive={false}
                    className="cursor-pointer"
                    onClick={(entry) => onSelect((entry as unknown as ProductTypeSlice).productType)}
                  >
                    {data.map((slice) => (
                      <Cell
                        key={slice.productType}
                        fill={productColors[slice.productType]}
                        stroke="hsl(var(--card))"
                        opacity={!selected || selected === slice.productType ? 1 : 0.25}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const n = Number(value)
                      return [`${formatNumber(n)} kg-eq (${((n / total) * 100).toFixed(1)}%)`, String(name)]
                    }}
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
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatNumber(total)} kg-eq
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {data.map((slice) => (
                <button
                  key={slice.productType}
                  type="button"
                  onClick={() => onSelect(slice.productType)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left text-xs hover:bg-accent',
                    selected === slice.productType && 'bg-accent ring-1 ring-primary/40',
                    selected && selected !== slice.productType && 'opacity-50',
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: productColors[slice.productType] }} />
                    <span className="font-medium text-foreground">{slice.productType}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{((slice.qty / total) * 100).toFixed(0)}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---- Page ---------------------------------------------------------------

const orderColumns: ColumnDef<ProductionOrder, any>[] = [
  { accessorKey: 'orderNo', header: 'Order No' },
  { accessorKey: 'productName', header: 'Product' },
  { accessorKey: 'productType', header: 'Type' },
  { accessorKey: 'process', header: 'Process' },
  { accessorKey: 'machineCode', header: 'Machine' },
  {
    accessorKey: 'plannedQty',
    header: 'Planned',
    cell: ({ row }) => `${formatNumber(row.original.plannedQty)} ${row.original.unit}`,
  },
  {
    accessorKey: 'producedQty',
    header: 'Produced',
    cell: ({ row }) => `${formatNumber(row.original.producedQty)} ${row.original.unit}`,
  },
  {
    id: 'progress',
    header: 'Progress',
    accessorFn: (row) => (row.plannedQty > 0 ? (row.producedQty / row.plannedQty) * 100 : 0),
    cell: ({ row }) => {
      const pct = row.original.plannedQty > 0 ? Math.round((row.original.producedQty / row.original.plannedQty) * 100) : 0
      return (
        <div className="flex items-center gap-2">
          <Progress value={Math.min(pct, 100)} className="h-1.5 w-16" />
          <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      )
    },
  },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'endDate', header: 'Target Date', cell: ({ row }) => formatDate(row.original.endDate) },
]

export default function ProductionOverview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { factoryId: storeFactoryId, dateRangePreset } = useAppStore()

  const dateParam = searchParams.get('date')
  const rawFactory = searchParams.get('factory')
  const rawProductType = searchParams.get('productType')

  const factoryParam = rawFactory && factoryIds.includes(rawFactory as FactoryId) ? (rawFactory as FactoryId) : null
  const productType =
    rawProductType && productTypes.includes(rawProductType as ProductType) ? (rawProductType as ProductType) : null

  const factoryId: FactoryId = factoryParam ?? storeFactoryId

  const factoriesQuery = useAsync(getFactories, [])
  const summary = useAsync(
    () => getProductionSummary(dateRangePreset, factoryId, productType ?? undefined),
    [dateRangePreset, factoryId, productType],
  )
  const trend = useAsync(() => getProductionTrend(dateRangePreset, factoryId), [dateRangePreset, factoryId])
  const performance = useAsync(() => getFactoryPerformance(dateRangePreset), [dateRangePreset])
  const mix = useAsync(() => getProductTypeBreakdown(dateRangePreset, factoryId), [dateRangePreset, factoryId])
  const orders = useAsync(
    () => getProductionOrders({ factoryId, productType: productType ?? undefined }),
    [factoryId, productType],
  )
  const dayDetail = useAsync(
    () => (dateParam ? getProductionDay(dateParam, factoryId, productType ?? undefined) : Promise.resolve(null)),
    [dateParam, factoryId, productType],
  )

  const factoryName = useMemo(() => {
    const map = new Map((factoriesQuery.data ?? []).map((f) => [f.id as string, f.name]))
    return (id: string) => map.get(id) ?? id
  }, [factoriesQuery.data])

  const visiblePerformance = useMemo(() => {
    const rows = performance.data ?? []
    return factoryId === 'all' ? rows : rows.filter((r) => r.factoryId === factoryId)
  }, [performance.data, factoryId])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const activeFilters = [
    dateParam && { key: 'date', label: `Day: ${formatDate(dateParam)}` },
    factoryParam && { key: 'factory', label: `Unit: ${factoryParam === 'all' ? 'All units' : factoryName(factoryParam)}` },
    productType && { key: 'productType', label: `Product: ${productType}` },
  ].filter(Boolean) as { key: string; label: string }[]

  const scopeLabel = factoryId === 'all' ? 'all five units' : factoryName(factoryId)
  const s = summary.data

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Production Overview"
        description={`Yarn output across ${scopeLabel}${productType ? ` · ${productType} only` : ''}.`}
        actions={<PeriodDropdown />}
      />

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filtered by</span>
          {activeFilters.map((f) => (
            <Badge key={f.key} variant="info" className="gap-1 pr-1">
              {f.label}
              <button
                type="button"
                aria-label={`Clear ${f.key} filter`}
                onClick={() => setParam(f.key, null)}
                className="rounded-full p-0.5 hover:bg-info-50"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {summary.isLoading || !s ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-17 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={3}>
          <StatCard
            label="Yarn output"
            value={formatKg(s.yarnActualKg)}
            sublabel={`Target ${formatKg(s.yarnTargetKg)}`}
            icon={Package}
            tone="info"
          />
          <StatCard
            label="Achievement"
            value={formatPct(s.achievedPct)}
            sublabel={`${formatNumber(s.recordCount)} production records`}
            icon={Activity}
            tone={s.achievedPct >= 95 ? 'success' : s.achievedPct >= 85 ? 'warning' : 'danger'}
          />
          <StatCard
            label="Active production orders"
            value={formatNumber(s.activeOrders)}
            sublabel={`of ${formatNumber(s.totalOrders)} in scope`}
            icon={ClipboardList}
            tone="warning"
            to="/planning/production-orders"
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          {trend.isLoading || !trend.data ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            <TrendChart
              points={trend.data.points}
              unit={trend.data.unit}
              selectedDate={dateParam}
              onSelectDate={(date) => setParam('date', date)}
            />
          )}
        </div>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Unit Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {performance.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            ) : visiblePerformance.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No unit output in this range.</p>
            ) : (
              visiblePerformance.map((f) => (
                <button
                  key={f.factoryId}
                  type="button"
                  onClick={() => setParam('factory', f.factoryId)}
                  className={cn(
                    '-mx-1.5 block w-full rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent',
                    factoryParam === f.factoryId && 'bg-accent ring-1 ring-primary/40',
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{f.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {Math.round(f.achievedPct)}%
                    </span>
                  </div>
                  <Progress value={Math.min(f.achievedPct, 100)} indicatorClassName={barColor(f.achievedPct)} />
                  <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    {formatNumber(f.actual)} / {formatNumber(f.target)} {f.unit}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {mix.isLoading || !mix.data ? (
          <Skeleton className="h-96 w-full rounded-lg" />
        ) : (
          <ProductMix
            data={mix.data}
            selected={productType}
            onSelect={(type) => setParam('productType', type === productType ? null : type)}
          />
        )}
      </div>

      {dateParam && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Day Detail — {formatDate(dateParam)}</CardTitle>
          </CardHeader>
          <CardContent>
            {dayDetail.isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : !dayDetail.data ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No production was recorded on {formatDate(dateParam)} for this scope.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Day totals</div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Yarn</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatKg(dayDetail.data.actualKg)} / {formatKg(dayDetail.data.targetKg)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">By process</div>
                  {dayDetail.data.byProcess.map((p) => (
                    <div key={p.process} className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">{p.process}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {p.actualKg > 0 ? formatKg(p.actualKg) : formatMeters(p.actualM)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">By shift</div>
                  {dayDetail.data.byShift.map((sh) => (
                    <div key={sh.shift} className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Shift {sh.shift}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {sh.actualKg > 0 ? formatKg(sh.actualKg) : formatMeters(sh.actualM)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Production Orders
            {factoryId !== 'all' && ` · ${factoryName(factoryId)}`}
            {productType && ` · ${productType}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={orderColumns}
            data={orders.data ?? []}
            isLoading={orders.isLoading}
            emptyMessage="No production orders match this scope."
            onRowClick={(row) => navigate(`/planning/production-orders?highlight=${row.id}`)}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
