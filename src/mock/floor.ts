/**
 * The shop-floor board.
 *
 * Joins the machine registry to the people on the current shift and to the
 * production order each machine is actually running, so the board is a view of
 * records that already exist rather than a second, parallel dataset.
 *
 * Progress is deliberately *not* stored. Each assignment carries a start time
 * and an output rate; the service computes quantity produced from the clock, so
 * bars advance on their own while the board is open and every reader agrees on
 * the same number.
 */
import type { FloorAssignment, FloorTask, MissionStage, Operator, ProcessName, Shift } from '@/types'
import { makeRng } from '@/lib/random'
import { machines } from './machines'
import { productionOrders } from './production'
import { salesOrders } from './orders'
import { breakdowns, pmTasks } from './maintenance'
import { engineers } from './engineers'
import { operators, shiftForHour } from './operators'

/** Nameplate output per hour by process, sized to ~25,000 kg/day of yarn. */
const rateKgPerHourByProcess: Record<ProcessName, [number, number]> = {
  'Blow Room': [380, 460],
  Carding: [55, 75],
  Combing: [40, 58],
  Drawing: [70, 95],
  Roving: [32, 48],
  'Ring Spinning': [14, 26],
  'Open End': [58, 82],
  Winding: [42, 64],
  TFO: [18, 30],
  Gassing: [22, 34],
  Weaving: [30, 45],
}

const runningTaskDetail: Partial<Record<ProcessName, string[]>> = {
  'Blow Room': ['Mixing fed to the line, bale sequence per the plan', 'Opening and cleaning, trash extraction on set point'],
  Carding: ['Carding to sliver, flat speed on set point', 'Sliver delivery running, autoleveller engaged'],
  Combing: ['Combing to noil target, lap feed steady', 'Detaching and piecing on set gauge'],
  Drawing: ['Two-passage drawing, autoleveller correcting', 'Sliver doubling to set hank'],
  Roving: ['Roving to set twist, bobbin build normal', 'Speed frame running to hank plan'],
  'Ring Spinning': [
    'Spinning to count, end breakage inside band',
    'Compact spinning, suction on the condensing zone verified',
    'Ring frame at full doff, traveller matched to count',
  ],
  'Open End': ['Rotor spinning to coarse count, splice rate normal', 'Autocoro running, yarn fault map clean'],
  Winding: ['Winding to cone, clearer settings verified', 'Package build to customer spec, splicing normal'],
  TFO: ['Two-for-one twisting to set TPI', 'Doubling to two-fold count, tension balanced'],
  Gassing: ['Singeing to house specification, flame stable', 'Gassing pass at set speed'],
  Weaving: ['Weaving to greige spec, weft feeder steady'],
}

const changeoverDetail = [
  'Count changeover in progress — creel emptied, drafting gauges being reset',
  'Changeover to the next count, travellers and cots being matched',
]
const doffingDetail = [
  'Full doff in progress, bobbins being cleared to the trolley',
  'Doffing cycle running, empties loaded and restart imminent',
]
const cleaningDetail = [
  'Scheduled cleaning and lubrication, fly cleared from the drafting zone',
  'Machine wipe-down and lubrication to the weekly card',
]
const qualityDetail = [
  'Sample drawn for the Central Testing Laboratory, awaiting clearance',
  'In-process check against the count and evenness band',
]
const awaitingDetail = [
  'Waiting on sliver from the previous process',
  'Waiting on an approved cotton lot to be released to the mixing',
  'Waiting on the next production order to be sequenced',
]

/**
 * What each kind of mission actually runs through on the floor. Expected hours
 * are what the stage normally takes, which is how the board works out where a
 * machine currently is without anyone keying it in.
 */
const missionStagesByTask: Record<FloorTask, MissionStage[]> = {
  'Running production': [
    { name: 'Creel & set-up', detail: 'Material loaded, gauges and speeds set to the count.', expectedHrs: 0.4 },
    { name: 'Start-up & piecing', detail: 'Ends pieced up, machine brought to running speed.', expectedHrs: 0.5 },
    { name: 'Steady running', detail: 'Producing to plan, end breakage monitored against the band.', expectedHrs: 5.2 },
    { name: 'Doffing', detail: 'Full packages cleared, empties loaded, restart.', expectedHrs: 0.6 },
    { name: 'In-process check', detail: 'Sample drawn and checked against count and evenness limits.', expectedHrs: 0.8 },
    { name: 'Shift handover', detail: 'Output booked and the machine handed to the next shift.', expectedHrs: 0.5 },
  ],
  'Count changeover': [
    { name: 'Clear the creel', detail: 'Previous count run out and the creel emptied.', expectedHrs: 0.5 },
    { name: 'Reset drafting', detail: 'Drafting gauges and break draft reset to the new count.', expectedHrs: 0.7 },
    { name: 'Match travellers & cots', detail: 'Traveller number and cots matched to the new count and speed.', expectedHrs: 0.6 },
    { name: 'Trial run', detail: 'Short trial run, tension and breakage checked.', expectedHrs: 0.5 },
    { name: 'Release to production', detail: 'Signed off and returned to the plan.', expectedHrs: 0.3 },
  ],
  Doffing: [
    { name: 'Stop & clear', detail: 'Machine stopped at full doff, guards opened.', expectedHrs: 0.15 },
    { name: 'Doff packages', detail: 'Full bobbins cleared to the trolley.', expectedHrs: 0.35 },
    { name: 'Load empties', detail: 'Empty bobbins loaded and seated.', expectedHrs: 0.2 },
    { name: 'Restart & verify', detail: 'Restart, verify build and end breakage.', expectedHrs: 0.25 },
  ],
  'Cleaning & lubrication': [
    { name: 'Isolate', detail: 'Machine stopped and isolated for the routine.', expectedHrs: 0.2 },
    { name: 'Clear fly', detail: 'Drafting zone and suction cleared of fly.', expectedHrs: 0.6 },
    { name: 'Lubricate', detail: 'Lubrication points serviced to the weekly card.', expectedHrs: 0.5 },
    { name: 'Function check', detail: 'Free rotation and guards checked before restart.', expectedHrs: 0.3 },
    { name: 'Restore', detail: 'Machine restored to the plan.', expectedHrs: 0.2 },
  ],
  'Breakdown repair': [
    { name: 'Isolate & tag out', detail: 'Drive power locked out, area secured.', expectedHrs: 0.5 },
    { name: 'Diagnose', detail: 'Fault traced and confirmed against the case history.', expectedHrs: 1.2 },
    { name: 'Draw spares', detail: 'Required parts pulled from stores.', expectedHrs: 0.6 },
    { name: 'Repair', detail: 'Component replaced and reset to specification.', expectedHrs: 2.4 },
    { name: 'Run-in & verify', detail: 'Graded run-in, vibration and temperature checked.', expectedHrs: 1.0 },
    { name: 'Release', detail: 'Machine signed back into production.', expectedHrs: 0.4 },
  ],
  'Preventive maintenance': [
    { name: 'Isolate', detail: 'Machine taken out of the plan and isolated.', expectedHrs: 0.3 },
    { name: 'Inspection', detail: 'Checklist inspection against the PM card.', expectedHrs: 1.0 },
    { name: 'Service tasks', detail: 'Wear parts, lubrication and settings serviced.', expectedHrs: 2.2 },
    { name: 'Function test', detail: 'Run at graded speed and verify readings.', expectedHrs: 0.8 },
    { name: 'Sign-off', detail: 'PM record closed and machine released.', expectedHrs: 0.4 },
  ],
  'Quality check': [
    { name: 'Sample drawn', detail: 'Sample taken from the running package.', expectedHrs: 0.2 },
    { name: 'Laboratory testing', detail: 'Tested at the Central Testing Laboratory.', expectedHrs: 1.2 },
    { name: 'Result review', detail: 'Reading compared against the tolerance band.', expectedHrs: 0.4 },
    { name: 'Release or hold', detail: 'Lot released, or held for correction.', expectedHrs: 0.3 },
  ],
  'Awaiting material': [
    { name: 'Shortage reported', detail: 'Operator logged the machine as starved of input.', expectedHrs: 0.2 },
    { name: 'Escalated to planning', detail: 'Planning notified to re-sequence the feed.', expectedHrs: 0.4 },
    { name: 'Material identified', detail: 'Approved material located and allocated.', expectedHrs: 0.8 },
    { name: 'Delivery to machine', detail: 'Material moved to the machine.', expectedHrs: 0.5 },
    { name: 'Restart', detail: 'Machine restarted and brought back to speed.', expectedHrs: 0.3 },
  ],
}

const salesOrderByNo = new Map(salesOrders.map((so) => [so.orderNo, so]))

/** Production orders that are genuinely live, indexed by the machine running them. */
const liveOrderByMachine = new Map<string, (typeof productionOrders)[number]>()
for (const order of productionOrders) {
  if (order.status !== 'In Progress' && order.status !== 'Quality Check') continue
  if (!liveOrderByMachine.has(order.machineId)) liveOrderByMachine.set(order.machineId, order)
}

const breakdownByMachine = new Map(breakdowns.map((b) => [b.machineId, b]))
const pmByMachine = new Map(pmTasks.map((t) => [t.machineId, t]))

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 3600_000).toISOString()
}

/**
 * Pick the person at this machine: an operator on the given shift, in the right
 * unit, certified on the process. Falls back progressively so every machine is
 * manned even where the roster is thin.
 */
function pickOperator(
  factoryId: string,
  process: ProcessName,
  shift: Shift,
  load: Map<string, number>,
): Operator {
  const onShift = operators.filter((o) => o.shift === shift && o.factoryId === factoryId)

  // A tenter dedicated to this process comes first; doffers and fitters are
  // floaters and only get pulled in once the dedicated people are all loaded.
  const dedicated = onShift.filter(
    (o) => o.certifiedProcesses.length === 1 && o.certifiedProcesses[0] === process,
  )
  const floaters = onShift.filter(
    (o) => o.role === 'Doffer' || o.role === 'Maintenance Fitter',
  )
  const pool = dedicated.length ? dedicated : floaters.length ? floaters : onShift.length ? onShift : operators

  // Least-loaded first, so a tenter covering two frames is shown as covering
  // two frames rather than one person appearing against the whole line.
  const chosen = pool.reduce((best, candidate) =>
    (load.get(candidate.id) ?? 0) < (load.get(best.id) ?? 0) ? candidate : best,
  )
  load.set(chosen.id, (load.get(chosen.id) ?? 0) + 1)
  return chosen
}

/** Assignments are rebuilt per call so they follow the clock into the next shift. */
export function buildFloorAssignments(now = new Date()): FloorAssignment[] {
  const shift = shiftForHour(now.getHours())
  const load = new Map<string, number>()
  const seeded = makeRng(4242)

  // How far into the eight-hour shift we are — nothing on the board can have
  // been running longer than that.
  const hour = now.getHours()
  const shiftStartHour = hour >= 6 && hour < 14 ? 6 : hour >= 14 && hour < 22 ? 14 : 22
  const shiftStart = new Date(now)
  shiftStart.setHours(shiftStartHour, 0, 0, 0)
  if (shiftStartHour === 22 && hour < 6) shiftStart.setDate(shiftStart.getDate() - 1)
  const shiftElapsedHrs = Math.max(0.25, (now.getTime() - shiftStart.getTime()) / 3600_000)

  const capped = (hours: number) => hoursAgoIso(Math.min(hours, shiftElapsedHrs))

  const rows = machines.map((machine) => {
    const operator = pickOperator(machine.factoryId, machine.process, shift, load)
    const order = liveOrderByMachine.get(machine.id)
    const salesOrder = order?.salesOrderNo ? salesOrderByNo.get(order.salesOrderNo) : undefined
    const [rateLow, rateHigh] = rateKgPerHourByProcess[machine.process] ?? [30, 50]
    const ratePerHourKg = seeded.float(rateLow, rateHigh, 1)

    let task: FloorTask = 'Running production'
    let taskDetail = seeded.pick(runningTaskDetail[machine.process] ?? ['Running to plan'])
    let startedAt = capped(seeded.float(0.4, 6.5, 2))
    let support: FloorAssignment['support']
    let note: string | undefined

    if (machine.status === 'Breakdown') {
      const record = breakdownByMachine.get(machine.id)
      const engineer = engineers.find(
        (e) => e.department === 'Maintenance' && e.specialities.includes(machine.process),
      ) ?? engineers[0]
      task = 'Breakdown repair'
      taskDetail = record
        ? `Stopped on "${record.reason}". Repair ${record.status.toLowerCase()}, machine isolated.`
        : 'Machine isolated, fault being traced.'
      startedAt = record?.startTime ?? capped(seeded.float(1, 9, 2))
      support = { id: engineer.id, name: engineer.name, role: engineer.role }
      note = 'Contributing zero output while stopped.'
    } else if (machine.status === 'Maintenance') {
      const pm = pmByMachine.get(machine.id)
      task = 'Preventive maintenance'
      taskDetail = pm
        ? `${pm.frequency} preventive service, ${pm.status.toLowerCase()}. Assigned to ${pm.assignedTo}.`
        : 'Scheduled preventive service in progress.'
      startedAt = capped(seeded.float(0.5, 5, 2))
      const fitter = operators.find(
        (o) => o.role === 'Maintenance Fitter' && o.factoryId === machine.factoryId && o.shift === shift,
      )
      if (fitter) support = { id: fitter.id, name: fitter.name, role: fitter.role }
    } else if (machine.status === 'Idle') {
      task = 'Awaiting material'
      taskDetail = seeded.pick(awaitingDetail)
      startedAt = capped(seeded.float(0.2, 2.5, 2))
      note = 'Manned and ready — held on input, not on a fault.'
    } else if (!order) {
      // Running, but between jobs: the shift routine work.
      const routine = seeded.pick(['Cleaning & lubrication', 'Quality check', 'Doffing'] as FloorTask[])
      task = routine
      taskDetail =
        routine === 'Cleaning & lubrication'
          ? seeded.pick(cleaningDetail)
          : routine === 'Quality check'
            ? seeded.pick(qualityDetail)
            : seeded.pick(doffingDetail)
      startedAt = capped(seeded.float(0.1, 1.4, 2))
    } else if (seeded.bool(0.12)) {
      task = 'Count changeover'
      taskDetail = seeded.pick(changeoverDetail)
      startedAt = capped(seeded.float(0.2, 1.8, 2))
    } else if (seeded.bool(0.1)) {
      task = 'Doffing'
      taskDetail = seeded.pick(doffingDetail)
      startedAt = capped(seeded.float(0.05, 0.6, 2))
    }

    // The bar tracks the shift, not the whole order. A ring frame carrying a
    // 12-tonne order would otherwise show weeks remaining on a live board.
    const shiftTargetKg = Math.round(ratePerHourKg * 8)
    const baseQtyKg = 0
    const orderPlannedQtyKg = order?.unit === 'kg' ? order.plannedQty : undefined
    const orderProducedQtyKg = order?.unit === 'kg' ? order.producedQty : undefined

    return {
      id: `fa-${machine.code}`,
      machineId: machine.id,
      machineCode: machine.code,
      machineName: machine.name,
      make: machine.make,
      process: machine.process,
      factoryId: machine.factoryId as FloorAssignment['factoryId'],
      status: machine.status,
      operator,
      support,
      task,
      taskDetail,
      missionStages: missionStagesByTask[task],
      productionOrderNo: order?.orderNo,
      salesOrderNo: order?.salesOrderNo,
      productName: order?.productName,
      customerName: salesOrder?.customerName,
      shiftTargetKg,
      baseQtyKg,
      ratePerHourKg,
      startedAt,
      orderPlannedQtyKg,
      orderProducedQtyKg,
      machinesCovered: 1,
      oeePct: machine.oeePct,
      utilizationPct: machine.utilizationPct,
      note,
    }
  })

  // Back-fill how many machines each operator ended up covering.
  for (const row of rows) {
    row.machinesCovered = load.get(row.operator.id) ?? 1
  }
  return rows
}

export { rateKgPerHourByProcess }
