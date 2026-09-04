import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { FlaskConical } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCottonLots, getProducts, getQualityTests } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/tables/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import type { LabInstrument, QualityParameters, QualityStage, QualityTest } from '@/types'

type ParamKey = keyof QualityParameters

interface ParamMeta {
  label: string
  unit?: string
  /** Lab instruments capable of producing this reading, most specific first. */
  instruments: LabInstrument[]
}

const parameterMeta: Record<ParamKey, ParamMeta> = {
  count: { label: 'Count', instruments: ['USTER CMT5'] },
  strength: {
    label: 'Tenacity',
    unit: 'g/tex',
    instruments: ['USTER Tensojet', 'USTER Strength Tester', 'USTER CMT5', 'USTER HVI'],
  },
  csp: { label: 'CSP', instruments: ['CSP Tester'] },
  uster: { label: 'Evenness U%', unit: '%', instruments: ['USTER UT5', 'USTER UTR4', 'USTER UTJ4'] },
  hairiness: { label: 'Hairiness index', instruments: ['Zweigle Hairiness', 'USTER UT5'] },
  tpi: { label: 'Twist', unit: 'TPI', instruments: ['TPI Tester'] },
  imperfections: {
    label: 'Imperfections (IPI)',
    unit: '/1000 m',
    instruments: ['USTER UT5', 'USTER UTR4', 'USTER UTJ4'],
  },
  micronaire: { label: 'Micronaire', instruments: ['USTER HVI'] },
  staple: { label: 'Staple length', unit: 'mm', instruments: ['USTER HVI'] },
  nepsPerGram: { label: 'Neps', unit: '/gram', instruments: ['USTER AFIS PRO-2'] },
  trashPct: { label: 'Trash', unit: '%', instruments: ['Trash Separator', 'USTER HVI'] },
  moisturePct: { label: 'Moisture', unit: '%', instruments: ['USTER Eva Tester', 'USTER HVI'] },
}

const parameterOrder: ParamKey[] = [
  'count',
  'micronaire',
  'staple',
  'strength',
  'csp',
  'uster',
  'hairiness',
  'tpi',
  'imperfections',
  'nepsPerGram',
  'trashPct',
  'moisturePct',
]

function recordedParameters(test: QualityTest): { key: ParamKey; value: string | number }[] {
  return parameterOrder
    .filter((key) => test.parameters[key] !== undefined)
    .map((key) => ({ key, value: test.parameters[key] as string | number }))
}

function formatParamValue(key: ParamKey, value: string | number) {
  const { unit } = parameterMeta[key]
  const text = typeof value === 'number' ? formatNumber(value) : value
  return unit ? `${text} ${unit}` : text
}

/** The instrument on this test if it can produce the reading, else its canonical source. */
function instrumentFor(test: QualityTest, key: ParamKey): LabInstrument {
  const { instruments } = parameterMeta[key]
  return instruments.includes(test.instrument) ? test.instrument : instruments[0]
}

const stageOptions: (QualityStage | 'all')[] = ['all', 'Cotton', 'Yarn', 'Fabric']
const resultOptions = ['all', 'Pass', 'Rework', 'Fail']

export default function LabTests() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selected, setSelected] = useState<QualityTest | null>(null)

  const stage = searchParams.get('stage') ?? 'all'
  const result = searchParams.get('result') ?? 'all'

  const setFilter = (key: 'stage' | 'result', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const { data, isLoading } = useAsync(
    () =>
      getQualityTests({
        stage: stage === 'all' ? undefined : (stage as QualityStage),
        result: result === 'all' ? undefined : result,
      }),
    [stage, result],
  )
  const products = useAsync(getProducts, [])
  const cottonLots = useAsync(() => getCottonLots(), [])

  const productNames = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.id, p.name])),
    [products.data],
  )
  const lotNumbers = useMemo(
    () => new Map((cottonLots.data ?? []).map((l) => [l.id, `${l.lotNumber} · ${l.origin}`])),
    [cottonLots.data],
  )

  const subjectOf = (test: QualityTest) => {
    if (test.cottonLotId) return lotNumbers.get(test.cottonLotId) ?? test.cottonLotId
    if (test.productId) return productNames.get(test.productId) ?? test.productId
    return 'Greige fabric — weaving unit'
  }

  const rows = data ?? []
  const passCount = rows.filter((t) => t.result === 'Pass').length
  const passRate = rows.length ? (passCount / rows.length) * 100 : 0

  const columns = useMemo<ColumnDef<QualityTest, any>[]>(
    () => [
      { accessorKey: 'testNo', header: 'Test No' },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ row }) => <Badge variant="outline">{row.original.stage}</Badge>,
      },
      { accessorKey: 'instrument', header: 'Instrument' },
      {
        id: 'subject',
        header: 'Product / Cotton Lot',
        accessorFn: (row) => subjectOf(row),
        cell: ({ row }) => (
          <span className="block max-w-56 truncate">{subjectOf(row.original)}</span>
        ),
      },
      {
        id: 'parameters',
        header: 'Key Parameters',
        enableSorting: false,
        cell: ({ row }) => {
          const params = recordedParameters(row.original).slice(0, 3)
          return (
            <span className="text-xs text-muted-foreground">
              {params
                .map((p) => `${parameterMeta[p.key].label} ${formatParamValue(p.key, p.value)}`)
                .join(' · ')}
            </span>
          )
        },
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productNames, lotNumbers],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Lab Tests"
        description="Every test raised by the Central Testing Laboratory, with the instrument behind each reading."
        actions={
          <div className="flex items-center gap-2">
            <Select value={stage} onValueChange={(v) => setFilter('stage', v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === 'all' ? 'All stages' : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={result} onValueChange={(v) => setFilter('result', v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resultOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === 'all' ? 'All results' : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <StatGrid cols={4}>
        <StatCard label="Tests shown" value={formatNumber(rows.length)} icon={FlaskConical} tone="info" />
        <StatCard label="Passed" value={formatNumber(passCount)} tone="success" />
        <StatCard label="Pass rate" value={formatPct(passRate)} tone="success" />
        <StatCard
          label="Held (rework / fail)"
          value={formatNumber(rows.length - passCount)}
          tone="danger"
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Test Register</CardTitle>
          <p className="text-xs text-muted-foreground">Select a row to see every recorded parameter.</p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            emptyMessage="No lab tests match this filter."
            onRowClick={(row) => setSelected(row)}
            pageSize={12}
          />
        </CardContent>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.testNo}</SheetTitle>
                <SheetDescription>
                  {selected.stage} stage · tested on {selected.instrument} by {selected.testedBy}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-5 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.result} />
                  <Badge variant="outline">{selected.stage}</Badge>
                  <Badge variant="secondary">{formatDate(selected.testedDate)}</Badge>
                </div>

                <div className="rounded-md border border-border p-3">
                  <div className="text-xs text-muted-foreground">Sample</div>
                  <div className="text-sm font-medium text-foreground">{subjectOf(selected)}</div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recorded parameters
                  </div>
                  <div className="divide-y divide-border rounded-md border border-border">
                    {recordedParameters(selected).map(({ key, value }) => (
                      <div key={key} className="flex items-start justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {parameterMeta[key].label}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {instrumentFor(selected, key)}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatParamValue(key, value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.remarks && (
                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="text-xs font-medium text-muted-foreground">Remarks</div>
                    <p className="mt-0.5 text-sm text-foreground">{selected.remarks}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
