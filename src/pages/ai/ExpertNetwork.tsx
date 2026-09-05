import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Clock, Gauge, Phone, Search, Sparkles, Star, Users } from 'lucide-react'

import type { AiEngineer } from '@/types'
import { useAsync } from '@/hooks/useAsync'
import { getEngineers, getFactories, getIncidents } from '@/services'
import { useAiStore } from '@/store/aiStore'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { FilterChip, FilterChipGroup } from '@/components/common/FilterChip'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const DEPARTMENTS: Array<AiEngineer['department'] | 'all'> = [
  'all',
  'Maintenance',
  'Production',
  'Quality',
  'Utilities',
  'Planning',
]

const availabilityChip: Record<AiEngineer['availability'], string> = {
  Available: 'bg-success-50 text-success-700 ring-success-100',
  'On shift': 'bg-info-50 text-info-700 ring-info-100',
  'On another job': 'bg-warning-50 text-warning-700 ring-warning-100',
  'Off shift': 'bg-secondary text-secondary-foreground ring-border',
  'On leave': 'bg-danger-50 text-danger-700 ring-danger-100',
}

export default function ExpertNetwork() {
  const navigate = useNavigate()
  const queuePrompt = useAiStore((s) => s.queuePrompt)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<AiEngineer['department'] | 'all'>('all')

  const engineers = useAsync(getEngineers, [])
  const incidents = useAsync(() => getIncidents(), [])
  const factories = useAsync(getFactories, [])

  const factoryNames = useMemo(
    () => new Map((factories.data ?? []).map((f) => [f.id as string, f.name])),
    [factories.data],
  )

  /** Cases each engineer actually closed, from the knowledge base. */
  const closedByEngineer = useMemo(() => {
    const map = new Map<string, number>()
    for (const incident of incidents.data ?? []) {
      for (const id of incident.resolvedByIds) map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }, [incidents.data])

  const list = useMemo(() => engineers.data ?? [], [engineers.data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list
      .filter((e) => (department === 'all' ? true : e.department === department))
      .filter((e) =>
        q
          ? [e.name, e.role, e.skills.join(' '), e.specialities.join(' '), e.certifications.join(' ')]
              .join(' ')
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => b.firstTimeFixPct - a.firstTimeFixPct || b.incidentsResolved - a.incidentsResolved)
  }, [list, department, search])

  const stats = useMemo(
    () => ({
      available: list.filter((e) => e.availability === 'Available' || e.availability === 'On shift').length,
      resolved: list.reduce((s, e) => s + e.incidentsResolved, 0),
      avgFtf: list.length ? Math.round(list.reduce((s, e) => s + e.firstTimeFixPct, 0) / list.length) : 0,
      avgMttr: list.length
        ? Math.round((list.reduce((s, e) => s + e.avgMttrHrs, 0) / list.length) * 10) / 10
        : 0,
    }),
    [list],
  )

  const isLoading = engineers.isLoading || incidents.isLoading

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Expert Network"
        description="Who the copilot draws on when it recommends an owner — speciality, past resolutions from the knowledge base, first-time fix rate, mean time to repair and current availability."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard label="Specialists on the roster" value={list.length} icon={Users} tone="info" />
          <StatCard label="Available now" value={stats.available} icon={Sparkles} tone="success" />
          <StatCard label="Issues resolved" value={stats.resolved.toLocaleString('en-IN')} icon={Award} tone="default" />
          <StatCard
            label="Avg first-time fix"
            value={`${stats.avgFtf}%`}
            icon={Gauge}
            tone="success"
            sublabel={`${stats.avgMttr} h average MTTR`}
          />
        </StatGrid>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a name, skill or certification…"
            className="pl-9"
          />
        </div>
        <FilterChipGroup className="lg:ml-auto">
          {DEPARTMENTS.map((option) => (
            <FilterChip
              key={option}
              active={department === option}
              onClick={() => setDepartment(option)}
            >
              {option === 'all' ? 'All departments' : option}
            </FilterChip>
          ))}
        </FilterChipGroup>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((engineer) => (
            <div
              key={engineer.id}
              className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-forest-800 text-[13px] font-bold text-white">
                  {engineer.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-foreground">{engineer.name}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-copper-600">
                      <Star className="h-3 w-3 fill-copper-500 text-copper-500" />
                      {engineer.rating}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{engineer.role}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ring-1 ring-inset',
                        availabilityChip[engineer.availability],
                      )}
                    >
                      {engineer.availability}
                    </span>
                    <Badge variant="secondary" className="text-[9.5px]">
                      {engineer.shift === 'General' ? 'General shift' : `Shift ${engineer.shift}`}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 text-[11px] text-muted-foreground">
                {factoryNames.get(engineer.factoryId) ?? engineer.factoryId} · {engineer.department} ·{' '}
                {engineer.yearsExperience} years
              </div>

              <div className="mt-2.5">
                <div className="section-label mb-1 text-copper-600">Specialities</div>
                <div className="flex flex-wrap gap-1">
                  {engineer.specialities.map((speciality) => (
                    <span
                      key={speciality}
                      className="rounded-md border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700"
                    >
                      {speciality}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-2.5">
                <div className="section-label mb-1 text-copper-600">Key skills</div>
                <ul className="space-y-0.5">
                  {engineer.skills.slice(0, 3).map((skill) => (
                    <li key={skill} className="flex gap-1.5 text-[11px] text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-border pt-2.5">
                <div>
                  <div className="flex items-baseline justify-between text-[10.5px]">
                    <span className="text-muted-foreground">First-time fix rate</span>
                    <span className="num font-semibold text-foreground">{engineer.firstTimeFixPct}%</span>
                  </div>
                  <Progress
                    value={engineer.firstTimeFixPct}
                    className="mt-1 h-1"
                    indicatorClassName={engineer.firstTimeFixPct >= 88 ? 'bg-success-500' : 'bg-warning-500'}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-0.5 text-[10.5px]">
                  <div>
                    <div className="text-muted-foreground">Resolved</div>
                    <div className="num font-semibold text-foreground">{engineer.incidentsResolved}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      MTTR
                    </div>
                    <div className="num font-semibold text-foreground">{engineer.avgMttrHrs} h</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">In KB</div>
                    <div className="num font-semibold text-foreground">
                      {closedByEngineer.get(engineer.id) ?? 0} cases
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
                <span className="flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {engineer.contact}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    queuePrompt(
                      `What is ${engineer.name} best placed to handle right now, and which open issue should they take first?`,
                    )
                    navigate('/ai')
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10.5px] font-semibold text-foreground transition-colors hover:border-brand-200 hover:bg-accent"
                >
                  <Sparkles className="h-3 w-3 text-brand-600" />
                  Ask the copilot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
