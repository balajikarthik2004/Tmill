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
import { Factory, Hash, Trash2, TriangleAlert } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getFactories, getRejectionBreakdown, getRejections } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatKg, formatNumber } from '@/lib/format'
import type { Rejection } from '@/types'

const chartTooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  fontSize: 12,
  background: 'hsl(var(--popover))',
}

const unitColors = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#db2777']

export default function Rejections() {
  const rejections = useAsync(getRejections, [])
  const breakdown = useAsync(() => getRejectionBreakdown(), [])
  const factories = useAsync(getFactories, [])

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.name])),
    [factories.data],
  )

  const rows = rejections.data ?? []
  const worstReason = breakdown.data?.byReason[0]
  const worstUnit = breakdown.data?.byFactory[0]

  const reasonBars = useMemo(
    () => (breakdown.data?.byReason ?? []).map((r) => ({ ...r, label: r.key })),
    [breakdown.data],
  )

  const unitBars = useMemo(
    () =>
      (breakdown.data?.byFactory ?? []).map((r) => ({
        ...r,
        label: factoryNames.get(r.key) ?? r.key,
      })),
    [breakdown.data, factoryNames],
  )

  const columns = useMemo<ColumnDef<Rejection, any>[]>(
    () => [
      { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ row }) => <Badge variant="outline">{row.original.stage}</Badge>,
      },
      { accessorKey: 'reason', header: 'Reason' },
      {
        accessorKey: 'qtyKg',
        header: 'Qty Rejected',
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-danger-600">{formatKg(row.original.qtyKg)}</span>
        ),
      },
      {
        accessorKey: 'factoryId',
        header: 'Unit',
        cell: ({ row }) => factoryNames.get(row.original.factoryId) ?? row.original.factoryId,
      },
    ],
    [factoryNames],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Rejections"
        description="Material written off at cotton, yarn and fabric stages across all five units."
      />

      {breakdown.isLoading || !breakdown.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard
            label="Rejection entries"
            value={formatNumber(breakdown.data.totalCount)}
            sublabel="Last 30 days"
            icon={Hash}
            tone="info"
          />
          <StatCard
            label="Total rejected"
            value={formatKg(breakdown.data.totalKg)}
            sublabel="All stages"
            icon={Trash2}
            tone="danger"
          />
          <StatCard
            label="Worst reason"
            value={worstReason?.key ?? '—'}
            sublabel={worstReason ? formatKg(worstReason.qtyKg) : 'Nothing rejected'}
            icon={TriangleAlert}
            tone="warning"
          />
          <StatCard
            label="Worst unit"
            value={worstUnit ? (factoryNames.get(worstUnit.key) ?? worstUnit.key) : '—'}
            sublabel={worstUnit ? formatKg(worstUnit.qtyKg) : 'Nothing rejected'}
            icon={Factory}
            tone="warning"
          />
        </StatGrid>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rejected Quantity by Reason</CardTitle>
            <p className="text-xs text-muted-foreground">Root causes ranked by kilograms lost</p>
          </CardHeader>
          <CardContent>
            {breakdown.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : reasonBars.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                No rejections recorded.
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={reasonBars} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
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
                      width={150}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [formatKg(Number(value)), 'Rejected']}
                    />
                    <Bar dataKey="qtyKg" name="Rejected" radius={[0, 4, 4, 0]} maxBarSize={20} fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rejected Quantity by Unit</CardTitle>
            <p className="text-xs text-muted-foreground">
              Spinning Mills I–III, Open End &amp; Post-Spinning, Weaving
            </p>
          </CardHeader>
          <CardContent>
            {breakdown.isLoading || factories.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : unitBars.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                No rejections recorded.
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitBars} margin={{ top: 4, right: 8, left: -6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      height={44}
                      angle={-12}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(v: number) => Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [formatKg(Number(value)), 'Rejected']}
                    />
                    <Bar dataKey="qtyKg" name="Rejected" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {unitBars.map((bar, i) => (
                        <Cell key={bar.key} fill={unitColors[i % unitColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rejection Register</CardTitle>
          <p className="text-xs text-muted-foreground">Sort any column to isolate the heaviest losses.</p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={rejections.isLoading || factories.isLoading}
            emptyMessage="No rejections recorded."
            pageSize={12}
          />
        </CardContent>
      </Card>
    </div>
  )
}
