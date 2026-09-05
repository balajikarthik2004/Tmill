import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Lightbulb,
  Radar,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Wand2,
} from 'lucide-react'

import type { AiInsight, AiInsightKind, AiScope } from '@/types'
import { useAsync } from '@/hooks/useAsync'
import { getAiInsights } from '@/services'
import { useAiStore } from '@/store/aiStore'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const kindIcon: Record<AiInsightKind, typeof Sparkles> = {
  risk: TriangleAlert,
  anomaly: Radar,
  opportunity: Lightbulb,
  forecast: TrendingUp,
  recommendation: Wand2,
}

const kindLabel: Record<AiInsightKind, string> = {
  risk: 'Risk',
  anomaly: 'Anomaly',
  opportunity: 'Opportunity',
  forecast: 'Forecast',
  recommendation: 'Recommendation',
}

const severityAccent: Record<AiInsight['severity'], string> = {
  critical: 'bg-danger-500',
  high: 'bg-warning-500',
  medium: 'bg-info-500',
  low: 'bg-brand-400',
  info: 'bg-brand-400',
}

const severityChip: Record<AiInsight['severity'], string> = {
  critical: 'bg-danger-50 text-danger-700 ring-danger-100',
  high: 'bg-warning-50 text-warning-700 ring-warning-100',
  medium: 'bg-info-50 text-info-700 ring-info-100',
  low: 'bg-brand-50 text-brand-700 ring-brand-100',
  info: 'bg-brand-50 text-brand-700 ring-brand-100',
}

export function AiInsightCard({ insight }: { insight: AiInsight }) {
  const navigate = useNavigate()
  const queuePrompt = useAiStore((s) => s.queuePrompt)
  const Icon = kindIcon[insight.kind]

  function askCopilot() {
    queuePrompt(insight.prompt)
    navigate('/ai')
  }

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <span className={cn('absolute inset-x-0 top-0 h-0.5', severityAccent[insight.severity])} />

      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          <Icon className="h-3 w-3" />
        </span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ring-1 ring-inset',
            severityChip[insight.severity],
          )}
        >
          {kindLabel[insight.kind]}
        </span>
        <span className="num ml-auto text-[10px] font-semibold text-muted-foreground">
          {insight.confidencePct}% confidence
        </span>
      </div>

      <h4 className="mt-2 text-[12.5px] font-semibold leading-snug text-foreground">{insight.title}</h4>
      <p className="mt-1 line-clamp-3 text-[11.5px] leading-relaxed text-muted-foreground">{insight.detail}</p>

      <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-copper-50 px-1.5 py-0.5 text-[10px] font-semibold text-copper-700">
        {insight.impact}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-2.5">
        <button
          type="button"
          onClick={askCopilot}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xs transition-colors hover:bg-brand-600"
        >
          <Sparkles className="h-3 w-3" />
          Ask the copilot
        </button>
        {insight.linkTo && (
          <Link
            to={insight.linkTo}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-brand-600"
          >
            {insight.linkLabel ?? 'Open'}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

/**
 * The proactive AI band that sits on the main dashboards. Insights are derived
 * from live plant conditions and each one hands its question to the copilot.
 */
export function AiInsightStrip({
  scope,
  limit = 3,
  title = 'AI insights',
  description,
}: {
  scope: AiScope
  limit?: number
  title?: string
  description?: string
}) {
  const { data, isLoading } = useAsync(() => getAiInsights(scope, limit), [scope, limit])

  return (
    <section className="rounded-xl border border-brand-100 bg-linear-to-br from-brand-50/60 via-card to-card p-3.5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-forest-800 text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h3 className="font-display text-[13px] font-semibold tracking-tight text-foreground">{title}</h3>
        <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-brand-700">
          Live
        </span>
        <p className="w-full text-[11px] text-muted-foreground sm:w-auto sm:flex-1">
          {description ?? 'Generated from the current plant record and the resolution knowledge base.'}
        </p>
        <Link
          to="/ai/insights"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
        >
          All insights
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-3',
            limit >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2',
          )}
        >
          {(data ?? []).map((insight) => (
            <AiInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </section>
  )
}
