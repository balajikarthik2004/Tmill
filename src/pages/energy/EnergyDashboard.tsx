import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  Droplets,
  Factory,
  Gauge,
  IndianRupee,
  Leaf,
  Recycle,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Waves,
  Wind,
  Zap,
} from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/store/appStore'
import {
  getEnergyComparison,
  getEnergyLosses,
  getEnergyTrend,
  getEnergyUsage,
  getWaterUsage,
} from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { PeriodDropdown } from '@/components/common/PeriodDropdown'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatInrCompact, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AiInsightStrip } from '@/components/ai/AiInsightStrip'

const chartTooltipStyle = {
  borderRadius: 12,
  boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  background: 'hsl(var(--popover))',
}

const sourceColor: Record<string, string> = {
  'Captive Wind': '#0f6e56',
  Solar: '#b4632a',
  'Grid (TANGEDCO)': '#3a7d8c',
  'Diesel Genset': '#b23a2f',
  Borewell: '#3a7d8c',
  'Municipal (TWAD)': '#7c4a6e',
  'Rainwater harvested': '#4a8a3c',
  'Recycled (STP)': '#0f6e56',
}

function formatKwh(value: number) {
  if (Math.abs(value) >= 100_000) return `${(value / 1000).toFixed(0)}k kWh`
  return `${formatNumber(Math.round(value))} kWh`
}

function formatKl(value: number) {
  return `${formatNumber(Math.round(value))} kL`
}

/**
 * A change against the previous period. `goodWhenDown` is true for anything we
 * want to see falling — consumption, intensity, cost, emissions.
 */
function Delta({
  value,
  goodWhenDown = true,
  suffix = '%',
}: {
  value: number
  goodWhenDown?: boolean
  suffix?: string
}) {
  if (Math.abs(value) < 0.05) {
    return <span className="text-[11px] font-medium text-muted-foreground">no change</span>
  }
  const rising = value > 0
  const good = goodWhenDown ? !rising : rising
  const Icon = rising ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-semibold',
        good ? 'text-success-700' : 'text-danger-700',
      )}
    >
      <Icon className="h-3 w-3" />
      {rising ? '+' : ''}
      {value.toFixed(1)}
      {suffix}
    </span>
  )
}

/** A labelled horizontal bar — used wherever a share reads better than a pie. */
function ShareBar({
  label,
  value,
  sharePct,
  color,
  sub,
  right,
}: {
  label: string
  value: string
  sharePct: number
  color: string
  sub?: string
  right?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {value} · {formatPct(sharePct, 0)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, sharePct)}%`, background: color }}
        />
      </div>
      {(sub || right) && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{sub}</span>
          {right}
        </div>
      )}
    </div>
  )
}

const severityBadge = { high: 'danger', medium: 'warning', low: 'secondary' } as const

export function EnergyDashboard() {
  const { factoryId, dateRangePreset } = useAppStore()

  const usage = useAsync(() => getEnergyUsage(dateRangePreset, factoryId), [dateRangePreset, factoryId])
  const losses = useAsync(() => getEnergyLosses(dateRangePreset, factoryId), [dateRangePreset, factoryId])
  const comparison = useAsync(() => getEnergyComparison(dateRangePreset), [dateRangePreset])
  const trend = useAsync(() => getEnergyTrend(dateRangePreset, factoryId), [dateRangePreset, factoryId])
  const water = useAsync(() => getWaterUsage(dateRangePreset, factoryId), [dateRangePreset, factoryId])

  const o = usage.data?.overview
  const w = water.data

  const trendData = useMemo(
    () =>
      (trend.data ?? []).map((p) => ({
        ...p,
        label: formatDate(p.date, 'dd MMM'),
      })),
    [trend.data],
  )

  const waterTrendData = useMemo(
    () =>
      (w?.trend ?? []).map((p) => ({
        ...p,
        label: formatDate(p.date, 'dd MMM'),
      })),
    [w?.trend],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Energy & Resource Management"
        description="What the mills draw, where it goes, what never reaches yarn, and which unit moved against last period."
        actions={<PeriodDropdown />}
      />

      <AiInsightStrip scope="energy" limit={3} />

      {/* ---- Headline ----------------------------------------------------- */}
      {usage.isLoading || !o ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={5}>
          <StatCard
            label="Energy drawn"
            value={formatKwh(o.totalKwh)}
            sublabel={`${o.avgLoadMw} MW average · ${o.peakLoadMw} MW peak`}
            icon={Zap}
            tone="info"
          />
          <StatCard
            label="Energy per kg of yarn"
            value={`${o.secKwhPerKg} kWh/kg`}
            sublabel={`was ${o.secPrev} last period`}
            icon={Gauge}
            tone={o.secChangePct > 2 ? 'danger' : o.secChangePct < -2 ? 'success' : 'default'}
          />
          <StatCard
            label="Water per kg of yarn"
            value={w ? `${w.overview.litresPerKg} L/kg` : '—'}
            sublabel={w ? `${formatKl(w.overview.totalKl)} drawn in the period` : ''}
            icon={Droplets}
            tone="info"
          />
          <StatCard
            label="Renewable share"
            value={formatPct(o.renewableSharePct, 0)}
            sublabel={`wind + solar · was ${formatPct(o.renewableSharePrevPct, 0)}`}
            icon={Wind}
            tone="success"
          />
          <StatCard
            label="Energy bill"
            value={formatInrCompact(o.costInr)}
            sublabel={`₹${o.energyCostPerKgInr}/kg at ₹${o.blendedRateInrPerKwh}/kWh blended`}
            icon={IndianRupee}
            tone="warning"
          />
        </StatGrid>
      )}

      <Tabs defaultValue="usage">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="usage">What we use</TabsTrigger>
          <TabsTrigger value="losses">Where it is lost</TabsTrigger>
          <TabsTrigger value="units">Which unit, and why</TabsTrigger>
          <TabsTrigger value="water">Water in detail</TabsTrigger>
        </TabsList>

        {/* =================== 1. WHAT WE USE =============================== */}
        <TabsContent value="usage" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Where the power comes from</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Captive wind and solar are cheaper and near-zero carbon; the grid and the gensets are
                  what cost money and emissions.
                </p>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {usage.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  (usage.data?.bySource ?? []).map((s) => (
                    <ShareBar
                      key={s.source}
                      label={s.source}
                      value={formatKwh(s.kwh)}
                      sharePct={s.sharePct}
                      color={sourceColor[s.source] ?? '#9aa39b'}
                      sub={`₹${s.tariffInrPerKwh}/kWh · ${formatInrCompact(s.costInr)}`}
                      right={
                        s.isRenewable ? (
                          <Badge variant="success">renewable</Badge>
                        ) : (
                          <span className="tabular-nums">{formatNumber(Math.round(s.co2Kg / 1000))} t CO₂e</span>
                        )
                      }
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Where the power goes inside the mill</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Measured against the share a well-run spinning mill would hold each end use to. A
                  positive gap is where the money is leaking.
                </p>
              </CardHeader>
              <CardContent>
                {usage.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="scrollbar-thin overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="py-2 pr-3 font-semibold">End use</th>
                          <th className="py-2 pr-3 font-semibold">Energy</th>
                          <th className="py-2 pr-3 font-semibold">Share</th>
                          <th className="py-2 pr-3 font-semibold">Benchmark</th>
                          <th className="py-2 pr-3 font-semibold">Gap</th>
                          <th className="py-2 font-semibold">Per kg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(usage.data?.byEndUse ?? []).map((u) => (
                          <tr key={u.endUse} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pr-3 font-medium text-foreground">{u.endUse}</td>
                            <td className="py-2 pr-3 tabular-nums">{formatKwh(u.kwh)}</td>
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-2">
                                <Progress value={u.sharePct} className="h-1.5 w-14" />
                                <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
                                  {formatPct(u.sharePct, 0)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                              {formatPct(u.benchmarkSharePct, 0)}
                            </td>
                            <td className="py-2 pr-3">
                              {u.gapPts > 0.3 ? (
                                <Badge variant="warning">+{u.gapPts.toFixed(1)} pts</Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">on benchmark</span>
                              )}
                            </td>
                            <td className="py-2 tabular-nums text-muted-foreground">{u.perKg} kWh</td>
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
            <CardHeader>
              <CardTitle>Every resource the mills consume</CardTitle>
              <p className="text-xs text-muted-foreground">
                Absolute volume tells you little on its own — the per-kilogram column is what to watch,
                because it holds steady when the only thing that changed is how much yarn we made.
              </p>
            </CardHeader>
            <CardContent>
              {usage.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(usage.data?.resources ?? []).map((r) => (
                    <div key={r.resource} className="rounded-xl border border-border bg-secondary/30 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{r.resource}</span>
                        <Delta value={r.changePct} />
                      </div>
                      <div className="num mt-1 text-lg font-semibold text-foreground">
                        {formatNumber(r.value)}{' '}
                        <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-copper-700">
                        {r.perKg} {r.perKgUnit}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{r.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily draw and intensity</CardTitle>
              <p className="text-xs text-muted-foreground">
                Renewable and bought power stacked by day. The dips are Sundays, when output falls but the
                humidification plant keeps running — which is why energy per kilogram climbs on light days.
              </p>
            </CardHeader>
            <CardContent>
              {trend.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={28}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={64}
                        tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value, name) => [formatKwh(Number(value)), String(name)]}
                      />
                      <Area
                        type="monotone"
                        dataKey="renewableKwh"
                        name="Wind & solar"
                        stackId="1"
                        stroke="#0f6e56"
                        fill="#0f6e56"
                        fillOpacity={0.35}
                      />
                      <Area
                        type="monotone"
                        dataKey="gridKwh"
                        name="Grid & diesel"
                        stackId="1"
                        stroke="#b4632a"
                        fill="#b4632a"
                        fillOpacity={0.28}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== 2. WHERE IT IS LOST ========================== */}
        <TabsContent value="losses" className="space-y-4 pt-4">
          {losses.isLoading || !losses.data ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            ((report) => (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Energy that never reaches yarn"
                  value={formatKwh(report.totalLossKwh)}
                  sublabel={`${formatPct(report.totalLossSharePct, 1)} of everything drawn`}
                  icon={TriangleAlert}
                  tone="danger"
                />
                <StatCard
                  label="Cost of that waste"
                  value={formatInrCompact(report.totalLossInr)}
                  sublabel="at the blended tariff"
                  icon={IndianRupee}
                  tone="warning"
                />
                <StatCard
                  label="Realistically recoverable"
                  value={formatInrCompact(report.recoverableInr)}
                  sublabel={`${formatKwh(report.recoverableKwh)} with the fixes below`}
                  icon={Leaf}
                  tone="success"
                />
                <StatCard
                  label="Intensity if recovered"
                  value={`${report.secIfRecovered} kWh/kg`}
                  sublabel={`from ${report.secToday} today`}
                  icon={Gauge}
                  tone="success"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Where the energy is going to waste</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Each line is calculated from the plant's own meters and machine registry against a
                    published industry coefficient — not assumed. Ordered by size.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.losses.map((l) => (
                    <div key={l.category} className="rounded-xl border border-border p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{l.category}</span>
                          <Badge variant={severityBadge[l.severity]}>{l.severity}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="num text-sm font-semibold text-foreground">
                            {formatKwh(l.kwh)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatPct(l.sharePct, 1)} of draw · {formatInrCompact(l.costInr)}
                          </div>
                        </div>
                      </div>

                      <Progress
                        value={Math.min(100, (l.kwh / report.totalLossKwh) * 100)}
                        className="mt-2.5"
                        indicatorClassName={
                          l.severity === 'high'
                            ? 'bg-danger-500'
                            : l.severity === 'medium'
                              ? 'bg-warning-500'
                              : 'bg-muted-foreground/40'
                        }
                      />

                      <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">{l.cause}</p>
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-success-50 p-2.5">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-700" />
                        <p className="text-[11px] leading-relaxed text-success-800">
                          {l.action}{' '}
                          <span className="font-semibold">
                            Recovers about {formatInrCompact(l.recoverableInr)} ({l.recoverablePct}%).
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
            ))(losses.data)
          )}
        </TabsContent>

        {/* =================== 3. WHICH UNIT, AND WHY ======================= */}
        <TabsContent value="units" className="space-y-4 pt-4">
          {comparison.isLoading || !comparison.data ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            <>
              <Card className="border-copper-100 bg-copper-50/50">
                <CardContent className="flex items-start gap-3 py-4">
                  <Factory className="mt-0.5 h-5 w-5 shrink-0 text-copper-600" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{comparison.data.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Group consumption moved {formatNumber(Math.abs(comparison.data.groupChangeKwh))} kWh
                      against the previous period.{' '}
                      {formatNumber(Math.abs(comparison.data.groupVolumeEffectKwh))} kWh of that is simply
                      making {comparison.data.groupVolumeEffectKwh >= 0 ? 'more' : 'less'} yarn — it is not
                      a problem. The{' '}
                      {formatNumber(Math.abs(comparison.data.groupEfficiencyEffectKwh))} kWh of efficiency
                      movement is the part worth acting on.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {comparison.data.units.map((u) => (
                <Card key={u.factoryId}>
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle>{u.name}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">{u.verdict}</p>
                      </div>
                      <Badge
                        variant={u.status === 'worse' ? 'danger' : u.status === 'better' ? 'success' : 'secondary'}
                      >
                        {u.status === 'worse'
                          ? 'less efficient'
                          : u.status === 'better'
                            ? 'more efficient'
                            : 'steady'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        {
                          label: 'Energy drawn',
                          value: formatKwh(u.kwh),
                          delta: <Delta value={u.kwhChangePct} />,
                        },
                        {
                          label: 'Yarn made',
                          value: `${formatNumber(u.outputKg)} kg`,
                          delta: <Delta value={u.outputChangePct} goodWhenDown={false} />,
                        },
                        {
                          label: 'Energy per kg',
                          value: `${u.sec} kWh/kg`,
                          delta: <Delta value={u.secChangePct} />,
                        },
                        {
                          label: 'Share of group',
                          value: formatPct(u.sharePct, 0),
                          delta: null,
                        },
                      ].map((m) => (
                        <div key={m.label} className="rounded-lg border border-border bg-secondary/30 p-2.5">
                          <div className="text-[11px] text-muted-foreground">{m.label}</div>
                          <div className="num mt-0.5 text-sm font-semibold text-foreground">{m.value}</div>
                          {m.delta}
                        </div>
                      ))}
                    </div>

                    {/* The split that answers "why". */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border p-3">
                        <div className="text-[11px] font-medium text-muted-foreground">
                          Because we made a different quantity
                        </div>
                        <div className="num mt-0.5 text-base font-semibold text-foreground">
                          {u.volumeEffectKwh >= 0 ? '+' : ''}
                          {formatNumber(u.volumeEffectKwh)} kWh
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          Expected, and not a fault — more kilograms cost more power.
                        </p>
                      </div>
                      <div
                        className={cn(
                          'rounded-lg border p-3',
                          u.efficiencyEffectKwh > 0
                            ? 'border-danger-100 bg-danger-50'
                            : 'border-success-100 bg-success-50',
                        )}
                      >
                        <div className="text-[11px] font-medium text-muted-foreground">
                          Because efficiency moved
                        </div>
                        <div
                          className={cn(
                            'num mt-0.5 text-base font-semibold',
                            u.efficiencyEffectKwh > 0 ? 'text-danger-700' : 'text-success-700',
                          )}
                        >
                          {u.efficiencyEffectKwh >= 0 ? '+' : ''}
                          {formatNumber(u.efficiencyEffectKwh)} kWh
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          This is the part management can actually change.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border pt-3">
                      <div className="section-label text-[10px] uppercase tracking-wider text-copper-600">
                        What drove the efficiency change
                      </div>
                      {u.drivers.map((d) => (
                        <div key={d.label} className="flex items-start gap-3">
                          <div className="w-32 shrink-0">
                            <div className="text-xs font-medium text-foreground">{d.label}</div>
                            <div
                              className={cn(
                                'text-[11px] font-semibold tabular-nums',
                                d.kwh > 0 ? 'text-danger-700' : 'text-success-700',
                              )}
                            >
                              {d.kwh >= 0 ? '+' : ''}
                              {formatNumber(d.kwh)} kWh
                            </div>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">{d.detail}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* =================== 4. WATER IN DETAIL =========================== */}
        <TabsContent value="water" className="space-y-4 pt-4">
          {water.isLoading || !w ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            <>
              <Card className="border-info-100 bg-info-50/40">
                <CardContent className="flex items-start gap-3 py-4">
                  <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-info-600" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{w.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      A spinning mill has no dyeing, so there is no process effluent. Nearly half the water
                      evaporates into the spinning halls to hold 55% relative humidity — cotton will not
                      spin in dry air — and most of the rest is the domestic load of a 1,600-person site.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <StatGrid cols={6}>
                <StatCard
                  label="Water drawn"
                  value={formatKl(w.overview.totalKl)}
                  sublabel={`${formatNumber(w.overview.avgDailyKl)} kL a day · peak ${formatNumber(w.overview.peakDailyKl)}`}
                  icon={Droplets}
                  tone="info"
                />
                <StatCard
                  label="Litres per kg of yarn"
                  value={`${w.overview.litresPerKg} L/kg`}
                  sublabel={`was ${w.overview.litresPerKgPrev} last period`}
                  icon={Gauge}
                  tone={
                    w.overview.intensityChangePct > 2
                      ? 'danger'
                      : w.overview.intensityChangePct < -2
                        ? 'success'
                        : 'default'
                  }
                />
                <StatCard
                  label="Fresh abstraction"
                  value={formatKl(w.overview.freshIntakeKl)}
                  sublabel="borewell + municipal, net of reuse"
                  icon={Waves}
                  tone="warning"
                />
                <StatCard
                  label="Recycled through STP"
                  value={formatPct(w.overview.recycledSharePct, 0)}
                  sublabel={`${formatKl(w.balance.recycledKl)} put back to work`}
                  icon={Recycle}
                  tone="success"
                />
                <StatCard
                  label="Rainwater harvested"
                  value={formatKl(w.overview.rainwaterKl)}
                  sublabel={`${formatPct(w.overview.sustainableSharePct, 0)} of supply is rain or reuse`}
                  icon={Leaf}
                  tone="success"
                />
                <StatCard
                  label="Water bill"
                  value={formatInrCompact(w.overview.costInr)}
                  sublabel={`₹${w.overview.costPerKgInr}/kg of yarn`}
                  icon={IndianRupee}
                  tone="default"
                />
              </StatGrid>

              {/* ---- Balance ------------------------------------------------ */}
              <Card>
                <CardHeader>
                  <CardTitle>The water balance — every litre accounted for</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Read left to right. What is pumped either leaks before it arrives or reaches a use;
                    what reaches a use either evaporates or goes down a drain; what goes down the drain is
                    partly recovered by the sewage plant and sent back round.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
                    {[
                      {
                        label: 'Pumped',
                        value: formatKl(w.balance.pumpedIntakeKl),
                        note: 'everything lifted from borewell, mains, rain tanks and the STP',
                        tone: 'text-foreground',
                      },
                      {
                        label: 'Never delivered',
                        value: formatKl(w.balance.neverDeliveredKl),
                        note: 'lost to leaks and tank overflow before reaching any use',
                        tone: 'text-danger-700',
                      },
                      {
                        label: 'Reaches a use',
                        value: formatKl(w.balance.totalAppliedKl),
                        note: 'humidification, cooling, taps and hoses',
                        tone: 'text-foreground',
                      },
                      {
                        label: 'Evaporates',
                        value: formatKl(w.balance.evaporatedKl),
                        note: 'into the halls and the cooling towers — never recoverable',
                        tone: 'text-copper-700',
                      },
                      {
                        label: 'To drain',
                        value: formatKl(w.balance.dischargedKl),
                        note: `of which ${formatKl(w.balance.recoveredByStpKl)} is recovered by the STP`,
                        tone: 'text-success-700',
                      },
                    ].map((step, i) => (
                      <div key={step.label} className="flex flex-1 items-center gap-2">
                        {i > 0 && (
                          <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 lg:block" />
                        )}
                        <div className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                          <div className="section-label text-[10px] uppercase tracking-wider text-copper-600">
                            {step.label}
                          </div>
                          <div className={cn('num mt-0.5 text-sm font-semibold', step.tone)}>
                            {step.value}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {step.note}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {/* ---- Where water goes ------------------------------------ */}
                <Card>
                  <CardHeader>
                    <CardTitle>Where the water goes</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Uses marked as evaporating are gone for good — no amount of treatment brings them
                      back, so the only lever there is using less.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {w.byUse.map((u) => (
                      <div key={u.use} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            {u.use}
                            {u.isConsumptive && <Badge variant="copper">evaporates</Badge>}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatKl(u.kl)} · {formatPct(u.sharePct, 0)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              u.isConsumptive ? 'bg-copper-500' : 'bg-info-500',
                            )}
                            style={{ width: `${Math.min(100, u.sharePct)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-copper-700">{u.litresPerKg} L per kg</span>
                          <Delta value={u.changePct} />
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{u.note}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* ---- Where water comes from ------------------------------ */}
                <Card>
                  <CardHeader>
                    <CardTitle>Where the water comes from</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Municipal supply costs nearly four times what the borewell does, so every kilolitre
                      shifted to rain or reuse takes cost and groundwater draw out together.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3.5">
                    {w.bySource.map((s) => (
                      <ShareBar
                        key={s.source}
                        label={s.source}
                        value={formatKl(s.kl)}
                        sharePct={s.sharePct}
                        color={sourceColor[s.source] ?? '#9aa39b'}
                        sub={`₹${s.tariffInrPerKl}/kL · ${formatInrCompact(s.costInr)}`}
                        right={
                          s.isSustainable ? (
                            <Badge variant="success">
                              {s.source === 'Recycled (STP)' ? 'reuse' : 'harvested'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">fresh draw</Badge>
                          )
                        }
                      />
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* ---- Per unit -------------------------------------------- */}
              <Card>
                <CardHeader>
                  <CardTitle>Water by unit</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    The finer the count a mill spins, the tighter the humidity it has to hold — which is
                    why the fine-count mill draws the most water per kilogram even when it is running well.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="scrollbar-thin overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="py-2 pr-3 font-semibold">Unit</th>
                          <th className="py-2 pr-3 font-semibold">Water drawn</th>
                          <th className="py-2 pr-3 font-semibold">Share</th>
                          <th className="py-2 pr-3 font-semibold">L per kg</th>
                          <th className="py-2 pr-3 font-semibold">vs previous</th>
                          <th className="py-2 pr-3 font-semibold">Staff</th>
                          <th className="py-2 font-semibold">L per person/day</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.byUnit.map((u) => (
                          <tr key={u.factoryId} className="border-b border-border/60 last:border-0">
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{u.name}</span>
                                {u.status === 'worse' && <Badge variant="danger">rising</Badge>}
                                {u.status === 'better' && <Badge variant="success">improving</Badge>}
                              </div>
                            </td>
                            <td className="py-2.5 pr-3 tabular-nums">{formatKl(u.kl)}</td>
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2">
                                <Progress value={u.sharePct} className="h-1.5 w-14" />
                                <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">
                                  {formatPct(u.sharePct, 0)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-3 font-semibold tabular-nums text-copper-700">
                              {u.litresPerKg}
                            </td>
                            <td className="py-2.5 pr-3">
                              <Delta value={u.intensityChangePct} />
                            </td>
                            <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                              {formatNumber(u.employees)}
                            </td>
                            <td className="py-2.5 tabular-nums text-muted-foreground">
                              {u.litresPerPersonDay} L
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* ---- Water losses ---------------------------------------- */}
              <Card>
                <CardHeader>
                  <CardTitle>Where the water is being lost</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Leaks and overflow are pumped but never delivered. Drift is water that reaches the
                    plant and still does no work — it leaves as droplets instead of vapour.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {w.losses.map((l) => (
                      <div key={l.category} className="rounded-xl border border-border p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{l.category}</span>
                          <div className="text-right">
                            <div className="num text-sm font-semibold text-foreground">
                              {formatKl(l.kl)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {formatPct(l.sharePct, 1)} of draw
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{l.cause}</p>
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-success-50 p-2.5">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-700" />
                          <p className="text-[11px] leading-relaxed text-success-800">
                            {l.action}{' '}
                            <span className="font-semibold">
                              Recovers about {formatKl(l.recoverableKl)} ({l.recoverablePct}%).
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ---- Water trend ----------------------------------------- */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily water draw</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Fresh abstraction against recycled reuse, by day. Unlike power, the water line barely
                    dips at weekends — humidification and the domestic load carry on regardless of output.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterTrendData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={28}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          width={56}
                          tickFormatter={(v: number) => `${Math.round(v)}`}
                          label={{
                            value: 'kL a day',
                            angle: -90,
                            position: 'insideLeft',
                            style: {
                              fontSize: 11,
                              fill: 'hsl(var(--muted-foreground))',
                              textAnchor: 'middle',
                            },
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                          contentStyle={chartTooltipStyle}
                          formatter={(value, name) => [formatKl(Number(value)), String(name)]}
                        />
                        <Bar dataKey="freshKl" name="Fresh abstraction" stackId="w" fill="#3a7d8c" />
                        <Bar
                          dataKey="recycledKl"
                          name="Recycled reuse"
                          stackId="w"
                          fill="#4a8a3c"
                          radius={[3, 3, 0, 0]}
                        >
                          {waterTrendData.map((d) => (
                            <Cell key={d.date} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
