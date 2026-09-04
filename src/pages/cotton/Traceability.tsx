import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  Cog,
  FlaskConical,
  GitBranch,
  Package,
  Search,
  Ship,
  ShoppingCart,
  Sprout,
  Truck,
} from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getTraceGraph, getTraceableBatches } from '@/services'
import { formatDate, formatKg } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { TraceNode, TraceNodeType } from '@/types'

/**
 * The chain the graph walks, root to source:
 * Customer -> Sales Order -> Production Order -> Production Batch -> Machine -> Cotton Lot -> Supplier.
 * Quality tests and downstream records hang off the batch as attached leaves.
 */
const chainOrder: TraceNodeType[] = [
  'Customer',
  'SalesOrder',
  'ProductionOrder',
  'ProductionBatch',
  'Machine',
  'CottonLot',
  'Supplier',
]

const nodeMeta: Record<TraceNodeType, { icon: LucideIcon; accent: string; caption: string }> = {
  Customer: { icon: Building2, accent: 'bg-info-50 text-info-600', caption: 'Customer' },
  SalesOrder: { icon: ShoppingCart, accent: 'bg-success-50 text-success-600', caption: 'Sales order' },
  ProductionOrder: { icon: ClipboardList, accent: 'bg-warning-50 text-warning-600', caption: 'Production order' },
  ProductionBatch: { icon: Boxes, accent: 'bg-info-50 text-info-600', caption: 'Production batch' },
  Machine: { icon: Cog, accent: 'bg-muted text-muted-foreground', caption: 'Machine' },
  CottonLot: { icon: Sprout, accent: 'bg-success-50 text-success-600', caption: 'Cotton lot' },
  Supplier: { icon: Truck, accent: 'bg-warning-50 text-warning-600', caption: 'Supplier' },
  QualityTest: { icon: FlaskConical, accent: 'bg-info-50 text-info-600', caption: 'Lab test' },
  FinishedGoods: { icon: Package, accent: 'bg-muted text-muted-foreground', caption: 'Finished goods' },
  Dispatch: { icon: Ship, accent: 'bg-muted text-muted-foreground', caption: 'Dispatch' },
}

function TraceNodeCard({ node, step, className }: { node: TraceNode; step?: number; className?: string }) {
  const meta = nodeMeta[node.type]
  const Icon = meta.icon
  return (
    <Link
      to={node.linkTo}
      className={cn(
        'group block rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {step !== undefined ? `${step}. ` : ''}
            {meta.caption}
          </div>
          <div className="truncate text-sm font-semibold text-foreground group-hover:text-primary">{node.label}</div>
          {node.sublabel && <div className="truncate text-xs text-muted-foreground">{node.sublabel}</div>}
        </div>
      </div>
    </Link>
  )
}

function TraceChain({ nodes }: { nodes: TraceNode[] }) {
  const byType = new Map(nodes.map((n) => [n.type, n]))
  const chain = chainOrder.map((type) => byType.get(type)).filter((n): n is TraceNode => n !== undefined)
  const chainIds = new Set(chain.map((n) => n.id))
  const attached = nodes.filter((n) => !chainIds.has(n.id))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {chain.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center gap-2 sm:flex-row">
            <TraceNodeCard node={node} step={i + 1} className="w-full sm:flex-1" />
            {i < chain.length - 1 && (
              <ChevronRight className="h-5 w-5 shrink-0 rotate-90 text-muted-foreground/70 sm:rotate-0" />
            )}
          </div>
        ))}
      </div>

      {attached.length > 0 && (
        <div className="rounded-lg border border-dashed border-border p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Attached to the batch
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {attached.map((node) => (
              <TraceNodeCard key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Traceability() {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)

  const { data: batches, isLoading: batchesLoading } = useAsync(() => getTraceableBatches(), [])

  const filtered = useMemo(() => {
    const list = batches ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((b) =>
      [b.batchNo, b.customerName, b.salesOrderNo, b.cottonLotNumber, b.cottonOrigin, b.machineCode]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [batches, query])

  const activeId = picked ?? filtered[0]?.id ?? null
  const activeBatch = (batches ?? []).find((b) => b.id === activeId)

  const { data: graph, isLoading: graphLoading } = useAsync(
    () => (activeId ? getTraceGraph(activeId) : Promise.resolve(null)),
    [activeId],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Traceability"
        description="Follow any yarn batch back from the customer to the cotton bale and the supplier who shipped it."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Production Batches</CardTitle>
            <div className="relative mt-1.5">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPicked(null)
                }}
                placeholder="Batch, customer, order, lot…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {batchesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                No batch matches “{query}”.
              </div>
            ) : (
              <div className="scrollbar-thin max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
                {filtered.map((batch) => (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => setPicked(batch.id)}
                    className={cn(
                      'w-full rounded-md border p-2.5 text-left transition-colors',
                      batch.id === activeId
                        ? 'border-primary/50 bg-accent'
                        : 'border-border hover:border-primary/30 hover:bg-accent/60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">{batch.batchNo}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {formatKg(batch.qtyKg)}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{batch.customerName}</div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {batch.cottonLotNumber} · {batch.machineCode}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle>Trace Chain</CardTitle>
            {activeBatch ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="info">{activeBatch.batchNo}</Badge>
                <Badge variant="outline">{activeBatch.cottonOrigin}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatKg(activeBatch.qtyKg)} produced on {formatDate(activeBatch.producedDate)} · shift{' '}
                  {activeBatch.shift}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pick a production batch to walk its chain end to end.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {graphLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[68px] w-full" />
                ))}
              </div>
            ) : !graph || graph.nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-16 text-center">
                <GitBranch className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {activeId
                    ? 'No linked records could be resolved for this batch.'
                    : 'Select a production batch from the list to see its trace chain.'}
                </p>
              </div>
            ) : (
              <TraceChain nodes={graph.nodes} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
