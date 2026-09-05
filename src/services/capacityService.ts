/**
 * Capacity planning engine.
 *
 * Answers the four questions a spinning planner asks before committing to an
 * order, in the order they have to be asked:
 *
 *   1. AVAILABILITY  Which machines can carry work right now, and which are out?
 *   2. CAPACITY      What does that fleet produce over the horizon, after
 *                    planned downtime and at each machine's own OEE?
 *   3. LOAD          What has the order book already committed to those machines?
 *   4. BALANCE       When does the committed load clear, and how much capacity
 *                    is left over to sell?
 *
 * Every figure below is derived — nothing is hard-coded per unit except the
 * nameplate rates in `mock/capacity.ts`, which stand in for the machine
 * specifications a real installation would hold in its master data.
 */
import type { FactoryId, Machine, MachineStatus, ProcessName, ProductionOrder } from '@/types'
import {
  AVAILABILITY_FACTOR,
  HOURS_PER_DAY,
  MTTR_HOURS,
  PLANNING_BUFFER_PCT,
  PM_WINDOW_HOURS,
  SHIFTS_PER_DAY,
  breakdowns,
  factories,
  fallbackRateKgPerHour,
  machines,
  plannedDowntime,
  primaryRouteByFactory,
  RESTORED_OEE_PCT,
  productionOrders,
  standardRateKgPerHour,
} from '@/mock'
import { simulateDelay } from './delay'

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** Hours a day that survive the planned-downtime allowance. */
const PRODUCTIVE_HOURS_PER_DAY = HOURS_PER_DAY * AVAILABILITY_FACTOR

const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0)

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/** Machines that can be scheduled: running now, or idle and ready to take work. */
const DEPLOYABLE: MachineStatus[] = ['Running', 'Idle']

export interface FleetAvailability {
  total: number
  running: number
  idle: number
  maintenance: number
  breakdown: number
  /** Running + idle — the fleet the schedule can actually be built on. */
  deployable: number
  /** Idle and healthy: free to start a job this shift. */
  availableNow: number
  /** Down for repair or PM, expected back inside the horizon. */
  returningInHorizon: number
  /** Machine-hours lost to the down fleet over the horizon. */
  hoursLostToDowntime: number
  avgOeePct: number
  avgUtilizationPct: number
}

/** Nameplate kg per hour for one machine, from the unit/process rate table. */
export function nameplateRate(machine: Machine): number {
  return (
    standardRateKgPerHour[machine.factoryId]?.[machine.process] ??
    fallbackRateKgPerHour[machine.process] ??
    0
  )
}

/** Nameplate rate discounted by that machine's own OEE — what it makes today. */
export function effectiveRate(machine: Machine): number {
  return nameplateRate(machine) * (machine.oeePct / 100)
}

/**
 * Rate to plan the machine at once it is back in service. A machine reading 0%
 * OEE because it is broken down still spins for most of a 30-day horizon.
 */
function plannedRate(machine: Machine): number {
  return nameplateRate(machine) * ((machine.oeePct > 0 ? machine.oeePct : RESTORED_OEE_PCT) / 100)
}

const breakdownByMachine = new Map(breakdowns.map((b) => [b.machineId, b]))

/** When a down machine is expected back on the schedule. */
function expectedBackAt(machine: Machine, now: number): number | null {
  if (machine.status === 'Breakdown') {
    const record = breakdownByMachine.get(machine.id)
    const started = record ? new Date(record.startTime).getTime() : now
    return Math.max(now + HOUR_MS, started + MTTR_HOURS * HOUR_MS)
  }
  if (machine.status === 'Maintenance') return now + PM_WINDOW_HOURS * HOUR_MS
  return null
}

/**
 * Calendar hours a machine is on the schedule across the horizon. A machine in
 * repair or PM is credited from the moment it is expected back, not written off
 * for the whole horizon.
 */
function schedulableHours(machine: Machine, horizonDays: number, now: number): number {
  const horizonHours = horizonDays * HOURS_PER_DAY
  const back = expectedBackAt(machine, now)
  if (back === null) return horizonHours
  const downHours = Math.min(Math.max(back - now, 0) / HOUR_MS, horizonHours)
  return horizonHours - downHours
}

function buildAvailability(list: Machine[], horizonDays: number, now: number): FleetAvailability {
  const byStatus = (status: MachineStatus) => list.filter((m) => m.status === status)
  const running = byStatus('Running')
  const idle = byStatus('Idle')
  const maintenance = byStatus('Maintenance')
  const breakdown = byStatus('Breakdown')
  const down = [...maintenance, ...breakdown]
  const horizonEnd = now + horizonDays * DAY_MS

  const healthy = [...running, ...idle]
  const avg = (values: number[]) => (values.length ? sum(values) / values.length : 0)

  return {
    total: list.length,
    running: running.length,
    idle: idle.length,
    maintenance: maintenance.length,
    breakdown: breakdown.length,
    deployable: healthy.length,
    availableNow: idle.length,
    returningInHorizon: down.filter((m) => {
      const back = expectedBackAt(m, now)
      return back !== null && back <= horizonEnd
    }).length,
    hoursLostToDowntime: round(
      sum(
        down.map((m) => {
          const back = expectedBackAt(m, now) ?? horizonEnd
          return Math.min(Math.max(back - now, 0), horizonDays * DAY_MS) / HOUR_MS
        }),
      ),
      0,
    ),
    avgOeePct: round(avg(healthy.map((m) => m.oeePct))),
    avgUtilizationPct: round(avg(healthy.map((m) => m.utilizationPct))),
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/** Orders that consume machine hours. Quality Check has already left the machine. */
const SCHEDULED_STATUSES = new Set(['Planned', 'In Progress'])

/** Yarn still to be spun on an order. Non-kg lines are excluded from kg capacity. */
function remainingKg(order: ProductionOrder): number {
  if (order.unit !== 'kg') return 0
  return Math.max(0, order.plannedQty - order.producedQty)
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export interface CapacityBalance {
  /** Deployable machines x 24 h x horizon. */
  grossHours: number
  /** Gross hours after the planned-downtime allowance. */
  netHours: number
  /** Throughput an hour for the group, at the rate that actually governs it. */
  groupRateKgPerHr: number
  dailyCapacityKg: number
  /** Daily capacity x horizon — what the group can make over the horizon. */
  capacityKg: number
  /** Remaining quantity on Planned and In Progress orders routed here. */
  committedKg: number
  /** Productive hours those kilograms consume. */
  committedHours: number
  /** Sitting on hold — not scheduled, but it will land back on this stage. */
  onHoldKg: number
  /** Produced and waiting on the lab — no longer machine load. */
  awaitingQcKg: number
  freeKg: number
  loadPct: number
  /** Days of running to clear the committed backlog. Null when nothing can run. */
  clearanceDays: number | null
  clearanceDate: string | null
  /** Clearance if every on-hold order were released today. */
  clearanceDaysWithOnHold: number | null
  scheduledOrders: number
  onHoldOrders: number
}

/**
 * Kilograms a day one *stage* delivers, averaged across the horizon. Machines
 * inside a stage run in parallel, so their rates add; each contributes only for
 * the hours it is actually on the schedule.
 */
function stageDailyCapacityKg(list: Machine[], horizonDays: number, now: number): number {
  const horizonKg = sum(
    list.map((m) => plannedRate(m) * schedulableHours(m, horizonDays, now) * AVAILABILITY_FACTOR),
  )
  return horizonDays > 0 ? horizonKg / horizonDays : 0
}

/**
 * Balances one group's capacity against its load.
 *
 * `dailyCapacityKg` is supplied rather than derived, because how capacity
 * combines depends on the group: machines inside a stage run in parallel and
 * add up, whereas the stages along a route run in series and the slowest one
 * governs. Only the caller knows which shape it is looking at.
 */
function buildBalance(
  list: Machine[],
  orders: ProductionOrder[],
  horizonDays: number,
  now: number,
  dailyCapacityKg: number,
): CapacityBalance {
  const groupRateKgPerHr = dailyCapacityKg / PRODUCTIVE_HOURS_PER_DAY
  const capacityKg = dailyCapacityKg * horizonDays
  const grossHours = sum(list.map((m) => schedulableHours(m, horizonDays, now)))

  const scheduled = orders.filter((o) => SCHEDULED_STATUSES.has(o.status))
  const onHold = orders.filter((o) => o.status === 'On Hold')
  const committedKg = sum(scheduled.map(remainingKg))
  const onHoldKg = sum(onHold.map(remainingKg))

  const clearanceDays = dailyCapacityKg > 0 ? committedKg / dailyCapacityKg : null
  const clearanceWithOnHold = dailyCapacityKg > 0 ? (committedKg + onHoldKg) / dailyCapacityKg : null

  return {
    grossHours: round(grossHours, 0),
    netHours: round(grossHours * AVAILABILITY_FACTOR, 0),
    groupRateKgPerHr: round(groupRateKgPerHr),
    dailyCapacityKg: Math.round(dailyCapacityKg),
    capacityKg: Math.round(capacityKg),
    committedKg: Math.round(committedKg),
    committedHours: round(groupRateKgPerHr > 0 ? committedKg / groupRateKgPerHr : 0, 0),
    onHoldKg: Math.round(onHoldKg),
    awaitingQcKg: Math.round(sum(orders.filter((o) => o.status === 'Quality Check').map(remainingKg))),
    freeKg: Math.round(Math.max(0, capacityKg - committedKg)),
    loadPct: capacityKg > 0 ? round((committedKg / capacityKg) * 100) : 0,
    clearanceDays: clearanceDays === null ? null : round(clearanceDays),
    clearanceDate: clearanceDays === null ? null : new Date(now + clearanceDays * DAY_MS).toISOString(),
    clearanceDaysWithOnHold: clearanceWithOnHold === null ? null : round(clearanceWithOnHold),
    scheduledOrders: scheduled.length,
    onHoldOrders: onHold.length,
  }
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface ProcessCapacityRow extends CapacityBalance {
  process: ProcessName
  fleet: FleetAvailability
  avgNameplateKgPerHr: number
  /** True when every kilogram from its unit has to cross this stage. */
  onPrimaryRoute: boolean
  /** The stage the whole scope is waiting on — the one that clears last. */
  isBottleneck: boolean
}

export interface UnitCapacityRow extends CapacityBalance {
  factoryId: Exclude<FactoryId, 'all'>
  name: string
  shortName: string
  countGroup: string
  installedCapacity: string
  fleet: FleetAvailability
  /** Lowest-throughput stage on the route — what caps this unit structurally. */
  constrainingProcess: ProcessName | null
  /** Stage that will take longest to clear what it is holding today. */
  slowestProcess: ProcessName | null
}

export interface IntakeAssessment {
  /** Free capacity at the constraining stage over the horizon. */
  freeKg: number
  /** Planning cushion held back from that. */
  bufferKg: number
  /** What the planner may actually quote. */
  quotableKg: number
  constrainedBy: ProcessName | null
  /** Mean size of an open order — the yardstick for "how many orders". */
  avgOrderKg: number
  acceptableOrders: number
  /** Earliest date a new order can start at the constraining stage. */
  nextSlotDate: string | null
}

export interface BurndownPoint {
  day: number
  date: string
  /** Committed backlog still outstanding at the end of that day. */
  backlogKg: number
  /** Same, if every on-hold order were released today. */
  backlogWithOnHoldKg: number
}

export interface CapacityPlan {
  generatedAt: string
  horizonDays: number
  scopeLabel: string
  assumptions: {
    shiftsPerDay: number
    hoursPerDay: number
    availabilityPct: number
    maintenanceAllowancePct: number
    changeoverAllowancePct: number
    planningBufferPct: number
    mttrHours: number
    pmWindowHours: number
  }
  fleet: FleetAvailability
  plant: CapacityBalance
  byProcess: ProcessCapacityRow[]
  byUnit: UnitCapacityRow[]
  bottleneck: ProcessCapacityRow | null
  intake: IntakeAssessment
  burndown: BurndownPoint[]
}

function scopeMachines(factoryId: FactoryId) {
  return factoryId === 'all' ? machines : machines.filter((m) => m.factoryId === factoryId)
}

function scopeOrders(factoryId: FactoryId) {
  return factoryId === 'all'
    ? productionOrders
    : productionOrders.filter((o) => o.factoryId === factoryId)
}

/**
 * The whole plan for one scope and horizon: availability, capacity, load,
 * balance, the constraining stage, and what is left to sell.
 */
export async function getCapacityPlan(
  horizonDays = 30,
  factoryId: FactoryId = 'all',
): Promise<CapacityPlan> {
  const now = Date.now()
  const list = scopeMachines(factoryId)
  const orders = scopeOrders(factoryId)

  const fleet = buildAvailability(list, horizonDays, now)

  // --- stage table --------------------------------------------------------
  // One entry per (unit, process). A stage on the unit's primary route carries
  // that unit's whole open backlog, because every kilogram crosses it. A stage
  // off the route — winding, doubling, gassing — carries only the orders
  // actually routed to it.
  const unitScope = factoryId === 'all' ? factories : factories.filter((f) => f.id === factoryId)

  interface Stage {
    factoryId: Exclude<FactoryId, 'all'>
    process: ProcessName
    onRoute: boolean
    machines: Machine[]
    orders: ProductionOrder[]
    dailyCapacityKg: number
  }

  const stages: Stage[] = unitScope.flatMap((factory) => {
    const unitMachines = list.filter((m) => m.factoryId === factory.id)
    const unitOrders = orders.filter((o) => o.factoryId === factory.id)
    const route = primaryRouteByFactory[factory.id] ?? []
    return [...new Set(unitMachines.map((m) => m.process))].map((process) => {
      const stageMachines = unitMachines.filter((m) => m.process === process)
      const onRoute = route.includes(process)
      return {
        factoryId: factory.id,
        process,
        onRoute,
        machines: stageMachines,
        orders: onRoute ? unitOrders : unitOrders.filter((o) => o.process === process),
        dailyCapacityKg: stageDailyCapacityKg(stageMachines, horizonDays, now),
      }
    })
  })

  // --- per process --------------------------------------------------------
  // The same stage in different units runs in parallel, so capacities add.
  const byProcess: ProcessCapacityRow[] = [...new Set(stages.map((s) => s.process))]
    .map((process) => {
      const group = stages.filter((s) => s.process === process)
      const procMachines = group.flatMap((s) => s.machines)
      const procOrders = group.flatMap((s) => s.orders)
      const deployable = procMachines.filter((m) => DEPLOYABLE.includes(m.status))
      return {
        process,
        fleet: buildAvailability(procMachines, horizonDays, now),
        avgNameplateKgPerHr: deployable.length
          ? round(sum(deployable.map(nameplateRate)) / deployable.length)
          : 0,
        onPrimaryRoute: group.some((s) => s.onRoute),
        isBottleneck: false,
        ...buildBalance(
          procMachines,
          procOrders,
          horizonDays,
          now,
          sum(group.map((s) => s.dailyCapacityKg)),
        ),
      }
    })
    .sort((a, b) => (b.clearanceDays ?? Infinity) - (a.clearanceDays ?? Infinity))

  // The stage that clears last is what any new order has to queue behind.
  const bottleneck = byProcess.find((r) => r.committedKg > 0) ?? byProcess[0] ?? null
  if (bottleneck) bottleneck.isBottleneck = true

  // --- per unit -----------------------------------------------------------
  // Along a route the slowest stage governs — capacities do not add.
  const byUnit: UnitCapacityRow[] = unitScope.map((factory) => {
    const unitMachines = list.filter((m) => m.factoryId === factory.id)
    const unitOrders = orders.filter((o) => o.factoryId === factory.id)
    const unitStages = stages.filter((s) => s.factoryId === factory.id)
    const routeStages = unitStages.filter((s) => s.onRoute)

    const governing = routeStages
      .slice()
      .sort((a, b) => a.dailyCapacityKg - b.dailyCapacityKg)[0]
    const routeDailyKg = governing
      ? governing.dailyCapacityKg
      : sum(unitStages.map((s) => s.dailyCapacityKg))

    // Which stage inside the unit will take longest to clear what it holds.
    const slowest = unitStages
      .map((s) => ({
        process: s.process,
        days: s.dailyCapacityKg > 0 ? sum(s.orders.map(remainingKg)) / s.dailyCapacityKg : Infinity,
      }))
      .filter((s) => s.days > 0)
      .sort((a, b) => b.days - a.days)[0]

    return {
      factoryId: factory.id,
      name: factory.name,
      shortName: factory.shortName,
      countGroup: factory.countGroup,
      installedCapacity: factory.installedCapacity,
      fleet: buildAvailability(unitMachines, horizonDays, now),
      constrainingProcess: governing?.process ?? null,
      slowestProcess: slowest?.process ?? null,
      ...buildBalance(unitMachines, unitOrders, horizonDays, now, routeDailyKg),
    }
  })

  // --- plant --------------------------------------------------------------
  // Units run in parallel, so their route capacities add.
  const plant = buildBalance(
    list,
    orders,
    horizonDays,
    now,
    sum(byUnit.map((u) => u.dailyCapacityKg)),
  )

  // --- intake -------------------------------------------------------------
  // What is left after the committed backlog, less the planning cushion.
  const openOrderSizes = orders
    .filter((o) => SCHEDULED_STATUSES.has(o.status))
    .map((o) => o.plannedQty)
    .filter((qty) => qty > 0)
  const avgOrderKg = openOrderSizes.length ? sum(openOrderSizes) / openOrderSizes.length : 0
  const freeKg = plant.freeKg
  const bufferKg = Math.round((freeKg * PLANNING_BUFFER_PCT) / 100)
  const quotableKg = Math.max(0, freeKg - bufferKg)

  const intake: IntakeAssessment = {
    freeKg,
    bufferKg,
    quotableKg,
    constrainedBy: bottleneck?.process ?? null,
    avgOrderKg: Math.round(avgOrderKg),
    acceptableOrders: avgOrderKg > 0 ? Math.floor(quotableKg / avgOrderKg) : 0,
    nextSlotDate: plant.clearanceDate,
  }
  // --- burn-down ----------------------------------------------------------
  const burndown: BurndownPoint[] = Array.from({ length: horizonDays + 1 }, (_, day) => {
    const produced = plant.dailyCapacityKg * day
    return {
      day,
      date: new Date(now + day * DAY_MS).toISOString(),
      backlogKg: Math.max(0, Math.round(plant.committedKg - produced)),
      backlogWithOnHoldKg: Math.max(0, Math.round(plant.committedKg + plant.onHoldKg - produced)),
    }
  })

  return simulateDelay({
    generatedAt: new Date(now).toISOString(),
    horizonDays,
    scopeLabel:
      factoryId === 'all' ? 'All units' : (factories.find((f) => f.id === factoryId)?.name ?? factoryId),
    assumptions: {
      shiftsPerDay: SHIFTS_PER_DAY,
      hoursPerDay: HOURS_PER_DAY,
      availabilityPct: round(AVAILABILITY_FACTOR * 100),
      maintenanceAllowancePct: plannedDowntime.maintenanceAllowancePct,
      changeoverAllowancePct: plannedDowntime.changeoverAllowancePct,
      planningBufferPct: PLANNING_BUFFER_PCT,
      mttrHours: MTTR_HOURS,
      pmWindowHours: PM_WINDOW_HOURS,
    },
    fleet,
    plant,
    byProcess,
    byUnit,
    bottleneck: bottleneck ?? null,
    intake,
    burndown,
  })
}

// ---------------------------------------------------------------------------
// Machine run-out — when does each machine come free?
// ---------------------------------------------------------------------------

export type MachineAvailabilityState = 'Available now' | 'Frees up' | 'Under repair' | 'PM window'

export interface MachineRunOutRow {
  id: string
  code: string
  factoryId: FactoryId
  unitName: string
  process: ProcessName
  make: string
  status: MachineStatus
  state: MachineAvailabilityState
  oeePct: number
  /** Rate the machine is planned at once in service. */
  rateKgPerHr: number
  /** What it is delivering right now — zero while it is broken down. */
  currentRateKgPerHr: number
  activeOrders: number
  currentOrderNo: string | null
  currentProduct: string | null
  remainingKg: number
  hoursToFinish: number | null
  /** When the machine is next able to start new work. */
  freeAtIso: string
  freeInHours: number
}

const stateFor = (status: MachineStatus, hasWork: boolean): MachineAvailabilityState => {
  if (status === 'Breakdown') return 'Under repair'
  if (status === 'Maintenance') return 'PM window'
  return hasWork ? 'Frees up' : 'Available now'
}

/**
 * Per-machine finish clock: what each machine is running, how long the balance
 * takes at its own effective rate, and the moment it can accept the next job.
 */
export async function getMachineRunOut(factoryId: FactoryId = 'all'): Promise<MachineRunOutRow[]> {
  const now = Date.now()
  const list = scopeMachines(factoryId)
  const unitNames = new Map(factories.map((f) => [f.id as string, f.shortName]))
  const productiveHoursPerDay = HOURS_PER_DAY * AVAILABILITY_FACTOR

  const rows = list.map((machine) => {
    const jobs = productionOrders.filter(
      (o) => o.machineId === machine.id && SCHEDULED_STATUSES.has(o.status),
    )
    const remaining = sum(jobs.map(remainingKg))
    // Planned rather than current rate, so a machine in repair still gets a
    // finish estimate for the work waiting on it.
    const rate = plannedRate(machine)

    // Wall-clock hours, so the planned-downtime allowance is priced in.
    const hoursToFinish =
      remaining > 0 && rate > 0 ? (remaining / rate) * (HOURS_PER_DAY / productiveHoursPerDay) : 0

    // A machine that is down and still holding work is free only once it is
    // back *and* has run that work off.
    const downUntil = expectedBackAt(machine, now)
    const startsAt = downUntil !== null ? Math.max(now, downUntil) : now
    const freeAt = startsAt + hoursToFinish * HOUR_MS

    // The largest balance is the one that decides when the machine comes free.
    const current = jobs.slice().sort((a, b) => remainingKg(b) - remainingKg(a))[0] ?? null

    return {
      id: machine.id,
      code: machine.code,
      factoryId: machine.factoryId,
      unitName: unitNames.get(machine.factoryId) ?? machine.factoryId,
      process: machine.process,
      make: machine.make,
      status: machine.status,
      state: stateFor(machine.status, remaining > 0),
      oeePct: machine.oeePct,
      rateKgPerHr: round(rate),
      currentRateKgPerHr: round(effectiveRate(machine)),
      activeOrders: jobs.length,
      currentOrderNo: current?.orderNo ?? null,
      currentProduct: current?.productName ?? null,
      remainingKg: Math.round(remaining),
      hoursToFinish: hoursToFinish > 0 ? round(hoursToFinish) : null,
      freeAtIso: new Date(freeAt).toISOString(),
      freeInHours: round(Math.max(0, freeAt - now) / HOUR_MS),
    }
  })

  return simulateDelay(rows.sort((a, b) => a.freeInHours - b.freeInHours))
}

// ---------------------------------------------------------------------------
// "Can we take this order?" — pure, so the planner gets an answer as they type
// ---------------------------------------------------------------------------

export type FeasibilityVerdict = 'accept' | 'tight' | 'decline'

export interface OrderFeasibility {
  verdict: FeasibilityVerdict
  constrainedBy: ProcessName | null
  /** Days the order waits behind the committed backlog. */
  queueDays: number
  /** Days of running the order itself needs at the constraining stage. */
  runDays: number
  /** Queue + run. */
  leadTimeDays: number
  promiseDate: string | null
  /** Requested date minus the promise date. Negative means we would be late. */
  slackDays: number
  /** Share of quotable capacity the order would consume. */
  capacityUsedPct: number
  headline: string
  recommendation: string
}

/**
 * Schedules a hypothetical order against the plan: it queues behind the
 * committed backlog, then runs at the plant's route throughput. The stage that
 * clears last is carried through as the risk to watch, since an order routed
 * across it will not see this lead time.
 */
export function assessOrderFeasibility(
  plan: CapacityPlan,
  input: { qtyKg: number; dueInDays: number },
): OrderFeasibility {
  const qty = Math.max(0, input.qtyKg)
  const daily = plan.plant.dailyCapacityKg
  const watchStage = plan.bottleneck?.process ?? null

  if (daily <= 0 || qty <= 0) {
    return {
      verdict: 'decline',
      constrainedBy: watchStage,
      queueDays: 0,
      runDays: 0,
      leadTimeDays: 0,
      promiseDate: null,
      slackDays: 0,
      capacityUsedPct: 0,
      headline: qty <= 0 ? 'Enter a quantity' : 'No schedulable capacity',
      recommendation:
        qty <= 0
          ? 'Enter the quantity and the number of days the customer allows.'
          : 'No machine in scope can be scheduled. Restore the fleet before quoting.',
    }
  }

  const queueDays = round(plan.plant.clearanceDays ?? 0)
  const runDays = round(qty / daily)
  const leadTimeDays = round(queueDays + runDays)
  const slackDays = round(input.dueInDays - leadTimeDays)
  const promiseDate = new Date(Date.now() + leadTimeDays * DAY_MS).toISOString()
  const capacityUsedPct = plan.intake.quotableKg > 0 ? round((qty / plan.intake.quotableKg) * 100) : 100

  const verdict: FeasibilityVerdict =
    slackDays >= 3 && capacityUsedPct <= 100
      ? 'accept'
      : slackDays >= 0 && capacityUsedPct <= 100
        ? 'tight'
        : 'decline'

  const headline =
    verdict === 'accept'
      ? `Accept — ${slackDays} days of slack`
      : verdict === 'tight'
        ? `Accept with care — ${slackDays} days of slack`
        : slackDays < 0
          ? `Renegotiate — ${Math.abs(slackDays)} days late`
          : 'Renegotiate — exceeds quotable capacity'

  const watchNote = watchStage
    ? ` Check the routing: ${watchStage} is the stage clearing last, so anything crossing it will run longer.`
    : ''

  const recommendation =
    verdict === 'accept'
      ? `The order book clears in ${queueDays} days, then this order needs ${runDays} days of running. Allocate the cotton lot before releasing it to the floor.${watchNote}`
      : verdict === 'tight'
        ? `It lands on the due date with nothing left for rework. Either commit the ${plan.assumptions.planningBufferPct}% planning buffer to it, or bring idle machines on line to pull the date in.${watchNote}`
        : slackDays < 0
          ? `The plant cannot deliver by that date. Options: promise ${leadTimeDays} days instead, split the quantity across units, or expedite it ahead of lower-priority backlog.${watchNote}`
          : `The quantity is larger than the ${plan.horizonDays}-day quotable capacity. Split it across horizons or units before committing.${watchNote}`

  return {
    verdict,
    constrainedBy: watchStage,
    queueDays,
    runDays,
    leadTimeDays,
    promiseDate,
    slackDays,
    capacityUsedPct,
    headline,
    recommendation,
  }
}
