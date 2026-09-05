import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertCircle, Box, IndianRupee, Package, RefreshCw } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFacilityStock, getInventorySummary, getInventoryValuation } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatInrCompact, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const chartTooltipStyle = {
  borderRadius: 12,
  boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  background: 'hsl(var(--popover))',
}

/** Chart axes read better in crores than in raw rupees. */
function toCrore(value: number) {
  return value / 10_000_000
}

/** Colour per category, used by the breakdown rows under the chart. */
const categoryColour: Record<string, string> = {
  'Raw Cotton': '#0f6e56',
  WIP: '#3a7d8c',
  'Finished Yarn': '#b4632a',
}

export function InventoryDashboard() {
  const summary = useAsync(getInventorySummary, [])
  const valuation = useAsync(getInventoryValuation, [])
  const facilities = useAsync(getFacilityStock, [])

  const stock = useMemo(() => summary.data ?? [], [summary.data])

  const rawCotton = stock.find((s) => s.category === 'Raw Cotton')
  const finishedYarn = stock.find((s) => s.category === 'Finished Yarn')
  const belowReorder = stock.filter((s) => s.belowReorder)

  /**
   * Annualised turnover: yearly consumption against the stock standing today.
   * Raw cotton cover is the closest proxy the mock carries for consumption rate.
   */
  const turnover = rawCotton?.daysOfStock ? 365 / rawCotton.daysOfStock : 0

  const chartData = useMemo(
    () =>
      (valuation.data?.trend ?? []).map((point) => ({
        date: new Date(point.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        value: toCrore(point.totalInr),
      })),
    [valuation.data],
  )

  const isLoading = summary.isLoading || valuation.isLoading

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Inventory Overview"
        description="Stock position and standing value from raw cotton through to finished yarn."
      />


      {/* Headline figures */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Raw Cotton</CardTitle>
                <Package className="h-4 w-4 text-brand-600" />
              </CardHeader>
              <CardContent>
                <div className="num text-2xl font-semibold">
                  {formatNumber(rawCotton?.currentQty ?? 0)} {rawCotton?.unit}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rawCotton?.daysOfStock ?? 0} days of cover
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Finished Yarn</CardTitle>
                <Box className="h-4 w-4 text-brand-600" />
              </CardHeader>
              <CardContent>
                <div className="num text-2xl font-semibold">
                  {formatNumber(finishedYarn?.currentQty ?? 0)} {finishedYarn?.unit}
                </div>
                <p
                  className={cn(
                    'mt-1 text-xs',
                    finishedYarn?.belowReorder ? 'text-danger-600' : 'text-muted-foreground',
                  )}
                >
                  {finishedYarn?.belowReorder
                    ? `Below the ${formatNumber(finishedYarn.reorderLevel)} ${finishedYarn.unit} reorder level`
                    : `${finishedYarn?.daysOfStock ?? 0} days of cover`}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card
              className={cn(
                'glass-card',
                belowReorder.length > 0 && 'border-warning-100 bg-warning-50/40',
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle
                  className={cn('text-sm font-medium', belowReorder.length > 0 && 'text-warning-700')}
                >
                  Reorder Alerts
                </CardTitle>
                <AlertCircle
                  className={cn('h-4 w-4', belowReorder.length > 0 ? 'text-warning-600' : 'text-brand-600')}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'num text-2xl font-semibold',
                    belowReorder.length > 0 && 'text-warning-700',
                  )}
                >
                  {belowReorder.length}
                </div>
                <p
                  className={cn(
                    'mt-1 text-xs',
                    belowReorder.length > 0 ? 'text-warning-600' : 'text-muted-foreground',
                  )}
                >
                  {belowReorder.length > 0
                    ? belowReorder.map((b) => b.category).join(', ')
                    : 'Every category above its reorder level'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Turnover</CardTitle>
                <RefreshCw className="h-4 w-4 text-brand-600" />
              </CardHeader>
              <CardContent>
                <div className="num text-2xl font-semibold">{turnover.toFixed(1)}x</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Annualised on {rawCotton?.daysOfStock ?? 0} days of cotton cover
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Valuation */}
        <Card className="glass-card lg:col-span-4">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Inventory Valuation</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Standing stock at standard rates, last 30 days
                </p>
              </div>
              {valuation.data && (
                <div className="text-right">
                  <div className="num text-xl font-semibold text-foreground">
                    {formatInrCompact(valuation.data.totalInr)}
                  </div>
                  <div
                    className={cn(
                      'text-[11px] font-semibold',
                      valuation.data.changePct >= 0 ? 'text-success-700' : 'text-danger-600',
                    )}
                  >
                    {valuation.data.changePct >= 0 ? '+' : ''}
                    {valuation.data.changePct.toFixed(1)}% over the period
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {valuation.isLoading || !valuation.data ? (
              <Skeleton className="h-65 w-full" />
            ) : (
              <>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fill-valuation" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f6e56" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#0f6e56" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        interval={6}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tickFormatter={(v: number) => `₹${v.toFixed(0)}Cr`}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value) => [`₹${Number(value).toFixed(2)} Cr`, 'Stock value']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Stock value"
                        stroke="#0f6e56"
                        strokeWidth={2}
                        fill="url(#fill-valuation)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Valuation breakdown */}
                <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {valuation.data.rows.map((row) => {
                    const colour = categoryColour[row.category] ?? '#0f6e56'
                    return (
                      <div key={row.category} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: colour }}
                        />
                        <span className="font-medium text-foreground">{row.category}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {formatNumber(row.qty)} {row.unit} @ ₹{row.ratePerUnitInr}/kg
                        </span>
                        {row.belowReorder && (
                          <span className="shrink-0 rounded-full bg-danger-50 px-1.5 py-px text-[9.5px] font-semibold text-danger-700">
                            below reorder
                          </span>
                        )}
                        <span className="num ml-auto shrink-0 font-semibold text-foreground">
                          {formatInrCompact(row.valueInr)}
                        </span>
                        <span className="num w-10 shrink-0 text-right text-[11px] text-muted-foreground">
                          {formatPct(row.sharePct, 0)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-2 border-t border-border pt-1.5 text-xs">
                    <IndianRupee className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold text-foreground">Total tied up</span>
                    <span className="num ml-auto font-semibold text-foreground">
                      {formatInrCompact(valuation.data.totalInr)}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">
                    Roughly {formatInrCompact(valuation.data.valuePerDayOfCoverInr)} of working capital
                    per day of stock cover held.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Facility split */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader>
            <CardTitle>Stock by Facility</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tonnage standing against godown capacity at each unit
            </p>
          </CardHeader>
          <CardContent>
            {facilities.isLoading || !facilities.data ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {facilities.data.map((facility, i) => (
                  <div key={facility.factoryId} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium leading-none text-foreground">
                        {facility.factoryName}
                      </p>
                      <p className="num shrink-0 text-sm text-muted-foreground">
                        {formatPct(facility.utilisationPct, 0)}
                      </p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${facility.utilisationPct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                        className={cn(
                          'h-full rounded-full',
                          facility.utilisationPct >= 90
                            ? 'bg-danger-500'
                            : facility.utilisationPct >= 75
                              ? 'bg-warning-500'
                              : 'bg-brand-500',
                        )}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatNumber(facility.stockMt)} of {formatNumber(facility.capacityMt)} MT capacity
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
