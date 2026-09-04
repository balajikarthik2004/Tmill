import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CircleCheck, CircleX, FlaskConical, Microscope } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCottonLots, getQualityTests } from '@/services'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import type { LabInstrument, QualityTest } from '@/types'

/** Cotton-side instruments in the Central Testing Laboratory. */
const instrumentStyles: Record<string, { variant: 'info' | 'success' | 'warning' | 'secondary'; measures: string }> = {
  'USTER HVI': { variant: 'info', measures: 'Micronaire · staple · strength' },
  'USTER AFIS PRO-2': { variant: 'success', measures: 'Neps per gram · fibre fineness' },
  'Trash Separator': { variant: 'warning', measures: 'Trash content · moisture' },
}

function InstrumentBadge({ instrument }: { instrument: LabInstrument }) {
  return <Badge variant={instrumentStyles[instrument]?.variant ?? 'secondary'}>{instrument}</Badge>
}

function num(value: number | undefined, digits: number): string {
  return value === undefined ? '—' : value.toFixed(digits)
}

function buildColumns(lotNumber: (id: string | undefined) => string): ColumnDef<QualityTest, any>[] {
  return [
    {
      accessorKey: 'testNo',
      header: 'Test No',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.testNo}</span>,
    },
    {
      accessorKey: 'instrument',
      header: 'Instrument',
      cell: ({ row }) => <InstrumentBadge instrument={row.original.instrument} />,
    },
    {
      id: 'cottonLot',
      header: 'Cotton Lot',
      accessorFn: (row) => lotNumber(row.cottonLotId),
      cell: ({ row }) => lotNumber(row.original.cottonLotId),
    },
    {
      id: 'micronaire',
      header: 'Mic',
      accessorFn: (row) => row.parameters.micronaire ?? 0,
      cell: ({ row }) => <span className="tabular-nums">{num(row.original.parameters.micronaire, 2)}</span>,
    },
    {
      id: 'staple',
      header: 'Staple (mm)',
      accessorFn: (row) => row.parameters.staple ?? 0,
      cell: ({ row }) => <span className="tabular-nums">{num(row.original.parameters.staple, 1)}</span>,
    },
    {
      id: 'strength',
      header: 'Strength (g/tex)',
      accessorFn: (row) => row.parameters.strength ?? 0,
      cell: ({ row }) => <span className="tabular-nums">{num(row.original.parameters.strength, 1)}</span>,
    },
    {
      id: 'trashPct',
      header: 'Trash %',
      accessorFn: (row) => row.parameters.trashPct ?? 0,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.parameters.trashPct === undefined ? '—' : formatPct(row.original.parameters.trashPct)}
        </span>
      ),
    },
    {
      id: 'nepsPerGram',
      header: 'Neps / g',
      accessorFn: (row) => row.parameters.nepsPerGram ?? 0,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.parameters.nepsPerGram === undefined
            ? '—'
            : formatNumber(row.original.parameters.nepsPerGram)}
        </span>
      ),
    },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: ({ row }) => <StatusBadge status={row.original.result} />,
    },
    { accessorKey: 'testedBy', header: 'Tested By' },
    {
      accessorKey: 'testedDate',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.testedDate),
    },
  ]
}

const micBins: { label: string; min: number; max: number; preferred: boolean }[] = [
  { label: '< 3.6', min: Number.NEGATIVE_INFINITY, max: 3.6, preferred: false },
  { label: '3.6 – 3.8', min: 3.6, max: 3.8, preferred: false },
  { label: '3.8 – 4.0', min: 3.8, max: 4.0, preferred: true },
  { label: '4.0 – 4.2', min: 4.0, max: 4.2, preferred: true },
  { label: '4.2 – 4.4', min: 4.2, max: 4.4, preferred: false },
  { label: '≥ 4.4', min: 4.4, max: Number.POSITIVE_INFINITY, preferred: false },
]

function MicronaireChart({ tests }: { tests: QualityTest[] }) {
  const data = useMemo(
    () =>
      micBins.map((bin) => ({
        label: bin.label,
        preferred: bin.preferred,
        count: tests.filter((t) => {
          const mic = t.parameters.micronaire
          return mic !== undefined && mic >= bin.min && mic < bin.max
        }).length,
      })),
    [tests],
  )
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Micronaire Distribution</CardTitle>
        <p className="text-xs text-muted-foreground">HVI readings across cotton tests · preferred band 3.8 – 4.2</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No micronaire readings recorded.
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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
                  contentStyle={{
                    borderRadius: 12,
                      boxShadow: '0 12px 28px -8px rgb(26 33 29 / 0.18)',
                    border: '1px solid hsl(var(--border))',
                    fontSize: 12,
                    background: 'hsl(var(--popover))',
                  }}
                  formatter={(value) => [`${formatNumber(Number(value))} tests`, 'Count']}
                />
                <Bar dataKey="count" name="Tests" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {data.map((d) => (
                    <Cell key={d.label} fill={d.preferred ? '#4a8a3c' : '#93c3b2'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function CottonTesting() {
  const { data: tests, isLoading } = useAsync(() => getQualityTests({ stage: 'Cotton' }), [])
  const { data: lots } = useAsync(() => getCottonLots(), [])

  const lotNumbers = useMemo(() => new Map((lots ?? []).map((l) => [l.id, l.lotNumber])), [lots])
  const lotNumber = useMemo(
    () => (id: string | undefined) => (id ? (lotNumbers.get(id) ?? 'Unlinked lot') : 'Unlinked lot'),
    [lotNumbers],
  )
  const columns = useMemo(() => buildColumns(lotNumber), [lotNumber])

  const stats = useMemo(() => {
    const list = tests ?? []
    const pass = list.filter((t) => t.result === 'Pass').length
    return {
      total: list.length,
      passRatePct: list.length ? Math.round((pass / list.length) * 1000) / 10 : 0,
      failed: list.filter((t) => t.result === 'Fail').length,
      lotsInTesting: (lots ?? []).filter((l) => l.status === 'In Testing').length,
    }
  }, [tests, lots])

  const instrumentUsage = useMemo(() => {
    const list = tests ?? []
    return Object.keys(instrumentStyles).map((instrument) => {
      const used = list.filter((t) => t.instrument === instrument)
      const pass = used.filter((t) => t.result === 'Pass').length
      return {
        instrument,
        measures: instrumentStyles[instrument].measures,
        tests: used.length,
        passRatePct: used.length ? Math.round((pass / used.length) * 1000) / 10 : 0,
      }
    })
  }, [tests])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Cotton Testing"
        description="Central Testing Laboratory — USTER HVI, USTER AFIS PRO-2 and Trash Separator readings on incoming cotton."
      />

      {tests === undefined ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </StatGrid>
      ) : (
        <StatGrid>
          <StatCard label="Cotton tests" value={formatNumber(stats.total)} icon={Microscope} />
          <StatCard
            label="Pass rate"
            value={`${stats.passRatePct}%`}
            icon={CircleCheck}
            tone={stats.passRatePct >= 85 ? 'success' : 'warning'}
          />
          <StatCard
            label="Lots in testing"
            value={formatNumber(stats.lotsInTesting)}
            sublabel="Awaiting lab clearance"
            icon={FlaskConical}
            tone="warning"
          />
          <StatCard label="Failed tests" value={formatNumber(stats.failed)} icon={CircleX} tone="danger" />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {tests === undefined ? (
            <Skeleton className="h-[320px] w-full rounded-lg" />
          ) : (
            <MicronaireChart tests={tests} />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Instruments in Use</CardTitle>
            <p className="text-xs text-muted-foreground">Cotton bench of the Central Testing Laboratory</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {instrumentUsage.map((row) => (
              <div key={row.instrument} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <InstrumentBadge instrument={row.instrument as LabInstrument} />
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {formatNumber(row.tests)} tests
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">{row.measures}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">Pass rate {row.passRatePct}%</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cotton Test Register</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tests ?? []}
            isLoading={isLoading}
            emptyMessage="No cotton tests recorded."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
