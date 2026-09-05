/**
 * Shop-floor board service.
 *
 * Assembles the live board from the machine registry, the operator roster and
 * the production orders currently on the machines. Quantity produced is
 * computed here from the clock, so every caller derives the same number and the
 * board advances on its own between polls.
 */
import type {
  FactoryId,
  FloorAssignment,
  MissionStage,
  FloorBoard,
  FloorSummary,
  FloorTask,
  FloorUnitBoard,
  MachineStatus,
  Operator,
} from '@/types'
import { buildFloorAssignments, factories, operatorsOnShift, shiftForHour } from '@/mock'
import { simulateDelay } from './delay'

/** Tasks that actually put yarn on a package. */
const PRODUCING_TASKS: FloorTask[] = ['Running production']

export interface LiveProgress {
  producedQtyKg: number
  progressPct: number
  elapsedHrs: number
  /** Hours left at the current rate, undefined when nothing is being made. */
  remainingHrs?: number
  etaIso?: string
}

/**
 * Progress from the clock: banked quantity plus rate times elapsed, capped at
 * the plan. Exported so the page can recompute on a ticker without another
 * round trip.
 */
export function computeProgress(assignment: FloorAssignment, now = Date.now()): LiveProgress {
  const elapsedHrs = Math.max(0, (now - new Date(assignment.startedAt).getTime()) / 3600_000)

  if (!PRODUCING_TASKS.includes(assignment.task) || assignment.shiftTargetKg <= 0) {
    const progressPct = assignment.shiftTargetKg
      ? Math.min(100, (assignment.baseQtyKg / assignment.shiftTargetKg) * 100)
      : 0
    return { producedQtyKg: assignment.baseQtyKg, progressPct, elapsedHrs }
  }

  const produced = Math.min(
    assignment.shiftTargetKg,
    assignment.baseQtyKg + assignment.ratePerHourKg * elapsedHrs,
  )
  const progressPct = Math.min(100, (produced / assignment.shiftTargetKg) * 100)
  const remainingKg = Math.max(0, assignment.shiftTargetKg - produced)
  const remainingHrs = assignment.ratePerHourKg > 0 ? remainingKg / assignment.ratePerHourKg : undefined

  return {
    producedQtyKg: Math.round(produced),
    progressPct,
    elapsedHrs,
    remainingHrs,
    etaIso: remainingHrs === undefined ? undefined : new Date(now + remainingHrs * 3600_000).toISOString(),
  }
}

export interface MissionState {
  /** Zero-based index of the stage the mission is currently in. */
  index: number
  stage: MissionStage
  stagesTotal: number
  /** Hours spent inside the current stage. */
  stageElapsedHrs: number
  /** How far through the current stage, 0-100. */
  stageProgressPct: number
  /** How far through the whole mission, 0-100. */
  missionProgressPct: number
  /** Expected hours for the whole mission. */
  totalExpectedHrs: number
  /** True once elapsed exceeds the whole expected duration. */
  overrunning: boolean
}

/**
 * Where the mission has got to. Stage durations are cumulative, so elapsed time
 * alone tells us which stage the machine is in and how far through it is.
 */
export function computeMissionState(assignment: FloorAssignment, now = Date.now()): MissionState {
  const stages = assignment.missionStages
  const elapsedHrs = Math.max(0, (now - new Date(assignment.startedAt).getTime()) / 3600_000)
  const totalExpectedHrs = stages.reduce((sum, stage) => sum + stage.expectedHrs, 0)

  let cursor = 0
  for (let i = 0; i < stages.length; i += 1) {
    const stage = stages[i]
    if (elapsedHrs < cursor + stage.expectedHrs || i === stages.length - 1) {
      const stageElapsedHrs = Math.max(0, elapsedHrs - cursor)
      return {
        index: i,
        stage,
        stagesTotal: stages.length,
        stageElapsedHrs,
        stageProgressPct: Math.min(100, (stageElapsedHrs / stage.expectedHrs) * 100),
        missionProgressPct: Math.min(100, (elapsedHrs / totalExpectedHrs) * 100),
        totalExpectedHrs,
        overrunning: elapsedHrs > totalExpectedHrs,
      }
    }
    cursor += stage.expectedHrs
  }

  // Unreachable for a non-empty stage list; kept for exhaustiveness.
  return {
    index: 0,
    stage: stages[0],
    stagesTotal: stages.length,
    stageElapsedHrs: elapsedHrs,
    stageProgressPct: 100,
    missionProgressPct: 100,
    totalExpectedHrs,
    overrunning: true,
  }
}

function shiftWindow(now: Date) {
  const hour = now.getHours()
  const startHour = hour >= 6 && hour < 14 ? 6 : hour >= 14 && hour < 22 ? 14 : 22
  const start = new Date(now)
  start.setHours(startHour, 0, 0, 0)
  // The C shift starts on the previous calendar day for the small hours.
  if (startHour === 22 && hour < 6) start.setDate(start.getDate() - 1)
  const end = new Date(start.getTime() + 8 * 3600_000)
  return { start, end }
}

function countStatus(list: FloorAssignment[], status: MachineStatus) {
  return list.filter((a) => a.status === status).length
}

export interface FloorFilters {
  factoryId?: FactoryId
  status?: MachineStatus
  process?: string
  search?: string
}

export async function getFloorBoard(filters: FloorFilters = {}): Promise<FloorBoard> {
  const now = new Date()
  const shift = shiftForHour(now.getHours())
  const { start, end } = shiftWindow(now)

  let assignments = buildFloorAssignments(now)
  if (filters.factoryId && filters.factoryId !== 'all') {
    assignments = assignments.filter((a) => a.factoryId === filters.factoryId)
  }
  if (filters.status) assignments = assignments.filter((a) => a.status === filters.status)
  if (filters.process) assignments = assignments.filter((a) => a.process === filters.process)
  if (filters.search) {
    const q = filters.search.toLowerCase()
    assignments = assignments.filter((a) =>
      [a.machineCode, a.operator.name, a.operator.employeeCode, a.productionOrderNo ?? '', a.productName ?? '', a.process]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }

  const units: FloorUnitBoard[] = factories
    .map((factory) => {
      const list = assignments.filter((a) => a.factoryId === factory.id)
      return {
        factoryId: factory.id,
        factoryName: factory.name,
        shortName: factory.shortName,
        countGroup: factory.countGroup,
        assignments: list,
        running: countStatus(list, 'Running'),
        idle: countStatus(list, 'Idle'),
        breakdown: countStatus(list, 'Breakdown'),
        maintenance: countStatus(list, 'Maintenance'),
        operatorsOnShift: new Set(list.map((a) => a.operator.id)).size,
      }
    })
    .filter((unit) => unit.assignments.length > 0)

  const running = assignments.filter((a) => a.status !== 'Breakdown')
  const summary: FloorSummary = {
    shift,
    shiftStartsAt: start.toISOString(),
    shiftEndsAt: end.toISOString(),
    machines: assignments.length,
    running: countStatus(assignments, 'Running'),
    idle: countStatus(assignments, 'Idle'),
    breakdown: countStatus(assignments, 'Breakdown'),
    maintenance: countStatus(assignments, 'Maintenance'),
    operatorsOnShift: new Set(assignments.map((a) => a.operator.id)).size,
    avgOeePct: running.length
      ? Math.round((running.reduce((s, a) => s + a.oeePct, 0) / running.length) * 10) / 10
      : 0,
    jobsInProgress: assignments.filter((a) => Boolean(a.productionOrderNo) && a.task === 'Running production')
      .length,
  }

  return simulateDelay({ summary, units }, 60, 140)
}

export interface FloorRosterRow {
  operator: Operator
  assignment: FloorAssignment
}

/** The flat "who is working on what right now" list under the board. */
export async function getFloorRoster(filters: FloorFilters = {}): Promise<FloorRosterRow[]> {
  const board = await getFloorBoard(filters)
  const rows = board.units
    .flatMap((unit) => unit.assignments)
    .map((assignment) => ({ operator: assignment.operator, assignment }))

  const statusRank: Record<MachineStatus, number> = {
    Breakdown: 0,
    Maintenance: 1,
    Idle: 2,
    Running: 3,
  }
  rows.sort(
    (a, b) =>
      statusRank[a.assignment.status] - statusRank[b.assignment.status] ||
      a.assignment.machineCode.localeCompare(b.assignment.machineCode),
  )
  return rows
}

export async function getOperatorsOnShift(factoryId?: FactoryId) {
  const shift = shiftForHour(new Date().getHours())
  return simulateDelay(operatorsOnShift(shift, factoryId))
}
