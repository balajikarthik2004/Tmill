import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChevronDown,
  CircleDot,
  Clock,
  Database,
  ExternalLink,
  Flag,
  Gauge,
  Info,
  Lightbulb,
  ListChecks,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'

import type {
  AiAnswer,
  AiBlock,
  AiCause,
  AiEngineerMatch,
  AiHistoricalCase,
  AiMetric,
  AiPlan,
  AiTone,
} from '@/types'
import { cn } from '@/lib/utils'
import { formatDate, formatInrCompact } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

/* ------------------------------------------------------------- utilities */

const toneText: Record<AiTone, string> = {
  neutral: 'text-foreground',
  success: 'text-success-700',
  warning: 'text-warning-700',
  danger: 'text-danger-700',
  info: 'text-info-700',
}

const toneChip: Record<AiTone, string> = {
  neutral: 'bg-secondary text-secondary-foreground ring-border',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
  info: 'bg-info-50 text-info-700 ring-info-100',
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${Number(hours.toFixed(1))} h`
  return `${Number((hours / 24).toFixed(1))} days`
}

/** Reveals text a few words at a time, the way a streamed response arrives. */
function useStreamedText(text: string, enabled: boolean) {
  const words = useMemo(() => text.split(' '), [text])
  const [count, setCount] = useState(enabled ? 0 : words.length)

  useEffect(() => {
    if (!enabled) {
      setCount(words.length)
      return
    }
    setCount(0)
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= words.length) {
          clearInterval(timer)
          return c
        }
        return c + 6
      })
    }, 16)
    return () => clearInterval(timer)
  }, [words, enabled])

  return {
    shown: words.slice(0, count).join(' '),
    done: count >= words.length,
  }
}

function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Sparkles
  title: string
  hint?: string
}) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <span className="flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        <Icon className="h-3 w-3" />
      </span>
      <h4 className="font-display text-[12.5px] font-semibold tracking-tight text-foreground">{title}</h4>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

/* ---------------------------------------------------------------- blocks */

function MetricsBlock({ title, items }: { title: string; items: AiMetric[] }) {
  return (
    <div>
      <SectionHeading icon={Gauge} title={title} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-muted/35 px-3 py-2"
          >
            <div className="truncate text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </div>
            <div className={cn('num mt-0.5 truncate text-[15px] font-semibold', toneText[item.tone ?? 'neutral'])}>
              {item.value}
            </div>
            {item.hint && <div className="truncate text-[10.5px] text-muted-foreground">{item.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function DiagnosisBlock({ title, causes }: { title: string; causes: AiCause[] }) {
  return (
    <div>
      <SectionHeading icon={Activity} title={title} hint="ranked by likelihood against the evidence" />
      <div className="space-y-2">
        {causes.map((cause, index) => (
          <div key={cause.cause} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset',
                  index === 0 ? toneChip.danger : index === 1 ? toneChip.warning : toneChip.neutral,
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-foreground">{cause.cause}</span>
                  <span className="num shrink-0 text-[12px] font-semibold text-brand-600">
                    {cause.likelihood}%
                  </span>
                </div>
                <Progress
                  value={cause.likelihood}
                  className="mt-1.5 h-1"
                  indicatorClassName={
                    index === 0 ? 'bg-danger-500' : index === 1 ? 'bg-warning-500' : 'bg-info-500'
                  }
                />
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{cause.evidence}</p>
                {cause.signal && (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-copper-50 px-2 py-0.5 text-[10.5px] font-medium text-copper-700">
                    <CircleDot className="h-2.5 w-2.5" />
                    {cause.signal}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoryCase({ item }: { item: AiHistoricalCase }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/60"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-md bg-brand-50 text-brand-700">
          <span className="num text-[11px] font-bold leading-none">{item.similarityPct}%</span>
          <span className="text-[7px] font-semibold uppercase tracking-wide">match</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12.5px] font-semibold text-foreground">{item.title}</span>
            <Badge variant="outline" className="text-[10px]">
              {item.refNo}
            </Badge>
            {item.machineCode && (
              <Badge variant="secondary" className="text-[10px]">
                {item.machineCode}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
            <span>{formatDate(item.occurredAt)}</span>
            <span>{item.factoryLabel}</span>
            {item.downtimeHrs > 0 && <span>{formatHours(item.downtimeHrs)} downtime</span>}
            <span>{formatInrCompact(item.costInr)} cost</span>
            <span>seen {item.recurrence}x</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Root cause: </span>
            {item.rootCause}
          </p>
        </div>
        <ChevronDown
          className={cn('mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-muted/25"
          >
            <div className="space-y-3 p-3">
              <div>
                <div className="section-label mb-1.5 text-copper-600">What we did</div>
                <ol className="space-y-1.5">
                  {item.resolutionSteps.map((step, i) => (
                    <li key={step.step} className="flex gap-2 text-[11.5px]">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-foreground">{step.step}</span>
                        <span className="ml-1.5 text-[10px] text-muted-foreground">
                          {formatHours(step.durationHrs)}
                        </span>
                        <div className="text-muted-foreground">{step.detail}</div>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="section-label mb-1 text-copper-600">Resolved by</div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.resolvedBy.map((person) => (
                      <span
                        key={person.id}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10.5px] font-medium text-foreground"
                      >
                        <Users className="h-2.5 w-2.5 text-brand-600" />
                        {person.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="section-label mb-1 text-copper-600">Outcome</div>
                  <p className="text-[11.5px] text-muted-foreground">{item.outcome}</p>
                </div>
              </div>

              <div className="rounded-md border border-success-100 bg-success-50 px-2.5 py-2">
                <div className="flex items-start gap-1.5">
                  <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-success-600" />
                  <div>
                    <span className="text-[11px] font-semibold text-success-700">Preventive action taken: </span>
                    <span className="text-[11px] text-success-700">{item.preventiveAction}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function HistoryBlock({ title, cases }: { title: string; cases: AiHistoricalCase[] }) {
  return (
    <div>
      <SectionHeading icon={BookOpen} title={title} hint="click a case to see the full resolution" />
      <div className="space-y-2">
        {cases.map((item) => (
          <HistoryCase key={item.incidentId} item={item} />
        ))}
      </div>
    </div>
  )
}

const availabilityTone: Record<AiEngineerMatch['availability'], AiTone> = {
  Available: 'success',
  'On shift': 'info',
  'On another job': 'warning',
  'Off shift': 'neutral',
  'On leave': 'danger',
}

function EngineersBlock({ title, people }: { title: string; people: AiEngineerMatch[] }) {
  return (
    <div>
      <SectionHeading icon={Users} title={title} hint="ranked on past fixes, skills and availability" />
      <div className="space-y-2">
        {people.map((person, index) => (
          <div
            key={person.engineerId}
            className={cn(
              'rounded-lg border p-3',
              index === 0 ? 'border-brand-200 bg-brand-50/40' : 'border-border bg-card',
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                  index === 0 ? 'bg-brand-600 text-white' : 'bg-secondary text-secondary-foreground',
                )}
              >
                {person.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[13px] font-semibold text-foreground">{person.name}</span>
                  {index === 0 && (
                    <Badge variant="copper" className="text-[9.5px]">
                      Best match
                    </Badge>
                  )}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ring-1 ring-inset',
                      toneChip[availabilityTone[person.availability]],
                    )}
                  >
                    {person.availability}
                  </span>
                  <span className="num ml-auto text-[12px] font-bold text-brand-600">{person.matchPct}%</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {person.role} · {person.factoryLabel} · {person.shift}
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-foreground">
                  <span className="font-medium">Why: </span>
                  {person.reason}.
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {person.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-2 text-[10.5px] sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Past fixes </span>
                    <span className="num font-semibold text-foreground">{person.pastFixes}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">First-time fix </span>
                    <span className="num font-semibold text-foreground">{person.firstTimeFixPct}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg MTTR </span>
                    <span className="num font-semibold text-foreground">{person.avgMttrHrs} h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{person.contact}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlanBlock({ plan }: { plan: AiPlan }) {
  const [showDetail, setShowDetail] = useState(false)
  const span = Math.max(plan.totalHrs, 1)

  return (
    <div>
      <SectionHeading icon={ListChecks} title={plan.title} hint={`${plan.phases.length} phases`} />

      <div className="rounded-lg border border-border bg-card">
        {/* Plan header */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-t-lg bg-border sm:grid-cols-4">
          {[
            { label: 'Time to resolve', value: formatHours(plan.totalHrs), icon: Clock, tone: 'info' as AiTone },
            { label: 'Effort', value: `${plan.effortHrs} eng-h`, icon: Wrench, tone: 'neutral' as AiTone },
            {
              label: 'Target completion',
              value: formatDate(plan.etaIso, 'dd MMM, h:mm a'),
              icon: CalendarClock,
              tone: 'neutral' as AiTone,
            },
            { label: 'Confidence', value: `${plan.confidencePct}%`, icon: Target, tone: 'success' as AiTone },
          ].map((stat) => (
            <div key={stat.label} className="bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <stat.icon className="h-2.5 w-2.5" />
                {stat.label}
              </div>
              <div className={cn('num mt-0.5 text-[14px] font-semibold', toneText[stat.tone])}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="p-3">
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">{plan.objective}</p>

          <button
            type="button"
            onClick={() => setShowDetail((s) => !s)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
          >
            {showDetail ? 'Hide the task breakdown' : 'Show the task breakdown'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showDetail && 'rotate-180')} />
          </button>

          <AnimatePresence initial={false}>
            {showDetail && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  {plan.phases.map((phase) => (
                    <div key={phase.id}>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[11.5px] font-semibold text-foreground">{phase.name}</span>
                        <span className="text-[10.5px] text-muted-foreground">{phase.objective}</span>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {phase.tasks.map((task) => {
                          const left = (task.startOffsetHrs / span) * 100
                          const width = Math.max(2, (task.durationHrs / span) * 100)
                          return (
                            <div key={task.id} className="rounded-md border border-border bg-muted/25 px-2.5 py-1.5">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="num text-[9.5px] font-bold text-muted-foreground">{task.id}</span>
                                <span className="text-[11.5px] font-medium text-foreground">{task.name}</span>
                                {task.onCriticalPath ? (
                                  <Badge variant="danger" className="text-[9px]">
                                    critical path
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[9px]">
                                    parallel
                                  </Badge>
                                )}
                                <span className="num ml-auto text-[10.5px] font-semibold text-brand-600">
                                  {formatHours(task.durationHrs)}
                                </span>
                              </div>
                              <div className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                                {task.detail}
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">
                                  {task.owner} · {task.ownerRole}
                                </span>
                                <div className="relative ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                                  <span
                                    className={cn(
                                      'absolute inset-y-0 rounded-full',
                                      task.onCriticalPath ? 'bg-brand-500' : 'bg-copper-400',
                                    )}
                                    style={{ left: `${Math.min(left, 96)}%`, width: `${Math.min(width, 100 - Math.min(left, 96))}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showDetail && (
          <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            <div>
              <div className="section-label mb-1 text-copper-600">Resources needed</div>
              <ul className="space-y-0.5">
                {plan.resources.map((resource) => (
                  <li key={resource} className="flex gap-1.5 text-[11px] text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                    {resource}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="section-label mb-1 text-copper-600">Success criteria</div>
              <ul className="space-y-0.5">
                {plan.successCriteria.map((criterion) => (
                  <li key={criterion} className="flex gap-1.5 text-[11px] text-muted-foreground">
                    <Flag className="mt-0.5 h-2.5 w-2.5 shrink-0 text-success-600" />
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          )}

          <div className="mt-3 border-t border-border pt-3">
            <div className="section-label mb-1.5 text-copper-600">Risks to the estimate</div>
            <div className="space-y-1.5">
              {plan.risks.slice(0, 2).map((risk) => (
                <div key={risk.risk} className="rounded-md border border-warning-100 bg-warning-50/60 px-2.5 py-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 text-warning-600" />
                    <span className="text-[11.5px] font-semibold text-warning-700">{risk.risk}</span>
                    <Badge variant="warning" className="text-[9px]">
                      {risk.likelihood} likelihood
                    </Badge>
                  </div>
                  <div className="mt-0.5 pl-4.5 text-[10.5px] text-warning-700/90">
                    <span className="font-medium">Impact: </span>
                    {risk.impact}. <span className="font-medium">Mitigation: </span>
                    {risk.mitigation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showDetail && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="section-label mb-1 text-copper-600">Assumptions</div>
            <ul className="space-y-0.5">
              {plan.assumptions.map((assumption) => (
                <li key={assumption} className="flex gap-1.5 text-[10.5px] text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                  {assumption}
                </li>
              ))}
            </ul>
            <p className="mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-[10.5px] italic text-muted-foreground">
              {plan.benchmark}
            </p>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TableBlock({
  title,
  columns,
  rows,
}: {
  title: string
  columns: string[]
  rows: Array<{ cells: string[]; tone?: AiTone }>
}) {
  return (
    <div>
      <SectionHeading icon={ListChecks} title={title} />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, index) => (
              <tr key={index} className="border-t border-border">
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      'px-2.5 py-1.5 text-[11.5px]',
                      cellIndex === 0
                        ? cn('font-semibold', toneText[row.tone ?? 'neutral'])
                        : 'text-muted-foreground',
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <p className="mt-1 text-[10.5px] text-muted-foreground">
          Showing 5 of {rows.length}. Open the linked module for the full list.
        </p>
      )}
    </div>
  )
}

const calloutStyles: Record<AiTone, string> = {
  neutral: 'border-border bg-muted/50 text-foreground',
  success: 'border-success-100 bg-success-50 text-success-700',
  warning: 'border-warning-100 bg-warning-50 text-warning-700',
  danger: 'border-danger-100 bg-danger-50 text-danger-700',
  info: 'border-info-100 bg-info-50 text-info-700',
}

function CalloutBlock({ tone, title, body }: { tone: AiTone; title: string; body: string }) {
  const Icon = tone === 'danger' || tone === 'warning' ? AlertTriangle : tone === 'info' ? Info : Lightbulb
  return (
    <div className={cn('rounded-lg border px-3 py-2.5', calloutStyles[tone])}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0">
          <div className="text-[12px] font-semibold">{title}</div>
          <p className="mt-0.5 text-[11.5px] leading-relaxed opacity-90">{body}</p>
        </div>
      </div>
    </div>
  )
}

function BlockRenderer({ block }: { block: AiBlock }) {
  switch (block.kind) {
    case 'metrics':
      return <MetricsBlock title={block.title} items={block.items} />
    case 'diagnosis':
      return <DiagnosisBlock title={block.title} causes={block.causes} />
    case 'history':
      return <HistoryBlock title={block.title} cases={block.cases} />
    case 'engineers':
      return <EngineersBlock title={block.title} people={block.people} />
    case 'plan':
      return <PlanBlock plan={block.plan} />
    case 'table':
      return <TableBlock title={block.title} columns={block.columns} rows={block.rows} />
    case 'callout':
      return <CalloutBlock tone={block.tone} title={block.title} body={block.body} />
    case 'bullets':
      return (
        <div>
          <SectionHeading icon={ListChecks} title={block.title} />
          <ul className="space-y-1">
            {block.items.map((item) => (
              <li key={item} className="flex gap-2 text-[11.5px] text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )
    case 'timeline':
      return (
        <div>
          <SectionHeading icon={TrendingUp} title={block.title} />
          <div className="space-y-2 border-l border-border pl-3">
            {block.steps.map((step) => (
              <div key={step.label} className="relative">
                <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-card" />
                <div className="text-[11.5px] font-semibold text-foreground">{step.label}</div>
                <div className="text-[10.5px] text-muted-foreground">
                  {step.at} — {step.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'text':
      return <p className="text-[12.5px] leading-relaxed text-muted-foreground">{block.body}</p>
    default:
      return null
  }
}

/* ------------------------------------------------------------ the card */

export function AiAnswerCard({
  answer,
  stream = false,
  onFollowUp,
  compact = false,
}: {
  answer: AiAnswer
  /** Reveal the summary progressively - used for the freshest message only. */
  stream?: boolean
  onFollowUp?: (prompt: string) => void
  compact?: boolean
}) {
  const { shown, done } = useStreamedText(answer.summary, stream)
  const [showTrace, setShowTrace] = useState(false)

  const confidenceTone: AiTone =
    answer.confidencePct >= 85 ? 'success' : answer.confidencePct >= 70 ? 'info' : 'warning'

  return (
    <div className={cn('min-w-0 flex-1 space-y-3.5', compact && 'space-y-3')}>
      {/* Headline */}
      <div className="rounded-xl rounded-tl-none border border-brand-100 bg-card p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="font-display text-[14px] font-semibold leading-snug tracking-tight text-foreground">
            {answer.headline}
          </h3>
          <span
            className={cn(
              'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
              toneChip[confidenceTone],
            )}
          >
            {answer.confidencePct}% confidence
          </span>
        </div>

        {answer.entities.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {answer.entities.map((entity) => (
              <span
                key={`${entity.type}-${entity.value}`}
                className="rounded-md border border-copper-100 bg-copper-50 px-1.5 py-0.5 text-[10px] font-medium text-copper-700"
              >
                {entity.label}
              </span>
            ))}
          </div>
        )}

        <p className="mt-2 text-[12.5px] leading-relaxed text-foreground">
          {shown}
          {!done && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-brand-400 align-middle" />}
        </p>
      </div>

      {/* Blocks reveal after the summary finishes streaming */}
      <AnimatePresence>
        {done &&
          answer.blocks.map((block, index) => (
            <motion.div
              key={`${block.kind}-${index}`}
              initial={stream ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: stream ? index * 0.035 : 0 }}
            >
              <BlockRenderer block={block} />
            </motion.div>
          ))}
      </AnimatePresence>

      {done && (
        <>
          {/* Sources */}
          {answer.sources.length > 0 && (
            <div>
              <SectionHeading icon={Database} title="Grounded in" />
              <div className="flex flex-wrap gap-1.5">
                {answer.sources.map((source) =>
                  source.to ? (
                    <Link
                      key={source.label}
                      to={source.to}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[10.5px] font-medium text-foreground transition-colors hover:border-brand-200 hover:bg-accent"
                    >
                      {source.label}
                      {source.detail && <span className="text-muted-foreground">· {source.detail}</span>}
                      <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                    </Link>
                  ) : (
                    <span
                      key={source.label}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-[10.5px] font-medium text-muted-foreground"
                    >
                      {source.label}
                      {source.detail && <span>· {source.detail}</span>}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Follow-ups */}
          {onFollowUp && answer.followUps.length > 0 && (
            <div>
              <SectionHeading icon={Sparkles} title="Ask next" />
              <div className="flex flex-wrap gap-1.5">
                {answer.followUps.slice(0, 2).map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal rounded-full px-3 py-1 text-left text-[11px] font-medium"
                    onClick={() => onFollowUp(prompt)}
                  >
                    {prompt}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Trace footer */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
            <button
              type="button"
              onClick={() => setShowTrace((s) => !s)}
              className="flex w-full items-center gap-2 text-left"
            >
              <Sparkles className="h-3 w-3 shrink-0 text-brand-500" />
              <span className="text-[10.5px] font-medium text-muted-foreground">
                {answer.modelLabel} · {(answer.latencyMs / 1000).toFixed(1)}s ·{' '}
                {answer.groundedRecords.toLocaleString('en-IN')} records in scope
              </span>
              <ChevronDown
                className={cn(
                  'ml-auto h-3 w-3 shrink-0 text-muted-foreground transition-transform',
                  showTrace && 'rotate-180',
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {showTrace && (
                <motion.ol
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 space-y-1 overflow-hidden border-t border-border pt-2"
                >
                  {answer.reasoningSteps.map((step, index) => (
                    <li key={step} className="flex gap-2 text-[10.5px] text-muted-foreground">
                      <span className="num shrink-0 font-bold text-brand-500">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                  <li className="pt-1 text-[10px] italic text-muted-foreground">
                    Intent classified as "{answer.intent}", topic "{answer.topic}". Answers are composed from
                    plant records and the resolution knowledge base.
                  </li>
                </motion.ol>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}
