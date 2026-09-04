import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, CircleCheck, Spline, Waypoints } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getProducts, getQualityTests } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import type { QualityTest } from '@/types'

const chartTooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  background: 'hsl(var(--popover))',
}

/** USTER UT5 evenness bands — lower U% is a more level yarn. */
const usterBands = [
  { label: '< 9', min: -Infinity, max: 9 },
  { label: '9 – 9.9', min: 9, max: 10 },
  { label: '10 – 10.9', min: 10, max: 11 },
  { label: '11 – 11.9', min: 11, max: 12 },
  { label: '≥ 12', min: 12, max: Infinity },
]

function average(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

function numbersOf(rows: QualityTest[], key: 'csp' | 'uster' | 'hairiness' | 'imperfections' | 'strength') {
  return rows.map((t) => t.parameters[key]).filter((v): v is number => v !== undefined)
}

export default function YarnQuality() {
  const tests = useAsync(() => getQualityTests({ stage: 'Yarn' }), [])
  const products = useAsync(getProducts, [])

  const productNames = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.id, p.name])),
    [products.data],
  )

  const rows = useMemo(() => tests.data ?? [], [tests.data])
  const passCount = rows.filter((t) => t.result === 'Pass').length

  const cspTrend = useMemo(() => {
    const byDay = new Map<string, number[]>()
    for (const test of rows) {
      const csp = test.parameters.csp
      if (csp === undefined) continue
      const day = test.testedDate.slice(0, 10)
      byDay.set(day, [...(byDay.get(day) ?? []), csp])
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, values]) => ({
        day,
        label: formatDate(day, 'd MMM'),
        csp: Math.round(average(values)),
        tests: values.length,
      }))
  }, [rows])

  const usterDistribution = useMemo(
    () =>
      usterBands.map((band) => ({
        label: band.label,
        tests: rows.filter((t) => {
          const v = t.parameters.uster
          return v !== undefined && v >= band.min && v < band.max
        }).length,
      })),
    [rows],
  )

  const columns = useMemo<ColumnDef<QualityTest, any>[]>(
    () => [
      { accessorKey: 'testNo', header: 'Test No' },
      { accessorKey: 'instrument', header: 'Instrument' },
      {
        id: 'product',
        header: 'Product',
        accessorFn: (row) => (row.productId ? (productNames.get(row.productId) ?? row.productId) : '—'),
      },
      {
        id: 'count',
        header: 'Count',
        accessorFn: (row) => row.parameters.count ?? '',
        cell: ({ row }) => row.original.parameters.count ?? '—',
      },
      {
        id: 'strength',
        header: 'Strength (g/tex)',
        accessorFn: (row) => row.parameters.strength ?? 0,
        cell: ({ row }) => row.original.parameters.strength?.toFixed(1) ?? '—',
      },
      {
        id: 'csp',
        header: 'CSP',
        accessorFn: (row) => row.parameters.csp ?? 0,
        cell: ({ row }) =>
          row.original.parameters.csp !== undefined ? formatNumber(row.original.parameters.csp) : '—',
      },
      {
        id: 'uster',
        header: 'U%',
        accessorFn: (row) => row.parameters.uster ?? 0,
        cell: ({ row }) => row.original.parameters.uster?.toFixed(1) ?? '—',
      },
      {
        id: 'hairiness',
        header: 'Hairiness',
        accessorFn: (row) => row.parameters.hairiness ?? 0,
        cell: ({ row }) => row.original.parameters.hairiness?.toFixed(1) ?? '—',
      },
      {
        id: 'tpi',
        header: 'TPI',
        accessorFn: (row) => row.parameters.tpi ?? 0,
        cell: ({ row }) => row.original.parameters.tpi?.toFixed(1) ?? '—',
      },
      {
        id: 'imperfections',
        header: 'IPI / 1000 m',
        accessorFn: (row) => row.parameters.imperfections ?? 0,
        cell: ({ row }) =>
          row.original.parameters.imperfections !== undefined
            ? formatNumber(row.original.parameters.imperfections)
            : '—',
      },
      {
        accessorKey: 'result',
        header: 'Result',
        cell: ({ row }) => <StatusBadge status={row.original.result} />,
      },
      {
        accessorKey: 'testedDate',
        header: 'Date',
        cell: ({ row }) => formatDate(row.original.testedDate),
      },
    ],
    [productNames],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Yarn Quality"
        description="Ring, compact, open end, doubled and gassed yarn tested on USTER UT5/UTR4/UTJ4, CMT5, Tensojet, Zweigle, TPI and CSP testers."
      />

      {tests.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard label="Yarn tests" value={formatNumber(rows.length)} icon={Activity} tone="info" />
          <StatCard
            label="Pass rate"
            value={rows.length ? formatPct((passCount / rows.length) * 100) : '—'}
            sublabel={`${formatNumber(passCount)} passed`}
            icon={CircleCheck}
            tone="success"
          />
          <StatCard
            label="Avg CSP"
            value={rows.length ? formatNumber(Math.round(average(numbersOf(rows, 'csp')))) : '—'}
            sublabel="Count strength product"
          />
          <StatCard
            label="Avg U%"
            value={rows.length ? average(numbersOf(rows, 'uster')).toFixed(1) : '—'}
            sublabel="USTER UT5 evenness"
            icon={Spline}
          />
          <StatCard
            label="Avg hairiness"
            value={rows.length ? average(numbersOf(rows, 'hairiness')).toFixed(1) : '—'}
            sublabel="Zweigle index"
            icon={Waypoints}
          />
          <StatCard
            label="Avg IPI"
            value={rows.length ? formatNumber(Math.round(average(numbersOf(rows, 'imperfections')))) : '—'}
            sublabel="Per 1000 m"
            tone="warning"
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>CSP Trend</CardTitle>
            <p className="text-xs text-muted-foreground">
              Daily average count strength product across all yarn tests
            </p>
          </CardHeader>
          <CardContent>
            {tests.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : cspTrend.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                No CSP readings recorded.
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cspTrend} margin={{ top: 4, right: 8, left: -6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={['dataMin - 200', 'dataMax + 200']}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      cursor={{ stroke: 'hsl(var(--border))' }}
                      contentStyle={chartTooltipStyle}
                      formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
                    />
                    <Line
                      type="monotone"
                      dataKey="csp"
                      name="Avg CSP"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#2563eb' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evenness (U%) Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">USTER UT5 unevenness bands</p>
          </CardHeader>
          <CardContent>
            {tests.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : rows.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                No evenness readings recorded.
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usterDistribution} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [`${formatNumber(Number(value))} tests`, 'U% band']}
                    />
                    <Bar dataKey="tests" name="Tests" radius={[4, 4, 0, 0]} maxBarSize={40} fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yarn Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={tests.isLoading || products.isLoading}
            emptyMessage="No yarn tests recorded."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
