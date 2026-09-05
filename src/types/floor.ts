/**
 * Shop-floor board types.
 *
 * The board is a live view of the plant: every machine in the registry, the
 * operator standing at it on the current shift, the job it is running, and how
 * far through that job it is. Progress is derived from a start time and a rate
 * rather than stored as a number, so it advances on its own while the board is
 * open.
 */
import type { ID, ISODate } from './common'
import type { FactoryId, ProcessName, Shift } from './factory'
import type { MachineStatus } from './machine'

export type OperatorRole =
  | 'Shift Supervisor'
  | 'Ring Frame Tenter'
  | 'Doffer'
  | 'Card Tenter'
  | 'Comber Tenter'
  | 'Draw Frame Tenter'
  | 'Speed Frame Tenter'
  | 'Autoconer Operator'
  | 'OE Operator'
  | 'TFO Operator'
  | 'Gassing Operator'
  | 'Blow Room Attendant'
  | 'Maintenance Fitter'

export interface Operator {
  id: ID
  employeeCode: string
  name: string
  initials: string
  role: OperatorRole
  shift: Shift
  factoryId: Exclude<FactoryId, 'all'>
  /** Processes this operator is signed off to run. */
  certifiedProcesses: ProcessName[]
  yearsService: number
}

/** What the person at the machine is actually doing right now. */
export type FloorTask =
  | 'Running production'
  | 'Doffing'
  | 'Count changeover'
  | 'Cleaning & lubrication'
  | 'Breakdown repair'
  | 'Preventive maintenance'
  | 'Quality check'
  | 'Awaiting material'

/**
 * One step of the mission running on a machine. Stages are ordered and carry an
 * expected duration, so the stage the machine is *currently* in is derived from
 * elapsed time rather than stored.
 */
export interface MissionStage {
  name: string
  detail: string
  expectedHrs: number
}

export interface FloorAssignment {
  id: ID
  machineId: ID
  machineCode: string
  machineName: string
  make: string
  process: ProcessName
  factoryId: Exclude<FactoryId, 'all'>
  status: MachineStatus

  operator: Operator
  /** Second pair of hands on the machine, where the task needs one. */
  support?: { id: ID; name: string; role: string }

  task: FloorTask
  taskDetail: string
  /** The ordered stages this kind of mission runs through. */
  missionStages: MissionStage[]

  /** The job on the machine, when it is running one. */
  productionOrderNo?: string
  salesOrderNo?: string
  productName?: string
  customerName?: string

  /** What this machine is expected to deliver on this shift. */
  shiftTargetKg: number
  /** Quantity already banked on this shift before now. */
  baseQtyKg: number
  /** Output per hour, used to advance progress from `startedAt`. */
  ratePerHourKg: number
  startedAt: ISODate

  /** Order-level context, for the detail view rather than the shift bar. */
  orderPlannedQtyKg?: number
  orderProducedQtyKg?: number

  /** How many machines this operator is covering on the shift. */
  machinesCovered: number

  oeePct: number
  utilizationPct: number
  spindles?: number
  note?: string
}

export interface FloorUnitBoard {
  factoryId: Exclude<FactoryId, 'all'>
  factoryName: string
  shortName: string
  countGroup: string
  assignments: FloorAssignment[]
  running: number
  idle: number
  breakdown: number
  maintenance: number
  operatorsOnShift: number
}

export interface FloorSummary {
  shift: Shift
  shiftStartsAt: ISODate
  shiftEndsAt: ISODate
  machines: number
  running: number
  idle: number
  breakdown: number
  maintenance: number
  operatorsOnShift: number
  avgOeePct: number
  jobsInProgress: number
}

export interface FloorBoard {
  summary: FloorSummary
  units: FloorUnitBoard[]
}
