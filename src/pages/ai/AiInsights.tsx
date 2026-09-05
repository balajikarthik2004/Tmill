import { useMemo, useState } from 'react'
import { Lightbulb, Radar, Sparkles, TrendingUp, TriangleAlert, Wand2 } from 'lucide-react'

import type { AiInsightKind, AiScope } from '@/types'
import { useAsync } from '@/hooks/useAsync'
import { getAllAiInsights } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { AiInsightCard } from '@/components/ai/AiInsightStrip'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const SCOPES: Array<{ value: AiScope | 'all'; label: string }> = [
  { value: 'all', label: 'All areas' },
  { value: 'dashboard', label: 'Executive' },
  { value: 'production', label: 'Production' },
  { value: 'quality', label: 'Quality' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'sales', label: 'Sales & orders' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'energy', label: 'Energy' },
]

const KINDS: Array<{ value: AiInsightKind | 'all'; label: string }> = [
  { value: 'all', label: 'Everything' },
  { value: 'risk', label: 'Risks' },
  { value: 'anomaly', label: 'Anomalies' },
  { value: 'forecast', label: 'Forecasts' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'recommendation', label: 'Recommendations' },
]

export default function AiInsights() {
  const [scope, setScope] = useState<AiScope | 'all'>('all')
  const [kind, setKind] = useState<AiInsightKind | 'all'>('all')
  const { data, isLoading } = useAsync(getAllAiInsights, [])

  const insights = useMemo(() => data ?? [], [data])

  const filtered = useMemo(() => {
    const severityRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const
    return insights
      .filter((i) => (scope === 'all' ? true : i.scope === scope))
      .filter((i) => (kind === 'all' ? true : i.kind === kind))
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.confidencePct - a.confidencePct)
  }, [insights, scope, kind])

  const counts = useMemo(
    () => ({
      risks: insights.filter((i) => i.kind === 'risk').length,
      anomalies: insights.filter((i) => i.kind === 'anomaly').length,
      forecasts: insights.filter((i) => i.kind === 'forecast').length,
      actions: insights.filter((i) => i.kind === 'recommendation' || i.kind === 'opportunity').length,
      critical: insights.filter((i) => i.severity === 'critical').length,
      avgConfidence: insights.length
        ? Math.round(insights.reduce((s, i) => s + i.confidencePct, 0) / insights.length)
        : 0,
    }),
    [insights],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="AI Insights & Anomalies"
        description="What the copilot flagged from the live plant record without being asked — ranked by severity, each one openable as a full diagnosis."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard label="Open insights" value={insights.length} icon={Sparkles} tone="info" />
          <StatCard label="Critical" value={counts.critical} icon={TriangleAlert} tone="danger" />
          <StatCard label="Risks" value={counts.risks} icon={TriangleAlert} tone="warning" />
          <StatCard label="Anomalies" value={counts.anomalies} icon={Radar} tone="warning" />
          <StatCard label="Forecasts" value={counts.forecasts} icon={TrendingUp} tone="info" />
          <StatCard
            label="Avg confidence"
            value={`${counts.avgConfidence}%`}
            icon={Wand2}
            tone="success"
            sublabel={`${counts.actions} actionable`}
          />
        </StatGrid>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {SCOPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScope(option.value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                scope === option.value
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {KINDS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                kind === option.value
                  ? 'border-copper-200 bg-copper-50 text-copper-700'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-12 text-center">
          <Lightbulb className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nothing flagged in this filter</p>
          <p className="text-xs text-muted-foreground">
            The copilot only raises an insight when a live condition warrants it.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((insight) => (
            <AiInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  )
}
