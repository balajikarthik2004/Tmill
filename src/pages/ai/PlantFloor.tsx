import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Check,
  CirclePause,
  Clock,
  Cog,
  Gauge,
  ChevronRight,
  Play,
  Search,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
  Wrench,
} from 'lucide-react'

import type { FloorAssignment, FloorUnitBoard, MachineStatus, ProcessName } from '@/types'
import { useAsync } from '@/hooks/useAsync'
import { computeMissionState, computeProgress, getFloorBoard } from '@/services'
import { useAiStore } from '@/store/aiStore'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------- styling */

const statusStyles: Record<MachineStatus, { dot: string; ring: string; chip: string; label: string }> = {
  Running: {
    dot: 'bg-success-500',
    ring: 'border-success-100',
    chip: 'bg-success-50 text-success-700 ring-success-100',
    label: 'Processing',
  },
  Idle: {
    dot: 'bg-copper-400',
    ring: 'border-copper-100',
    chip: 'bg-copper-50 text-copper-700 ring-copper-100',
    label: 'Idle',
  },
  Breakdown: {
    dot: 'bg-danger-500',
    ring: 'border-danger-200',
    chip: 'bg-danger-50 text-danger-700 ring-danger-100',
    label: 'Down',
  },
  Maintenance: {
    dot: 'bg-info-500',
    ring: 'border-info-100',
    chip: 'bg-info-50 text-info-700 ring-info-100',
    label: 'In service',
  },
}

const STATUS_OPTIONS: Array<MachineStatus | 'all'> = ['all', 'Running', 'Idle', 'Breakdown', 'Maintenance']

/** What leaves each stage, so the flow reads as material moving down the line. */
const stageOutput: Record<ProcessName, string> = {
  'Blow Room': 'Opened & cleaned lap',
  Carding: 'Carded sliver',
  Combing: 'Combed sliver',
  Drawing: 'Drawn sliver',
  Roving: 'Roving bobbins',
  'Ring Spinning': 'Spun yarn cops',
  'Open End': 'Rotor-spun cones',
  Winding: 'Cleared cones',
  TFO: 'Doubled yarn',
  Gassing: 'Singed yarn',
  Weaving: 'Greige fabric',
}

function barTone(status: MachineStatus) {
  if (status === 'Breakdown') return 'bg-danger-500'
  if (status === 'Maintenance') return 'bg-info-500'
  if (status === 'Idle') return 'bg-copper-400'
  return 'bg-brand-500'
}

/** Elapsed time as hh:mm, the way a floor board shows it. */
function formatElapsed(hours: number) {
  const total = Math.max(0, Math.round(hours * 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} days`
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/* --------------------------------------------------------------- machine */

function MachineTile({
  assignment,
  now,
  onOpen,
}: {
  assignment: FloorAssignment
  now: number
  onOpen: (a: FloorAssignment) => void
}) {
  const style = statusStyles[assignment.status]
  const progress = computeProgress(assignment, now)
  const mission = computeMissionState(assignment, now)
  const isProducing = assignment.task === 'Running production'

  return (
    <button
      type="button"
      onClick={() => onOpen(assignment)}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card p-3 text-left shadow-xs transition-all',
        'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md',
        style.ring,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0">
          {assignment.status === 'Running' && (
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', style.dot)} />
          )}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', style.dot)} />
        </span>
        <span className="num text-[12.5px] font-bold tracking-tight text-foreground">{assignment.machineCode}</span>
        <span className="ml-auto truncate text-[10px] font-medium text-muted-foreground">{assignment.process}</span>
      </div>

      {/* The mission */}
      <div className={cn('mt-2 rounded-md px-1.5 py-1 text-[10px] font-semibold ring-1 ring-inset', style.chip)}>
        {assignment.task}
      </div>

      {/* Current stage */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[10.5px] font-semibold text-foreground">{mission.stage.name}</span>
          <span className="num shrink-0 text-[9.5px] font-medium text-muted-foreground">
            {mission.index + 1}/{mission.stagesTotal}
          </span>
        </div>
        {/* Stage pips */}
        <div className="mt-1 flex gap-0.5">
          {assignment.missionStages.map((stage, i) => (
            <span
              key={stage.name}
              className={cn(
                'h-1 flex-1 rounded-full',
                i < mission.index ? barTone(assignment.status) : i === mission.index ? 'bg-copper-400' : 'bg-secondary',
              )}
            />
          ))}
        </div>
      </div>

      {/* Operator */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-forest-700 to-forest-900 text-[10px] font-bold text-white">
          {assignment.operator.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11.5px] font-semibold text-foreground">{assignment.operator.name}</div>
          <div className="truncate text-[9.5px] text-muted-foreground">{assignment.operator.role}</div>
        </div>
        <span className="num shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
          {formatElapsed(progress.elapsedHrs)}
        </span>
      </div>

      {/* Output, in real units */}
      {isProducing && (
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-baseline justify-between text-[9.5px] text-muted-foreground">
            <span className="tabular-nums">
              {formatNumber(progress.producedQtyKg)} / {formatNumber(assignment.shiftTargetKg)} kg
            </span>
            <span className="tabular-nums">{assignment.ratePerHourKg.toFixed(1)} kg/h</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', barTone(assignment.status))}
              style={{ width: `${progress.progressPct}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}

/* --------------------------------------------------------- stage column */

function StageColumn({
  process,
  assignments,
  now,
  isLast,
  onOpen,
}: {
  process: ProcessName
  assignments: FloorAssignment[]
  now: number
  isLast: boolean
  onOpen: (a: FloorAssignment) => void
}) {
  const processing = assignments.filter((a) => a.status === 'Running')
  const throughput = processing
    .filter((a) => a.task === 'Running production')
    .reduce((sum, a) => sum + a.ratePerHourKg, 0)

  return (
    <>
      <div className="flex w-[228px] shrink-0 flex-col">
        {/* Stage header */}
        <div className="mb-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-[11.5px] font-bold tracking-tight text-foreground">{process}</span>
            <span className="num ml-auto shrink-0 text-[10px] font-semibold text-muted-foreground">
              {assignments.length}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[9.5px] text-muted-foreground">{stageOutput[process]}</div>
          <div className="mt-1 flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-success-500" />
            <span className="num text-[9.5px] font-medium text-success-700">
              {processing.length} processing
            </span>
            {throughput > 0 && (
              <span className="num ml-auto text-[9.5px] font-semibold text-brand-600">
                {Math.round(throughput)} kg/h
              </span>
            )}
          </div>
        </div>

        {/* Machines at this stage */}
        <div className="flex flex-col gap-2">
          {assignments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-2.5 py-4 text-center text-[10px] text-muted-foreground">
              No machine here in this view
            </div>
          ) : (
            assignments.map((assignment) => (
              <MachineTile key={assignment.id} assignment={assignment} now={now} onOpen={onOpen} />
            ))
          )}
        </div>
      </div>

      {/* Flow connector */}
      {!isLast && (
        <div className="flex w-7 shrink-0 items-start justify-center pt-6">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </div>
      )}
    </>
  )
}

/* ----------------------------------------------------------- unit board */

function UnitFlow({
  unit,
  now,
  onOpen,
}: {
  unit: FloorUnitBoard
  now: number
  onOpen: (a: FloorAssignment) => void
}) {
  // Machines grouped into the order material actually travels through the unit.
  const stages = unit.route.map((process) => ({
    process,
    assignments: unit.assignments.filter((a) => a.process === process),
  }))
  // Anything whose process is not on the published route still gets shown.
  const offRoute = unit.assignments.filter((a) => !unit.route.includes(a.process))

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700">
          {unit.shortName}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[13.5px] font-semibold tracking-tight text-foreground">
            {unit.factoryName}
          </h3>
          <p className="truncate text-[10.5px] text-muted-foreground">
            {unit.location}
            {unit.commissionedYear ? ` · commissioned ${unit.commissionedYear}` : ''} · {unit.countGroup}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Badge variant="success">{unit.running} processing</Badge>
          {unit.idle > 0 && <Badge variant="copper">{unit.idle} idle</Badge>}
          {unit.breakdown > 0 && <Badge variant="danger">{unit.breakdown} down</Badge>}
          {unit.maintenance > 0 && <Badge variant="info">{unit.maintenance} in service</Badge>}
          <Badge variant="secondary">
            <Users className="h-3 w-3" />
            {unit.operatorsOnShift}
          </Badge>
        </div>
      </div>

      {/* The route: cotton enters on the left and leaves as yarn on the right */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/25 px-4 py-1.5">
        <span className="section-label text-copper-600">Process flow</span>
        <div className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          {unit.route.map((process, i) => (
            <span key={process} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/50" />}
              <span className="font-medium text-foreground">{process}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin overflow-x-auto">
        <div className="flex min-w-max items-start p-3">
          {stages.map((stage, i) => (
            <StageColumn
              key={stage.process}
              process={stage.process}
              assignments={stage.assignments}
              now={now}
              isLast={i === stages.length - 1 && offRoute.length === 0}
              onOpen={onOpen}
            />
          ))}
          {offRoute.length > 0 && (
            <StageColumn
              process={offRoute[0].process}
              assignments={offRoute}
              now={now}
              isLast
              onOpen={onOpen}
            />
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ page */

export default function PlantFloor() {
  const navigate = useNavigate()
  const queuePrompt = useAiStore((s) => s.queuePrompt)

  const [factoryId, setFactoryId] = useState('all')
  const [status, setStatus] = useState<MachineStatus | 'all'>('all')
  const [processingOnly, setProcessingOnly] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<FloorAssignment | null>(null)

  const board = useAsync(
    () => getFloorBoard({ factoryId: factoryId === 'all' ? undefined : (factoryId as never) }),
    [factoryId],
  )

  // The clock is what makes the twin live.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const units = useMemo(() => {
    const list = board.data?.units ?? []
    const q = search.trim().toLowerCase()
    return list
      .map((unit) => ({
        ...unit,
        assignments: unit.assignments
          .filter((a) => (processingOnly ? a.status === 'Running' : true))
          .filter((a) => (status === 'all' ? true : a.status === status))
          .filter((a) =>
            q
              ? [a.machineCode, a.operator.name, a.operator.employeeCode, a.productName ?? '', a.process, a.task]
                  .join(' ')
                  .toLowerCase()
                  .includes(q)
              : true,
          ),
      }))
      .filter((unit) => unit.assignments.length > 0)
  }, [board.data, search, status, processingOnly])

  const summary = board.data?.summary
  const visible = useMemo(() => units.flatMap((u) => u.assignments), [units])

  /** Live output rate across everything currently processing, in real units. */
  const liveRate = useMemo(
    () =>
      visible
        .filter((a) => a.task === 'Running production')
        .reduce((sum, a) => sum + a.ratePerHourKg, 0),
    [visible],
  )

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Plant Floor — Live"
        description="A live mirror of the floor: every machine, the mission running on it, the person allocated to it, and the stage that mission has reached."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={factoryId} onValueChange={setFactoryId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units</SelectItem>
                {(board.data?.units ?? []).map((unit) => (
                  <SelectItem key={unit.factoryId} value={unit.factoryId}>
                    {unit.factoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as MachineStatus | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === 'all' ? 'All statuses' : statusStyles[option].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Live banner */}
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 overflow-hidden rounded-xl bg-linear-to-br from-forest-950 via-forest-900 to-forest-800 px-4 py-3 text-white">
        <span className="weave pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex items-center gap-2">
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-success-500 opacity-70" />
            <span className="relative h-2 w-2 rounded-full bg-success-500" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-forest-100">Floor live</span>
        </div>
        {summary && (
          <>
            <div className="relative flex items-baseline gap-1.5">
              <span className="text-[11px] text-forest-300">Shift</span>
              <span className="num text-[15px] font-bold text-copper-300">{summary.shift}</span>
              <span className="text-[11px] text-forest-200">
                {formatClock(summary.shiftStartsAt)} – {formatClock(summary.shiftEndsAt)}
              </span>
            </div>
            <div className="relative flex items-baseline gap-1.5">
              <span className="text-[11px] text-forest-300">Processing</span>
              <span className="num text-[15px] font-bold text-white">{summary.running}</span>
              <span className="text-[11px] text-forest-200">of {summary.machines} machines</span>
            </div>
            <div className="relative flex items-baseline gap-1.5">
              <span className="text-[11px] text-forest-300">Live rate</span>
              <span className="num text-[15px] font-bold text-white">{formatNumber(Math.round(liveRate))}</span>
              <span className="text-[11px] text-forest-200">kg/h</span>
            </div>
            <div className="relative flex items-baseline gap-1.5">
              <span className="text-[11px] text-forest-300">Operators</span>
              <span className="num text-[15px] font-bold text-white">{summary.operatorsOnShift}</span>
            </div>
          </>
        )}
        <div className="relative ml-auto flex items-center gap-1.5 text-[11px] text-forest-200">
          <Clock className="h-3.5 w-3.5" />
          <span className="tabular-nums">{new Date(now).toLocaleTimeString('en-IN', { hour12: true })}</span>
        </div>
      </div>

      {board.isLoading || !summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={6}>
          <StatCard label="Machines on the floor" value={summary.machines} icon={Cog} tone="info" />
          <StatCard label="Processing now" value={summary.running} icon={Play} tone="success" />
          <StatCard label="Idle" value={summary.idle} icon={CirclePause} tone="warning" />
          <StatCard label="Down" value={summary.breakdown} icon={TriangleAlert} tone="danger" />
          <StatCard label="In service" value={summary.maintenance} icon={Wrench} tone="info" />
          <StatCard label="Avg OEE" value={formatPct(summary.avgOeePct)} icon={Gauge} />
        </StatGrid>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a machine, operator or mission…"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setProcessingOnly((p) => !p)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors',
            processingOnly
              ? 'border-success-100 bg-success-50 text-success-700'
              : 'border-border bg-card text-muted-foreground hover:bg-accent',
          )}
        >
          {processingOnly ? 'Showing machines currently processing' : 'Showing every machine'}
        </button>
        <span className="text-[11px] text-muted-foreground">{visible.length} on the board</span>
      </div>

      {/* Unit boards */}
      {board.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center">
          <p className="text-sm font-medium text-foreground">No machines match this filter</p>
        </div>
      ) : (
        units.map((unit) => (
          <UnitFlow key={unit.factoryId} unit={unit} now={now} onOpen={setSelected} />
        ))
      )}

      {/* Mission detail */}
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
          {selected && (
            <MissionDetail
              assignment={selected}
              now={now}
              onAskCopilot={() => {
                queuePrompt(
                  selected.status === 'Breakdown'
                    ? `${selected.machineCode} is down. What is the cause, how did we resolve it before, and how long will it take?`
                    : `What is the risk on ${selected.machineCode} and what should the operator watch this shift?`,
                )
                setSelected(null)
                navigate('/ai')
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* --------------------------------------------------------- mission detail */

function MissionDetail({
  assignment,
  now,
  onAskCopilot,
}: {
  assignment: FloorAssignment
  now: number
  onAskCopilot: () => void
}) {
  const style = statusStyles[assignment.status]
  const progress = computeProgress(assignment, now)
  const mission = computeMissionState(assignment, now)

  return (
    <div>
      <div className="relative overflow-hidden border-b border-border bg-linear-to-br from-forest-950 to-forest-800 px-5 py-4 pr-14 text-white">
        <span className="weave pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', style.dot)} />
          <SheetTitle className="num font-display text-[16px] font-bold text-white">
            {assignment.machineCode}
          </SheetTitle>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-forest-100">
            {style.label}
          </span>
        </div>
        <SheetDescription className="relative mt-0.5 text-[11.5px] text-forest-200">
          {assignment.make} · {assignment.process}
        </SheetDescription>
      </div>

      <div className="space-y-4 p-5">
        {/* 1. What kind of mission */}
        <div>
          <div className="section-label mb-2 text-copper-600">Mission</div>
          <div className={cn('rounded-lg px-3 py-2.5 ring-1 ring-inset', style.chip)}>
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[13px] font-semibold">{assignment.task}</span>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed opacity-90">{assignment.taskDetail}</p>
          </div>
          {assignment.productionOrderNo && (
            <div className="mt-2 rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="num text-[12px] font-semibold text-foreground">{assignment.productionOrderNo}</span>
                {assignment.salesOrderNo && (
                  <Badge variant="outline" className="text-[9.5px]">
                    {assignment.salesOrderNo}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {assignment.productName}
                {assignment.customerName ? ` · ${assignment.customerName}` : ''}
              </div>
            </div>
          )}
        </div>

        {/* 2. Who is allocated */}
        <div>
          <div className="section-label mb-2 text-copper-600">Allocated to</div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-forest-700 to-forest-900 text-[12px] font-bold text-white">
              {assignment.operator.initials}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-foreground">{assignment.operator.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {assignment.operator.role} · Shift {assignment.operator.shift}
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                {assignment.operator.employeeCode} · {assignment.operator.yearsService} years service
                {assignment.machinesCovered > 1 && ` · covering ${assignment.machinesCovered} machines`}
              </div>
            </div>
          </div>
          {assignment.support && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Wrench className="h-3.5 w-3.5 shrink-0 text-brand-600" />
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold text-foreground">{assignment.support.name}</div>
                <div className="text-[10px] text-muted-foreground">{assignment.support.role} · supporting</div>
              </div>
            </div>
          )}
        </div>

        {/* 3. How long it has been working */}
        <div>
          <div className="section-label mb-2 text-copper-600">Time on this mission</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Elapsed</div>
              <div className="num text-[16px] font-semibold tabular-nums text-foreground">
                {formatElapsed(progress.elapsedHrs)}
              </div>
              <div className="text-[9.5px] text-muted-foreground">hh:mm</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Expected</div>
              <div className="num text-[16px] font-semibold text-foreground">
                {formatDuration(mission.totalExpectedHrs)}
              </div>
              <div className="text-[9.5px] text-muted-foreground">for this mission</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Started</div>
              <div className="num text-[16px] font-semibold text-foreground">
                {formatClock(assignment.startedAt)}
              </div>
              <div className="text-[9.5px] text-muted-foreground">{formatDate(assignment.startedAt, 'dd MMM')}</div>
            </div>
          </div>
          {mission.overrunning && (
            <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-medium text-warning-700">
              <TriangleAlert className="h-3 w-3" />
              Running beyond the expected duration for this mission type.
            </p>
          )}
        </div>

        {/* 4. Current stage */}
        <div>
          <div className="section-label mb-2 text-copper-600">
            Stage {mission.index + 1} of {mission.stagesTotal}
          </div>
          <ol className="space-y-0">
            {assignment.missionStages.map((stage, i) => {
              const done = i < mission.index
              const current = i === mission.index
              return (
                <li key={stage.name} className="relative flex gap-3 pb-3 last:pb-0">
                  {/* Connector */}
                  {i < assignment.missionStages.length - 1 && (
                    <span
                      className={cn(
                        'absolute left-[9px] top-5 h-full w-px',
                        done ? 'bg-brand-400' : 'bg-border',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                      done
                        ? 'bg-brand-500 text-white'
                        : current
                          ? 'bg-copper-500 text-white ring-4 ring-copper-100'
                          : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span
                        className={cn(
                          'text-[12px]',
                          current ? 'font-bold text-foreground' : done ? 'font-medium text-muted-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {stage.name}
                      </span>
                      {current && (
                        <span className="rounded-full bg-copper-50 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-copper-700">
                          In progress
                        </span>
                      )}
                      <span className="num ml-auto text-[9.5px] text-muted-foreground">
                        {formatDuration(stage.expectedHrs)}
                      </span>
                    </div>
                    <p className="text-[10.5px] leading-relaxed text-muted-foreground">{stage.detail}</p>
                    {current && (
                      <div className="mt-1">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-copper-500 transition-[width] duration-1000 ease-linear"
                            style={{ width: `${mission.stageProgressPct}%` }}
                          />
                        </div>
                        <div className="mt-0.5 text-[9.5px] tabular-nums text-muted-foreground">
                          {formatElapsed(mission.stageElapsedHrs)} into this stage ·{' '}
                          {mission.stageProgressPct.toFixed(0)}% through
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Output in real units */}
        {assignment.task === 'Running production' && (
          <div>
            <div className="section-label mb-2 text-copper-600">Shift output</div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-muted-foreground">Against shift target</span>
                <span className="num font-bold text-brand-600">{progress.progressPct.toFixed(1)}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', barTone(assignment.status))}
                  style={{ width: `${progress.progressPct}%` }}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10.5px]">
                <div>
                  <span className="text-muted-foreground">Produced </span>
                  <span className="num font-semibold text-foreground">
                    {formatNumber(progress.producedQtyKg)} kg
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Shift target </span>
                  <span className="num font-semibold text-foreground">
                    {formatNumber(assignment.shiftTargetKg)} kg
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rate </span>
                  <span className="num font-semibold text-foreground">
                    {assignment.ratePerHourKg.toFixed(1)} kg/h
                  </span>
                </div>
                {progress.remainingHrs !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Target met in </span>
                    <span className="num font-semibold text-foreground">
                      {formatDuration(progress.remainingHrs)}
                    </span>
                  </div>
                )}
              </div>
              {assignment.orderPlannedQtyKg !== undefined && assignment.orderProducedQtyKg !== undefined && (
                <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
                  Whole order: {formatNumber(assignment.orderProducedQtyKg)} of{' '}
                  {formatNumber(assignment.orderPlannedQtyKg)} kg booked to date.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Machine health */}
        <div>
          <div className="section-label mb-2 text-copper-600">Machine health</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Gauge className="h-2.5 w-2.5" />
                OEE
              </div>
              <div className="num text-[15px] font-semibold text-foreground">{formatPct(assignment.oeePct)}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Activity className="h-2.5 w-2.5" />
                Utilisation
              </div>
              <div className="num text-[15px] font-semibold text-foreground">
                {formatPct(assignment.utilizationPct)}
              </div>
            </div>
          </div>
          {assignment.note && (
            <p className="mt-1.5 text-[10.5px] italic text-muted-foreground">{assignment.note}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onAskCopilot}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2.5 text-[12px] font-semibold text-white shadow-xs transition-colors hover:bg-brand-600"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Ask the copilot about {assignment.machineCode}
        </button>
      </div>
    </div>
  )
}
