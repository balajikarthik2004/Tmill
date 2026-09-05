import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CircleCheck, CircleX, FlaskConical, MessageSquare, RotateCcw, Trash2 } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getQualitySummary, getQualityTests, getRejectionBreakdown } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatKg, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const resultColors: Record<string, string> = {
  Pass: '#4a8a3c',
  Rework: '#b4632a',
  Fail: '#b23a2f',
}

const chartTooltipStyle = {
  borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  background: 'hsl(var(--popover))',
}

function stageBarColor(pct: number) {
  if (pct >= 90) return '#4a8a3c'
  if (pct >= 80) return '#b4632a'
  return '#b23a2f'
}

function passRateTone(pct: number) {
  if (pct >= 90) return 'bg-success-500'
  if (pct >= 80) return 'bg-warning-500'
  return 'bg-danger-500'
}

export default function QualityDashboard() {
  const summary = useAsync(getQualitySummary, [])
  const tests = useAsync(() => getQualityTests(), [])
  const rejections = useAsync(() => getRejectionBreakdown(), [])

  const attention = useMemo(
    () =>
      (tests.data ?? [])
        .filter((t) => t.result !== 'Pass')
        .sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime())
        .slice(0, 8),
    [tests.data],
  )

  const resultSlices = useMemo(() => {
    if (!summary.data) return []
    return [
      { name: 'Pass', value: summary.data.pass },
      { name: 'Rework', value: summary.data.rework },
      { name: 'Fail', value: summary.data.fail },
    ].filter((s) => s.value > 0)
  }, [summary.data])

  const resultTotal = resultSlices.reduce((sum, s) => sum + s.value, 0)

  const reasonBars = useMemo(
    () => (rejections.data?.byReason ?? []).slice(0, 6).map((r) => ({ ...r, label: r.key })),
    [rejections.data],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Central Testing Laboratory"
        description="Cotton, yarn and fabric testing across all five units — USTER HVI, AFIS PRO-2, UT5/UTR4/UTJ4, Tensojet, Zweigle, TPI and CSP testers."
        actions={
          <Link
            to="/quality/lab-tests"
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Open lab test register
          </Link>
        }
      />

      {summary.isLoading || !summary.data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard
            label="Tests recorded"
            value={formatNumber(summary.data.total)}
            sublabel="Last 30 days"
            icon={FlaskConical}
            tone="info"
            to="/quality/lab-tests"
          />
          <StatCard
            label="Pass rate"
            value={formatPct(summary.data.passRatePct)}
            sublabel={`${formatNumber(summary.data.pass)} passed`}
            icon={CircleCheck}
            tone="success"
          />
          <StatCard
            label="Rework"
            value={formatNumber(summary.data.rework)}
            sublabel="Re-test required"
            icon={RotateCcw}
            tone="warning"
          />
          <StatCard
            label="Failed"
            value={formatNumber(summary.data.fail)}
            sublabel="Outside tolerance band"
            icon={CircleX}
            tone="danger"
          />
          <StatCard
            label="Rejected quantity"
            value={formatKg(summary.data.rejectionKg)}
            sublabel="All stages"
            icon={Trash2}
            tone="danger"
            to="/quality/rejections"
          />
          <StatCard
            label="Open complaints"
            value={formatNumber(summary.data.openComplaints)}
            sublabel="Open & investigating"
            icon={MessageSquare}
            tone="warning"
            to="/quality/complaints"
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pass Rate by Stage</CardTitle>
            <p className="text-xs text-muted-foreground">Cotton intake · yarn spinning · woven fabric</p>
          </CardHeader>
          <CardContent>
            {summary.isLoading || !summary.data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.data.byStage} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="stage"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                        contentStyle={chartTooltipStyle}
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Pass rate']}
                      />
                      <Bar dataKey="passRatePct" name="Pass rate" radius={[4, 4, 0, 0]} maxBarSize={54}>
                        {summary.data.byStage.map((s) => (
                          <Cell key={s.stage} fill={stageBarColor(s.passRatePct)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {summary.data.byStage.map((s) => (
                    <div key={s.stage}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{s.stage}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(s.total)} tests · {formatPct(s.passRatePct)}
                        </span>
                      </div>
                      <Progress value={s.passRatePct} indicatorClassName={cn(passRateTone(s.passRatePct))} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <p className="text-xs text-muted-foreground">Disposition of every laboratory test</p>
          </CardHeader>
          <CardContent>
            {summary.isLoading || !summary.data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="relative h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={resultSlices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="66%"
                        outerRadius="96%"
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {resultSlices.map((slice) => (
                          <Cell key={slice.name} fill={resultColors[slice.name]} stroke="hsl(var(--card))" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value, name) => {
                          const n = Number(value)
                          return [`${formatNumber(n)} (${((n / resultTotal) * 100).toFixed(1)}%)`, String(name)]
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Tests
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatNumber(resultTotal)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {resultSlices.map((slice) => (
                    <div key={slice.name} className="flex items-center justify-between px-1.5 py-1 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: resultColors[slice.name] }}
                        />
                        <span className="font-medium text-foreground">{slice.name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(slice.value)} · {((slice.value / resultTotal) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rejection Reasons</CardTitle>
            <p className="text-xs text-muted-foreground">Quantity rejected by root cause</p>
          </CardHeader>
          <CardContent>
            {rejections.isLoading || !rejections.data ? (
              <Skeleton className="h-56 w-full" />
            ) : reasonBars.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No rejections recorded.
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={reasonBars}
                    margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={132}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [formatKg(Number(value)), 'Rejected']}
                    />
                    <Bar dataKey="qtyKg" name="Rejected" radius={[0, 4, 4, 0]} maxBarSize={18} fill="#b23a2f" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Failed &amp; Rework Tests</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Most recent lots held back by the Central Testing Laboratory
            </p>
          </div>
          <Link
            to="/quality/lab-tests?result=Fail"
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {tests.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : attention.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center">
              <CircleCheck className="h-8 w-8 text-success-600" />
              <p className="text-sm text-muted-foreground">
                Every recorded test passed — no lots are being held.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {attention.map((test) => (
                <div key={test.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="w-32 shrink-0 text-sm font-medium text-foreground">{test.testNo}</span>
                  <Badge variant="outline">{test.stage}</Badge>
                  <span className="text-xs text-muted-foreground">{test.instrument}</span>
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    {test.remarks ?? 'Parameter outside tolerance band'}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatDate(test.testedDate)}
                  </span>
                  <StatusBadge status={test.result} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
