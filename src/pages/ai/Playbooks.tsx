import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChevronDown,
  Clock,
  IndianRupee,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import type { AiTopic } from '@/types'
import { useAsync } from '@/hooks/useAsync'
import { getPlaybooks } from '@/services'
import { useAiStore } from '@/store/aiStore'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { FilterChip, FilterChipGroup } from '@/components/common/FilterChip'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatInrCompact, formatRelativeShort } from '@/lib/format'
import { cn } from '@/lib/utils'

const TOPIC_LABELS: Record<AiTopic, string> = {
  breakdown: 'Breakdown',
  quality: 'Quality',
  orderDelay: 'Order delay',
  production: 'Production',
  energy: 'Energy',
  inventory: 'Inventory',
  procurement: 'Procurement',
  capacity: 'Capacity',
  cost: 'Cost',
  people: 'People',
  general: 'General',
}

function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${Number(hours.toFixed(1))} h`
  return `${Number((hours / 24).toFixed(1))} days`
}

export default function Playbooks() {
  const navigate = useNavigate()
  const queuePrompt = useAiStore((s) => s.queuePrompt)
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState<AiTopic | 'all'>('all')
  const [openKey, setOpenKey] = useState<string | null>(null)

  const { data, isLoading } = useAsync(getPlaybooks, [])
  const playbooks = useMemo(() => data ?? [], [data])

  const topics = useMemo(
    () => ['all' as const, ...[...new Set(playbooks.map((p) => p.topic))]],
    [playbooks],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return playbooks
      .filter((p) => (topic === 'all' ? true : p.topic === topic))
      .filter((p) =>
        q
          ? [p.title, p.rootCause, p.category, p.tags.join(' '), p.machineCodes.join(' ')]
              .join(' ')
              .toLowerCase()
              .includes(q)
          : true,
      )
  }, [playbooks, topic, search])

  const totals = useMemo(
    () => ({
      cases: playbooks.reduce((s, p) => s + p.occurrences, 0),
      avgDowntime: playbooks.length
        ? playbooks.reduce((s, p) => s + p.avgDowntimeHrs, 0) / playbooks.length
        : 0,
      totalCost: playbooks.reduce((s, p) => s + p.avgCostInr * p.occurrences, 0),
      experts: new Set(playbooks.flatMap((p) => p.owners.map((o) => o.id))).size,
    }),
    [playbooks],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Resolution Playbooks"
        description="Every recurring failure signature in the plant, the root cause behind it, the steps that closed it, and the engineers who did the work. This is the knowledge base the copilot retrieves from."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard label="Playbooks" value={playbooks.length} icon={BookOpen} tone="info" />
          <StatCard label="Closed cases" value={totals.cases} icon={RotateCcw} tone="success" />
          <StatCard
            label="Avg downtime per case"
            value={formatHours(totals.avgDowntime)}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            label="Recorded cost"
            value={formatInrCompact(totals.totalCost)}
            icon={IndianRupee}
            tone="danger"
            sublabel={`${totals.experts} engineers involved`}
          />
        </StatGrid>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a symptom, cause, tag or machine…"
            className="pl-9"
          />
        </div>
        <FilterChipGroup className="lg:ml-auto">
          {topics.map((option) => (
            <FilterChip
              key={option}
              active={topic === option}
              onClick={() => setTopic(option)}
            >
              {option === 'all' ? 'All categories' : TOPIC_LABELS[option]}
            </FilterChip>
          ))}
        </FilterChipGroup>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((playbook) => {
            const open = openKey === playbook.key
            return (
              <div key={playbook.key} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : playbook.key)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <span className="num text-[13px] font-bold leading-none">{playbook.occurrences}</span>
                    <span className="text-[7.5px] font-semibold uppercase tracking-wide">cases</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-foreground">{playbook.title}</span>
                      <Badge variant="secondary" className="text-[9.5px]">
                        {TOPIC_LABELS[playbook.topic]}
                      </Badge>
                      <Badge variant="outline" className="text-[9.5px]">
                        {playbook.category}
                      </Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">
                      <span className="font-medium text-foreground">Root cause: </span>
                      {playbook.rootCause}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
                      <span>Last seen {formatRelativeShort(playbook.lastSeen)}</span>
                      {playbook.avgDowntimeHrs > 0 && <span>Avg {formatHours(playbook.avgDowntimeHrs)} downtime</span>}
                      <span>Avg {formatInrCompact(playbook.avgCostInr)} per case</span>
                      {playbook.machineCodes.length > 0 && (
                        <span>Seen on {playbook.machineCodes.slice(0, 3).join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      'mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden border-t border-border bg-muted/25"
                    >
                      <div className="grid gap-4 p-4 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                          <div className="section-label mb-2 text-copper-600">Resolution steps</div>
                          <ol className="space-y-2">
                            {playbook.steps.map((step, index) => (
                              <li key={step.step} className="flex gap-2.5">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-baseline gap-2">
                                    <span className="text-[12px] font-semibold text-foreground">{step.step}</span>
                                    <span className="num text-[10.5px] font-medium text-brand-600">
                                      {formatHours(step.durationHrs)}
                                    </span>
                                  </div>
                                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                                    {step.detail}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ol>

                          <div className="mt-3 rounded-lg border border-success-100 bg-success-50 px-3 py-2">
                            <div className="flex items-start gap-2">
                              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" />
                              <div>
                                <div className="text-[11.5px] font-semibold text-success-700">Preventive action</div>
                                <p className="text-[11.5px] text-success-700/90">{playbook.preventiveAction}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="section-label mb-2 text-copper-600">Who resolved it</div>
                            <div className="space-y-1.5">
                              {playbook.owners.map((owner) => (
                                <div
                                  key={owner.id}
                                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5"
                                >
                                  <Users className="h-3 w-3 shrink-0 text-brand-600" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[11.5px] font-semibold text-foreground">
                                      {owner.name}
                                    </div>
                                    <div className="truncate text-[10px] text-muted-foreground">{owner.role}</div>
                                  </div>
                                  <span className="num shrink-0 text-[10.5px] font-semibold text-brand-600">
                                    {owner.fixes}x
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="section-label mb-1.5 text-copper-600">Tags</div>
                            <div className="flex flex-wrap gap-1">
                              {playbook.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              queuePrompt(
                                `We have ${playbook.title.toLowerCase()} again. What is the cause, how did we resolve it before, and how long will it take?`,
                              )
                              navigate('/ai')
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-[11.5px] font-semibold text-white shadow-xs transition-colors hover:bg-brand-600"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Run this through the copilot
                          </button>
                          <p className="text-center text-[10px] text-muted-foreground">
                            Last occurrence {formatDate(playbook.lastSeen)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
