import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CircleCheck, Ruler, Sprout, Weight } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCottonLots, getQualityTests } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import type { QualityTest } from '@/types'
import { cottonInstruments } from '@/types'

const chartTooltipStyle = {
  borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  background: 'hsl(var(--popover))',
}

/** HVI micronaire bands — 3.7–4.2 is the premium spinning window. */
const micronaireBands = [
  { label: '< 3.5', min: -Infinity, max: 3.5, premium: false },
  { label: '3.5 – 3.6', min: 3.5, max: 3.7, premium: false },
  { label: '3.7 – 3.9', min: 3.7, max: 4.0, premium: true },
  { label: '4.0 – 4.2', min: 4.0, max: 4.3, premium: true },
  { label: '≥ 4.3', min: 4.3, max: Infinity, premium: false },
]

/** HVI staple length bands (mm) across Indian ELS, Egyptian and US Pima intake. */
const stapleBands = [
  { label: '< 32', min: -Infinity, max: 32 },
  { label: '32 – 33.9', min: 32, max: 34 },
  { label: '34 – 35.9', min: 34, max: 36 },
  { label: '36 – 37.9', min: 36, max: 38 },
  { label: '≥ 38', min: 38, max: Infinity },
]

function average(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

export default function CottonQuality() {
  const tests = useAsync(() => getQualityTests({ stage: 'Cotton' }), [])
  const lots = useAsync(() => getCottonLots(), [])

  const lotById = useMemo(() => new Map((lots.data ?? []).map((l) => [l.id, l])), [lots.data])

  const rows = useMemo(() => tests.data ?? [], [tests.data])
  const passCount = rows.filter((t) => t.result === 'Pass').length
  const avgMicronaire = average(
    rows.map((t) => t.parameters.micronaire).filter((v): v is number => v !== undefined),
  )
  const avgStaple = average(
    rows.map((t) => t.parameters.staple).filter((v): v is number => v !== undefined),
  )
  const avgStrength = average(
    rows.map((t) => t.parameters.strength).filter((v): v is number => v !== undefined),
  )

  const micronaireDistribution = useMemo(
    () =>
      micronaireBands.map((band) => ({
        label: band.label,
        premium: band.premium,
        tests: rows.filter((t) => {
          const v = t.parameters.micronaire
          return v !== undefined && v >= band.min && v < band.max
        }).length,
      })),
    [rows],
  )

  const stapleDistribution = useMemo(
    () =>
      stapleBands.map((band) => ({
        label: band.label,
        tests: rows.filter((t) => {
          const v = t.parameters.staple
          return v !== undefined && v >= band.min && v < band.max
        }).length,
      })),
    [rows],
  )

  const instrumentUsage = useMemo(
    () =>
      cottonInstruments.map((instrument) => ({
        instrument,
        tests: rows.filter((t) => t.instrument === instrument).length,
      })),
    [rows],
  )

  const columns = useMemo<ColumnDef<QualityTest, any>[]>(
    () => [
      { accessorKey: 'testNo', header: 'Test No' },
      { accessorKey: 'instrument', header: 'Instrument' },
      {
        id: 'lot',
        header: 'Cotton Lot',
        accessorFn: (row) => (row.cottonLotId ? (lotById.get(row.cottonLotId)?.lotNumber ?? '') : ''),
      },
      {
        id: 'origin',
        header: 'Origin',
        accessorFn: (row) => (row.cottonLotId ? (lotById.get(row.cottonLotId)?.origin ?? '') : ''),
        cell: ({ row }) => {
          const origin = row.original.cottonLotId ? lotById.get(row.original.cottonLotId)?.origin : undefined
          return origin ? <Badge variant="outline">{origin}</Badge> : <span>—</span>
        },
      },
      {
        id: 'micronaire',
        header: 'Micronaire',
        accessorFn: (row) => row.parameters.micronaire ?? 0,
        cell: ({ row }) => row.original.parameters.micronaire?.toFixed(2) ?? '—',
      },
      {
        id: 'staple',
        header: 'Staple (mm)',
        accessorFn: (row) => row.parameters.staple ?? 0,
        cell: ({ row }) => row.original.parameters.staple?.toFixed(1) ?? '—',
      },
      {
        id: 'strength',
        header: 'Strength (g/tex)',
        accessorFn: (row) => row.parameters.strength ?? 0,
        cell: ({ row }) => row.original.parameters.strength?.toFixed(1) ?? '—',
      },
      {
        id: 'neps',
        header: 'Neps / g',
        accessorFn: (row) => row.parameters.nepsPerGram ?? 0,
        cell: ({ row }) =>
          row.original.parameters.nepsPerGram !== undefined
            ? formatNumber(row.original.parameters.nepsPerGram)
            : '—',
      },
      {
        id: 'trash',
        header: 'Trash %',
        accessorFn: (row) => row.parameters.trashPct ?? 0,
        cell: ({ row }) => row.original.parameters.trashPct?.toFixed(1) ?? '—',
      },
      {
        id: 'moisture',
        header: 'Moisture %',
        accessorFn: (row) => row.parameters.moisturePct ?? 0,
        cell: ({ row }) => row.original.parameters.moisturePct?.toFixed(1) ?? '—',
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
    [lotById],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Cotton Quality"
        description="Bale-level HVI, AFIS PRO-2 and trash separator readings taken on Indian ELS, Egyptian and US Pima intake."
      />

      {tests.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={5}>
          <StatCard label="Cotton tests" value={formatNumber(rows.length)} icon={Sprout} tone="info" />
          <StatCard
            label="Pass rate"
            value={rows.length ? formatPct((passCount / rows.length) * 100) : '—'}
            sublabel={`${formatNumber(passCount)} of ${formatNumber(rows.length)} lots cleared`}
            icon={CircleCheck}
            tone="success"
          />
          <StatCard
            label="Avg micronaire"
            value={rows.length ? avgMicronaire.toFixed(2) : '—'}
            sublabel="USTER HVI"
            icon={Weight}
          />
          <StatCard
            label="Avg staple"
            value={rows.length ? `${avgStaple.toFixed(1)} mm` : '—'}
            sublabel="USTER HVI"
            icon={Ruler}
          />
          <StatCard
            label="Avg strength"
            value={rows.length ? `${avgStrength.toFixed(1)} g/tex` : '—'}
            sublabel="Tenacity"
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Micronaire Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Green bands sit in the 3.7 – 4.2 spinning window</p>
          </CardHeader>
          <CardContent>
            {tests.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : rows.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                No cotton tests recorded.
              </div>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={micronaireDistribution} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
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
                      formatter={(value) => [`${formatNumber(Number(value))} tests`, 'Micronaire band']}
                    />
                    <Bar dataKey="tests" name="Tests" radius={[4, 4, 0, 0]} maxBarSize={44}>
                      {micronaireDistribution.map((band) => (
                        <Cell key={band.label} fill={band.premium ? '#4a8a3c' : '#93c3b2'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staple Length Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">HVI staple, mm — drives the achievable count group</p>
          </CardHeader>
          <CardContent>
            {tests.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : rows.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                No cotton tests recorded.
              </div>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stapleDistribution} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
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
                      formatter={(value) => [`${formatNumber(Number(value))} tests`, 'Staple band']}
                    />
                    <Bar dataKey="tests" name="Tests" radius={[4, 4, 0, 0]} maxBarSize={44} fill="#3a7d8c" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instrument Coverage</CardTitle>
            <p className="text-xs text-muted-foreground">Cotton-side instruments in the Central Testing Laboratory</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {instrumentUsage.map((row) => (
              <div key={row.instrument} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{row.instrument}</span>
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {formatNumber(row.tests)}
                </span>
              </div>
            ))}
            <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              Every incoming bale lot is fingerprinted for micronaire, staple, strength, neps and trash before it
              is released to the blow room.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cotton Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={tests.isLoading || lots.isLoading}
            emptyMessage="No cotton tests recorded."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
