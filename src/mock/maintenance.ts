/**
 * Maintenance records against the real machine registry (Rieter, Trutzschler,
 * Schlafhorst, Savio, air jet / Sulzer looms). Failure reasons and spare parts
 * correspond to those machine types; individual records are illustrative.
 */
import type { BreakdownRecord, MaintenanceSummary, PmTask, SparePart } from '@/types'
import { makeRng } from '@/lib/random'
import { machines } from './machines'

const rng = makeRng(909)

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
function daysFromNowIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const breakdownReasons = [
  'Spindle bearing failure',
  'Drive motor tripped',
  'Spindle tape snapped',
  'Yarn clearer sensor fault',
  'Suction pressure drop',
  'Loom weft feeder jam',
  'Comber nipper misalignment',
]

const pmMachines = rng.shuffle(machines).slice(0, 14)

export const pmTasks: PmTask[] = pmMachines.map((machine, i) => ({
  id: `pm-${String(i + 1).padStart(3, '0')}`,
  machineId: machine.id,
  machineCode: machine.code,
  factoryId: machine.factoryId,
  scheduledDate: daysFromNowIso(rng.int(-3, 14)),
  frequency: rng.pick(['Weekly', 'Monthly', 'Quarterly']),
  status: rng.pick(['Due', 'Scheduled', 'Overdue', 'Completed']),
  assignedTo: rng.pick(['V. Karthik', 'S. Murugan', 'R. Bala', 'A. Suresh']),
}))

const breakdownMachines = machines.filter((m) => m.status === 'Breakdown')

export const breakdowns: BreakdownRecord[] = breakdownMachines.map((machine, i) => ({
  id: `bd-${String(i + 1).padStart(3, '0')}`,
  machineId: machine.id,
  machineCode: machine.code,
  factoryId: machine.factoryId,
  startTime: daysAgoIso(rng.int(0, 3)),
  reason: rng.pick(breakdownReasons),
  status: rng.pick(['Open', 'In Progress']),
}))

const spareNames = [
  'Ring Traveller',
  'Spindle Tape',
  'Cot & Apron Set',
  'Drafting Roller',
  'FR 900 Clearer Module',
  'Comber Nipper Assembly',
  'Autoconer Splicer Kit',
  'Loom Weft Feeder',
  'Rotor Bearing (OE)',
  'TFO Spindle Belt',
]

export const spareParts: SparePart[] = spareNames.map((name, i) => {
  const reorderLevel = rng.int(10, 50)
  const currentStock = i < 7 ? rng.int(1, reorderLevel - 1) : rng.int(reorderLevel, reorderLevel * 3)
  return {
    id: `sp-${String(i + 1).padStart(3, '0')}`,
    partCode: `SPR-${1000 + i}`,
    name,
    compatibleMachines: rng.shuffle(machines).slice(0, 3).map((m) => m.code),
    currentStock,
    reorderLevel,
    unit: 'pcs',
    isLow: currentStock < reorderLevel,
  }
})

export const maintenanceSummary: MaintenanceSummary = {
  breakdowns: breakdowns.length,
  pmDue: pmTasks.filter((t) => t.status === 'Due' || t.status === 'Overdue').length,
  criticalMachines: machines.filter((m) => m.isCritical).length,
  lowSpares: spareParts.filter((s) => s.isLow).length,
}
