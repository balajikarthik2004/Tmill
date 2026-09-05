import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'

import { useAsync } from '@/hooks/useAsync'
import { getSalesOrders } from '@/services'
import { formatDate, formatNumber } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DataTable } from '@/components/tables/DataTable'
import { RiskBadge } from '@/components/tables/RiskBadge'
import type { RiskLevel, SalesOrder } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'

function ProgressCell({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className="h-1.5 w-16" />
      <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">{value}%</span>
    </div>
  )
}

const columns: ColumnDef<SalesOrder, any>[] = [
  { accessorKey: 'orderNo', header: 'Order ID' },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'country', header: 'Country' },
  { accessorKey: 'productName', header: 'Product' },
  {
    accessorKey: 'qtyOrdered',
    header: 'Qty',
    cell: ({ row }) => `${formatNumber(row.original.qtyOrdered)} ${row.original.unit}`,
  },
  { accessorKey: 'dueDate', header: 'Due', cell: ({ row }) => formatDate(row.original.dueDate) },
  { accessorKey: 'productionPct', header: 'Production', cell: ({ row }) => <ProgressCell value={row.original.productionPct} /> },
  { accessorKey: 'qualityPct', header: 'Quality', cell: ({ row }) => <ProgressCell value={row.original.qualityPct} /> },
  { accessorKey: 'dispatchPct', header: 'Dispatch', cell: ({ row }) => <ProgressCell value={row.original.dispatchPct} /> },
  { accessorKey: 'risk', header: 'Risk', cell: ({ row }) => <RiskBadge risk={row.original.risk} /> },
]

const riskFilterLabels: Record<string, string> = {
  high: 'At Risk & Delayed',
  onSchedule: 'On Schedule',
  atRisk: 'At Risk',
  delayed: 'Delayed',
  completed: 'Completed',
}

export default function SalesOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const riskParam = searchParams.get('risk') as RiskLevel | 'high' | null

  const { data, isLoading } = useAsync(() => getSalesOrders({ risk: riskParam ?? undefined }), [riskParam])

  const total = data?.length ?? 0
  const totalValue = useMemo(() => (data ?? []).reduce((sum, o) => sum + o.valueInr, 0), [data])

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Sales Orders"
        description="Track production progress against dispatch deadlines across all factories."
      />


      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSearchParams(new URLSearchParams())}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            !riskParam
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-card text-muted-foreground border border-border hover:border-brand-200 hover:bg-accent hover:text-foreground'
          }`}
        >
          All Orders
        </button>
        {Object.entries(riskFilterLabels).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSearchParams(new URLSearchParams({ risk: key }))}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              riskParam === key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-muted-foreground border border-border hover:bg-brand-50 hover:text-brand-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3.5">
          <div className="text-xs text-muted-foreground">Orders shown</div>
          <div className="num text-lg font-semibold text-foreground">{formatNumber(total)}</div>
        </Card>
        <Card className="p-3.5">
          <div className="text-xs text-muted-foreground">Total value</div>
          <div className="num text-lg font-semibold text-foreground">
            ₹{Intl.NumberFormat('en-IN', { notation: 'compact' }).format(totalValue)}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data ?? []}
            isLoading={isLoading}
            emptyMessage="No sales orders match this filter."
            onRowClick={(row) => navigate(`/sales/sales-orders?highlight=${row.id}`)}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
