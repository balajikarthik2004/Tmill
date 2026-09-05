import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CirclePause,
  ClipboardCheck,
  Cog,
  Gauge,
  PackageCheck,
  PlayCircle,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { useAsync } from '@/hooks/useAsync'
import { useAppStore } from '@/store/appStore'
import { assessOrderFeasibility, getCapacityPlan } from '@/services'
import type { ProcessCapacityRow, UnitCapacityRow } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { FilterChip, FilterChipGroup } from '@/components/common/FilterChip'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatKg, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const horizons = [7, 14, 30] as const
type Horizon = (typeof horizons)[number]

/** Load bands. Unlike achievement, a high number here is the warning. */
function loadTone(pct: number) {
  if (pct >= 95) return 'danger'
  if (pct >= 80) return 'warning'
  return 'success'
}

const barByTone: Record<string, string> = {
  danger: 'bg-danger-500',
  warning: 'bg-warning-500',
  success: 'bg-success-500',
}

/** Written out in full so Tailwind keeps these classes — never interpolated. */
const textByTone: Record<string, string> = {
  danger: 'text-danger-700',
  warning: 'text-warning-700',
  success: 'text-success-700',
}

function formatDays(days: number | null | undefined) {
  if (days === null || days === undefined) return '—'
  if (days < 1) return `${Math.round(days * 24)} h`
  return `${days.toFixed(1)} d`
}

const chartTooltipStyle = {
  borderRadius: 12,
  boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  background: 'hsl(var(--popover))',
}

interface BurndownDatum {
  label: string
  backlogKg: number
  backlogWithOnHoldKg: number
}

/**
 * Says in a sentence what the point on the line means. A raw "142,300 kg" tells
 * a planner nothing on its own — how many days of running it represents does.
 */
function BurndownTooltip({
  active,
  payload,
  label,
  dailyKg,
}: {
  active?: boolean
  payload?: { payload: BurndownDatum }[]
  label?: string | number
  dailyKg: number
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  const daysLeft = dailyKg > 0 ? point.backlogKg / dailyKg : 0
  const heldGap = point.backlogWithOnHoldKg - point.backlogKg

  return (
    <div style={chartTooltipStyle} className="max-w-56 px-3 py-2">
      <div className="text-xs font-semibold text-foreground">{String(label)}</div>
      {point.backlogKg > 0 ? (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{formatKg(point.backlogKg)}</span> of promised
          yarn still to make — about {formatDays(daysLeft)} of running left.
        </p>
      ) : (
        <p className="mt-1 text-[11px] leading-relaxed text-success-700">
          Everything promised is made. The machines are free from here.
        </p>
      )}
      {heldGap > 0 && (
        <p className="mt-1 border-t border-border/60 pt-1 text-[11px] leading-relaxed text-copper-700">
          {formatKg(heldGap)} more if the held orders are released.
        </p>
      )}
    </div>
  )
}

/** One step of the derivation, so every headline figure can be traced back. */
function FlowStep({
  step,
  label,
  value,
  formula,
  tone = 'default',
}: {
  step: number
  label: string
  value: string
  formula: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const valueTone = {
    default: 'text-foreground',
    success: 'text-success-700',
    warning: 'text-warning-700',
    danger: 'text-danger-700',
  }[tone]

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground">
        {step}
      </span>
      <div className="min-w-0">
        <div className="section-label text-[10px] uppercase tracking-wider text-copper-600">{label}</div>
        <div className={cn('num mt-0.5 text-base font-semibold leading-tight', valueTone)}>{value}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{formula}</div>
      </div>
    </div>
  )
}

const stageColumns: ColumnDef<ProcessCapacityRow, any>[] = [
  {
    accessorKey: 'process',
    header: 'Stage',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <span className="font-medium">{row.original.process}</span>
        {row.original.isBottleneck && <Badge variant="danger">Bottleneck</Badge>}
        {!row.original.onPrimaryRoute && <Badge variant="secondary">Off route</Badge>}
      </div>
    ),
  },
  {
    id: 'fleet',
    header: 'Running / Fleet',
    accessorFn: (row) => row.fleet.running,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.fleet.running} / {row.original.fleet.total}
        {row.original.fleet.idle > 0 && (
          <span className="text-muted-foreground"> · {row.original.fleet.idle} idle</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'dailyCapacityKg',
    header: 'Capacity / day',
    cell: ({ row }) => formatKg(row.original.dailyCapacityKg),
  },
  {
    accessorKey: 'committedKg',
    header: 'Committed',
    cell: ({ row }) => formatKg(row.original.committedKg),
  },
  {
    accessorKey: 'loadPct',
    header: 'Load',
    cell: ({ row }) => {
      const tone = loadTone(row.original.loadPct)
      return (
        <div className="flex items-center gap-2">
          <Progress
            value={Math.min(row.original.loadPct, 100)}
            className="h-1.5 w-16"
            indicatorClassName={barByTone[tone]}
          />
          <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatPct(row.original.loadPct, 0)}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'freeKg',
    header: 'Free',
    cell: ({ row }) => formatKg(row.original.freeKg),
  },
  {
    accessorKey: 'clearanceDays',
    header: 'Clears in',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatDays(row.original.clearanceDays)}</span>
    ),
  },
  {
    accessorKey: 'onHoldKg',
    header: 'On hold',
    cell: ({ row }) =>
      row.original.onHoldKg > 0 ? (
        <span className="text-warning-700">{formatKg(row.original.onHoldKg)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
]

function UnitCard({ unit }: { unit: UnitCapacityRow }) {
  const tone = loadTone(unit.loadPct)
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{unit.name}</span>
            <Badge variant="secondary">{unit.installedCapacity}</Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{unit.countGroup}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={cn('num text-lg font-semibold', textByTone[tone])}>{formatPct(unit.loadPct, 0)}</div>
          <div className="text-[11px] text-muted-foreground">of horizon capacity committed</div>
        </div>
      </div>

      <Progress
        value={Math.min(unit.loadPct, 100)}
        className="mt-3"
        indicatorClassName={barByTone[tone]}
      />

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <div className="text-muted-foreground">Route throughput</div>
          <div className="font-semibold tabular-nums text-foreground">{formatKg(unit.dailyCapacityKg)}/day</div>
        </div>
        <div>
          <div className="text-muted-foreground">Committed / free</div>
          <div className="font-semibold tabular-nums text-foreground">
            {formatKg(unit.committedKg)} · {formatKg(unit.freeKg)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Machines running</div>
          <div className="font-semibold tabular-nums text-foreground">
            {unit.fleet.running} / {unit.fleet.total} · {unit.fleet.idle} idle
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Backlog clears</div>
          <div className="font-semibold tabular-nums text-foreground">
            {formatDays(unit.clearanceDays)}
            {unit.clearanceDate && (
              <span className="font-normal text-muted-foreground"> · {formatDate(unit.clearanceDate, 'dd MMM')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
        {unit.constrainingProcess && (
          <Badge variant="copper">Capped by {unit.constrainingProcess}</Badge>
        )}
        {unit.slowestProcess && unit.slowestProcess !== unit.constrainingProcess && (
          <Badge variant="outline">Longest queue at {unit.slowestProcess}</Badge>
        )}
        {unit.onHoldKg > 0 && (
          <Badge variant="warning">
            {formatKg(unit.onHoldKg)} on hold · {unit.onHoldOrders} orders
          </Badge>
        )}
      </div>
    </Card>
  )
}

export default function CapacityPlanning() {
  const { factoryId } = useAppStore()
  const [horizon, setHorizon] = useState<Horizon>(30)
  const [qtyInput, setQtyInput] = useState('12000')
  const [daysInput, setDaysInput] = useState('21')

  const planQuery = useAsync(() => getCapacityPlan(horizon, factoryId), [horizon, factoryId])

  const plan = planQuery.data
  const isLoading = planQuery.isLoading

  const feasibility = useMemo(() => {
    if (!plan) return null
    return assessOrderFeasibility(plan, {
      qtyKg: Number(qtyInput) || 0,
      dueInDays: Number(daysInput) || 0,
    })
  }, [plan, qtyInput, daysInput])

  const burndown = useMemo(
    () =>
      (plan?.burndown ?? []).map((p) => ({
        ...p,
        label: formatDate(p.date, 'dd MMM'),
      })),
    [plan?.burndown],
  )

  const clearanceDay = plan?.plant.clearanceDays ?? null
  const loadPct = plan?.plant.loadPct ?? 0
  const plantTone = loadTone(loadPct)

  const verdictStyles = {
    accept: {
      card: 'border-success-100 bg-success-50',
      text: 'text-success-700',
      icon: CheckCircle2,
    },
    tight: {
      card: 'border-warning-100 bg-warning-50',
      text: 'text-warning-700',
      icon: TriangleAlert,
    },
    decline: {
      card: 'border-danger-100 bg-danger-50',
      text: 'text-danger-700',
      icon: AlertTriangle,
    },
  } as const

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Capacity Planning"
        description={
          plan
            ? `${plan.scopeLabel} — what the fleet can carry over the next ${horizon} days, what the order book has already claimed, and what is left to sell.`
            : 'Machine availability, committed load and free capacity across the plant.'
        }
        actions={
          <FilterChipGroup>
            {horizons.map((h) => (
              <FilterChip key={h} size="md" active={horizon === h} onClick={() => setHorizon(h)}>
                {h} days
              </FilterChip>
            ))}
          </FilterChipGroup>
        }
      />

      {/* ---- The four questions ------------------------------------------ */}
      {isLoading || !plan ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard
            label="Machines running now"
            value={`${plan.fleet.running} of ${plan.fleet.total}`}
            sublabel={`${formatPct(plan.fleet.avgUtilizationPct, 0)} average utilisation`}
            icon={PlayCircle}
            tone="success"
            to="/maintenance/machine-dashboard"
          />
          <StatCard
            label="Available to schedule"
            value={formatNumber(plan.fleet.availableNow)}
            sublabel={
              plan.fleet.returningInHorizon > 0
                ? `idle now · ${plan.fleet.returningInHorizon} more back from PM / repair`
                : 'idle now, no job assigned'
            }
            icon={Cog}
            tone="info"
          />
          <StatCard
            label="New orders we can take"
            value={formatNumber(plan.intake.acceptableOrders)}
            sublabel={`${formatKg(plan.intake.quotableKg)} quotable at ${formatKg(plan.intake.avgOrderKg)} average`}
            icon={PackageCheck}
            tone={plan.intake.acceptableOrders > 0 ? 'success' : 'danger'}
          />
          <StatCard
            label="Current load finishes in"
            value={formatDays(plan.plant.clearanceDays)}
            sublabel={
              plan.plant.clearanceDate
                ? `on ${formatDate(plan.plant.clearanceDate)} at today's rate`
                : 'nothing schedulable'
            }
            icon={CalendarClock}
            tone={plantTone === 'success' ? 'success' : plantTone === 'warning' ? 'warning' : 'danger'}
          />
        </StatGrid>
      )}

      {/* ---- How those numbers were reached ------------------------------ */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>How the plan is built</CardTitle>
          {plan && (
            <span className="text-[11px] text-muted-foreground">
              {plan.assumptions.shiftsPerDay} shifts · {plan.assumptions.hoursPerDay} h calendar ·{' '}
              {formatPct(plan.assumptions.availabilityPct, 0)} after planned downtime
            </span>
          )}
        </CardHeader>
        <CardContent>
          {isLoading || !plan ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <FlowStep
                step={1}
                label="Availability"
                value={`${plan.fleet.deployable} machines`}
                formula={`${plan.fleet.running} running + ${plan.fleet.idle} idle. ${plan.fleet.breakdown} in repair, ${plan.fleet.maintenance} in PM — ${formatNumber(plan.fleet.hoursLostToDowntime)} machine-hours lost.`}
              />
              <ArrowRight className="hidden h-4 w-4 shrink-0 self-center text-muted-foreground/40 lg:block" />
              <FlowStep
                step={2}
                label="Capacity"
                value={`${formatKg(plan.plant.dailyCapacityKg)}/day`}
                formula={`Slowest stage on each unit's route, summed across units, at ${formatPct(plan.fleet.avgOeePct, 0)} OEE. ${formatKg(plan.plant.capacityKg)} over ${horizon} days.`}
              />
              <ArrowRight className="hidden h-4 w-4 shrink-0 self-center text-muted-foreground/40 lg:block" />
              <FlowStep
                step={3}
                label="Committed load"
                value={formatKg(plan.plant.committedKg)}
                formula={`Balance on ${plan.plant.scheduledOrders} planned and running orders. ${formatKg(plan.plant.onHoldKg)} more sits on hold across ${plan.plant.onHoldOrders} orders.`}
              />
              <ArrowRight className="hidden h-4 w-4 shrink-0 self-center text-muted-foreground/40 lg:block" />
              <FlowStep
                step={4}
                label="Balance"
                value={formatPct(loadPct, 0)}
                formula={`Committed ÷ capacity. Clears in ${formatDays(plan.plant.clearanceDays)}${plan.plant.clearanceDaysWithOnHold !== null ? `, or ${formatDays(plan.plant.clearanceDaysWithOnHold)} if the held orders are released` : ''}.`}
                tone={plantTone}
              />
              <ArrowRight className="hidden h-4 w-4 shrink-0 self-center text-muted-foreground/40 lg:block" />
              <FlowStep
                step={5}
                label="Free to sell"
                value={`${formatNumber(plan.intake.acceptableOrders)} orders`}
                formula={`${formatKg(plan.intake.freeKg)} free, less a ${plan.assumptions.planningBufferPct}% buffer (${formatKg(plan.intake.bufferKg)}), divided by the ${formatKg(plan.intake.avgOrderKg)} average order.`}
                tone={plan.intake.acceptableOrders > 0 ? 'success' : 'danger'}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Burn-down + intake decision --------------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>When Does Today&apos;s Work Run Out?</CardTitle>
            <p className="text-xs text-muted-foreground">
              Think of the order book as a pile of yarn we have promised to make. Every day the mill runs,
              the pile gets smaller. This chart shows that pile shrinking — and the day it hits the floor
              is the day the machines are free for new work.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !plan ? (
              <Skeleton className="h-72 w-full" />
            ) : plan.plant.committedKg === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                Nothing is promised in this scope — the whole horizon is free.
              </div>
            ) : (
              <>
                {/* Read the chart in three beats, before even looking at it. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  {[
                    {
                      when: 'Today',
                      value: formatKg(plan.plant.committedKg),
                      note: `promised across ${plan.plant.scheduledOrders} live orders`,
                      tone: 'text-foreground',
                    },
                    {
                      when: 'Every day',
                      value: `− ${formatKg(plan.plant.dailyCapacityKg)}`,
                      note: 'comes off the pile as the mill runs',
                      tone: 'text-brand-600',
                    },
                    {
                      when: plan.plant.clearanceDate
                        ? formatDate(plan.plant.clearanceDate, 'dd MMM')
                        : 'Never',
                      value: 'Pile empty',
                      note: `machines free in ${formatDays(plan.plant.clearanceDays)}`,
                      tone: 'text-success-700',
                    },
                  ].map((beat, i) => (
                    <div key={beat.when} className="flex flex-1 items-center gap-2">
                      {i > 0 && (
                        <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 sm:block" />
                      )}
                      <div className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/30 px-3 py-2">
                        <div className="section-label text-[10px] uppercase tracking-wider text-copper-600">
                          {beat.when}
                        </div>
                        <div className={cn('num mt-0.5 text-sm font-semibold', beat.tone)}>{beat.value}</div>
                        <div className="text-[11px] leading-snug text-muted-foreground">{beat.note}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={burndown} margin={{ top: 18, right: 12, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="capBacklog" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0f6e56" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#0f6e56" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
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
                        width={80}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)} t`}
                        label={{
                          value: 'Still to make (tonnes)',
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
                        content={<BurndownTooltip dailyKg={plan.plant.dailyCapacityKg} />}
                        cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                      />

                      {/* Everything past the clearing day is capacity we can still sell. */}
                      {clearanceDay !== null && clearanceDay < horizon && (
                        <ReferenceArea
                          x1={burndown[Math.ceil(clearanceDay)]?.label}
                          x2={burndown[burndown.length - 1]?.label}
                          fill="#4a8a3c"
                          fillOpacity={0.07}
                          label={{
                            value: 'Free for new orders',
                            position: 'insideTop',
                            style: { fontSize: 11, fill: '#4a8a3c' },
                          }}
                        />
                      )}

                      {clearanceDay !== null && clearanceDay <= horizon && (
                        <ReferenceLine
                          x={burndown[Math.round(clearanceDay)]?.label}
                          stroke="#4a8a3c"
                          strokeDasharray="4 4"
                          label={{
                            value: plan.plant.clearanceDate
                              ? `Machines free — ${formatDate(plan.plant.clearanceDate, 'dd MMM')}`
                              : 'Machines free',
                            position: 'insideTopRight',
                            style: { fontSize: 11, fill: '#4a8a3c', fontWeight: 600 },
                          }}
                        />
                      )}

                      <Area
                        type="monotone"
                        dataKey="backlogWithOnHoldKg"
                        name="If held orders are released"
                        stroke="#b4632a"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        fill="none"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="backlogKg"
                        name="Promised, still to make"
                        stroke="#0f6e56"
                        strokeWidth={2.5}
                        fill="url(#capBacklog)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* A legend in words, not codes. */}
                <div className="space-y-1.5 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-0.5 w-5 shrink-0 rounded-full bg-brand-600" />
                    <span>
                      <span className="font-semibold text-foreground">The solid green line</span> is yarn we
                      have promised but not yet made. It drops every day the mill runs.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-0.5 w-5 shrink-0 rounded-full bg-copper-500" />
                    <span>
                      <span className="font-semibold text-foreground">The dashed copper line</span> is the
                      same pile if the{' '}
                      {plan.plant.onHoldOrders > 0
                        ? `${plan.plant.onHoldOrders} orders on hold (${formatKg(plan.plant.onHoldKg)})`
                        : 'orders on hold'}{' '}
                      come back onto the floor. The gap between the two lines is the delay that would cost
                      us.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-0.5 w-5 shrink-0 rounded-full bg-success-500" />
                    <span>
                      <span className="font-semibold text-foreground">The shaded band on the right</span> is
                      time nobody has claimed yet — that is what we are free to sell.
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ---- Can we take this order? ----------------------------------- */}
        {/* Highlighted: this is the one card on the page a planner acts from. */}
        <Card className="border-brand-300 bg-linear-to-br from-brand-50/70 via-card to-card shadow-md ring-1 ring-brand-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                <ClipboardCheck className="h-3.5 w-3.5" />
              </span>
              Order Feasibility?
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Queues a new order behind the committed backlog, then runs it at plant throughput.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cap-qty" className="text-xs">
                  Quantity (kg)
                </Label>
                <Input
                  id="cap-qty"
                  type="number"
                  min={0}
                  step={500}
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cap-days" className="text-xs">
                  Wanted in (days)
                </Label>
                <Input
                  id="cap-days"
                  type="number"
                  min={0}
                  step={1}
                  value={daysInput}
                  onChange={(e) => setDaysInput(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            </div>

            {isLoading || !plan || !feasibility ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : (
              (() => {
                const style = verdictStyles[feasibility.verdict]
                const Icon = style.icon
                return (
                  <div className={cn('rounded-xl border p-3.5', style.card)}>
                    <div className="flex items-start gap-2">
                      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.text)} />
                      <div className="min-w-0">
                        <div className={cn('text-sm font-semibold', style.text)}>{feasibility.headline}</div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {feasibility.recommendation}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-[11px]">
                      <div>
                        <div className="text-muted-foreground">Waits for backlog</div>
                        <div className="font-semibold tabular-nums text-foreground">
                          {formatDays(feasibility.queueDays)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Own run time</div>
                        <div className="font-semibold tabular-nums text-foreground">
                          {formatDays(feasibility.runDays)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Promise date</div>
                        <div className="font-semibold tabular-nums text-foreground">
                          {feasibility.promiseDate ? formatDate(feasibility.promiseDate) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Of quotable capacity</div>
                        <div className="font-semibold tabular-nums text-foreground">
                          {formatPct(feasibility.capacityUsedPct, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}

            {plan?.bottleneck && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-2.5 text-[11px] text-muted-foreground">
                <Gauge className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-semibold text-foreground">{plan.bottleneck.process}</span> is the
                  stage clearing last — {formatPct(plan.bottleneck.loadPct, 0)} loaded on{' '}
                  {plan.bottleneck.fleet.running} of {plan.bottleneck.fleet.total} machines, clearing in{' '}
                  {formatDays(plan.bottleneck.clearanceDays)}.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Fleet availability ------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet Availability</CardTitle>
          <p className="text-xs text-muted-foreground">
            Only running and idle machines can be scheduled. Machines in repair or PM are credited back
            from the hour they are expected to return, not written off for the whole horizon.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading || !plan ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: 'Running',
                  value: plan.fleet.running,
                  note: 'carrying work now',
                  icon: PlayCircle,
                  bar: 'bg-success-500',
                },
                {
                  label: 'Idle — available',
                  value: plan.fleet.idle,
                  note: 'can start this shift',
                  icon: CirclePause,
                  bar: 'bg-copper-500',
                },
                {
                  label: 'Preventive maintenance',
                  value: plan.fleet.maintenance,
                  note: `back in ~${plan.assumptions.pmWindowHours} h`,
                  icon: Wrench,
                  bar: 'bg-brand-500',
                },
                {
                  label: 'Breakdown',
                  value: plan.fleet.breakdown,
                  note: `~${plan.assumptions.mttrHours} h to restore`,
                  icon: TriangleAlert,
                  bar: 'bg-danger-500',
                },
              ].map((s) => {
                const Icon = s.icon
                const share = plan.fleet.total > 0 ? (s.value / plan.fleet.total) * 100 : 0
                return (
                  <div key={s.label} className="rounded-xl border border-border bg-secondary/30 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className="num mt-1 text-xl font-semibold text-foreground">{s.value}</div>
                    <Progress value={share} className="mt-2" indicatorClassName={s.bar} />
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      {formatPct(share, 0)} of fleet · {s.note}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Stage load --------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Load — Where the Constraint Sits</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every kilogram crosses each stage on its unit's route, so a route stage carries that unit's
            whole backlog. Winding, TFO and gassing sit off the route and carry only what is sent to them.
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={stageColumns}
            data={plan?.byProcess ?? []}
            isLoading={isLoading}
            emptyMessage="No production stages in this scope."
            pageSize={12}
          />
        </CardContent>
      </Card>

      {/* ---- Per unit ----------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold text-foreground">Capacity by Unit</h2>
        </div>
        {isLoading || !plan ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ) : plan.byUnit.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center text-sm text-muted-foreground">
              No units in this scope.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {plan.byUnit.map((unit) => (
              <UnitCard key={unit.factoryId} unit={unit} />
            ))}
          </div>
        )}
      </div>


      {/* ---- Assumptions --------------------------------------------------- */}
      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>Planning Assumptions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label: 'Shift calendar',
                value: `${plan.assumptions.shiftsPerDay} × 8 h`,
                note: 'continuous running',
              },
              {
                label: 'Maintenance allowance',
                value: formatPct(plan.assumptions.maintenanceAllowancePct, 0),
                note: 'PM window, doffing, cleaning',
              },
              {
                label: 'Changeover allowance',
                value: formatPct(plan.assumptions.changeoverAllowancePct, 0),
                note: 'count and lot changes',
              },
              {
                label: 'Net available time',
                value: formatPct(plan.assumptions.availabilityPct, 0),
                note: `${((plan.assumptions.hoursPerDay * plan.assumptions.availabilityPct) / 100).toFixed(1)} h a day`,
              },
              {
                label: 'Planning buffer',
                value: formatPct(plan.assumptions.planningBufferPct, 0),
                note: 'held back from quotable capacity',
              },
              {
                label: 'Restore times',
                value: `${plan.assumptions.mttrHours} h / ${plan.assumptions.pmWindowHours} h`,
                note: 'breakdown / PM',
              },
            ].map((a) => (
              <div key={a.label}>
                <div className="text-muted-foreground">{a.label}</div>
                <div className="num mt-0.5 text-sm font-semibold text-foreground">{a.value}</div>
                <div className="text-[11px] leading-snug text-muted-foreground">{a.note}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
