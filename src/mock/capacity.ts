/**
 * Capacity standards — the planning constants behind /planning/capacity-planning.
 *
 * Capacity planning needs a *rated* throughput per machine, which no operational
 * record carries. These standards play that role: nameplate kilograms per machine
 * hour, by unit and process, calibrated so that each unit's constraining stage
 * lines up with the daily output published on tmills.com (~25,000 kg of yarn a
 * day across the three spinning mills and the OE / post-spinning unit).
 *
 * Rates differ by unit because each mill spins a different count group — a frame
 * running NE 120s compact delivers far fewer kilograms an hour than the same
 * frame running NE 16s, even at identical spindle speeds.
 */
import type { ProcessName } from '@/types'

/** The mills run three shifts (A / B / C), so the calendar offers 24 h a day. */
export const SHIFTS_PER_DAY = 3
export const HOURS_PER_SHIFT = 8
export const HOURS_PER_DAY = SHIFTS_PER_DAY * HOURS_PER_SHIFT

/**
 * Planned calendar losses, deducted before any order is scheduled. These are
 * *planned* stoppages — distinct from the unplanned losses already priced into
 * each machine's OEE reading.
 */
export const plannedDowntime = {
  /** Weekly preventive-maintenance window, doffing and machine cleaning. */
  maintenanceAllowancePct: 6,
  /** Count changeovers, cotton lot changes, creel refills and roving transfer. */
  changeoverAllowancePct: 4,
} as const

/** Share of the 24-hour calendar that survives planned downtime. */
export const AVAILABILITY_FACTOR =
  1 - (plannedDowntime.maintenanceAllowancePct + plannedDowntime.changeoverAllowancePct) / 100

/**
 * Cushion the planner holds back from free capacity before quoting new work —
 * cover for rework, sample runs and the schedule slipping a shift.
 */
export const PLANNING_BUFFER_PCT = 10

/** Standard time to restore a machine after a breakdown (mean time to repair). */
export const MTTR_HOURS = 14

/** Standard length of a preventive-maintenance slot. */
export const PM_WINDOW_HOURS = 8

/**
 * OEE credited to a machine once it is back from repair. A machine sitting in
 * Breakdown reads 0% OEE, which is true of today but says nothing about what it
 * will deliver for the rest of the horizon — planning it at zero would write a
 * whole unit off over a fault that clears in a shift.
 */
export const RESTORED_OEE_PCT = 82

/**
 * Nameplate output, kilograms per machine hour at 100% OEE.
 * Read down a column to see why the spinning frames are the constraining stage:
 * every upstream process is specified with 8–20% cushion over the frames it feeds.
 */
export const standardRateKgPerHour: Record<string, Partial<Record<ProcessName, number>>> = {
  // Fine counts — NE 60s–140s combed & compact. Lowest kg per frame hour.
  'mill-1': {
    'Blow Room': 415,
    Carding: 99,
    Combing: 129,
    Drawing: 127,
    Roving: 187,
    'Ring Spinning': 58,
  },
  // Medium counts — NE 30s–60s combed.
  'mill-2': {
    'Blow Room': 495,
    Carding: 118,
    Combing: 154,
    Drawing: 151,
    Roving: 223,
    'Ring Spinning': 69,
  },
  // Coarse counts — NE 16s–30s combed & carded. Highest kg per frame hour.
  'mill-3': {
    'Blow Room': 462,
    Carding: 146,
    Combing: 215,
    Drawing: 212,
    Roving: 208,
    'Ring Spinning': 77,
  },
  // OE NE 6s–12s, plus the post-spinning steps that also serve the three mills.
  'oe-unit': {
    'Open End': 63,
    Winding: 165,
    TFO: 58,
    Gassing: 80,
  },
}

/** Used when a machine sits in a unit the rate table does not cover. */
export const fallbackRateKgPerHour: Record<ProcessName, number> = {
  'Blow Room': 430,
  Carding: 110,
  Combing: 150,
  Drawing: 150,
  Roving: 200,
  'Ring Spinning': 65,
  'Open End': 63,
  Winding: 165,
  TFO: 58,
  Gassing: 80,
  Weaving: 95,
}

/** Order-book horizons the planner works to. */
export const capacityHorizons = [7, 14, 30] as const
export type CapacityHorizon = (typeof capacityHorizons)[number]

/**
 * The stages every kilogram from a unit must pass through, in order. Capacity
 * along a route is set by its slowest stage, never by the sum of its stages —
 * the same cotton crosses each one.
 *
 * Winding, TFO doubling and gassing sit *off* this route: they are finishing
 * services applied to the products that call for them, so they are planned
 * against their own stage capacity and their own order load.
 */
export const primaryRouteByFactory: Record<string, ProcessName[]> = {
  'mill-1': ['Blow Room', 'Carding', 'Combing', 'Drawing', 'Roving', 'Ring Spinning'],
  'mill-2': ['Blow Room', 'Carding', 'Combing', 'Drawing', 'Roving', 'Ring Spinning'],
  'mill-3': ['Blow Room', 'Carding', 'Combing', 'Drawing', 'Roving', 'Ring Spinning'],
  'oe-unit': ['Open End'],
}
