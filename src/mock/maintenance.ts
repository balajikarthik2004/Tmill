/**
 * Maintenance records against the real machine registry (Rieter, Trutzschler,
 * Schlafhorst, Savio, air jet / Sulzer looms). Failure reasons and spare parts
 * correspond to those machine types; individual records are illustrative.
 */
import type { BreakdownRecord, MaintenanceSummary, PmTask, ProcessName, SparePart } from '@/types'
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

/**
 * Failure modes that belong to each process. A weft feeder jam can only happen
 * on a loom and a clearer fault only on an autoconer, so reasons are drawn per
 * process rather than from one flat pool.
 */
const breakdownReasonsByProcess: Record<ProcessName, string[]> = {
  'Blow Room': ['Suction pressure drop', 'Bale opener lattice jam'],
  Carding: ['Suction pressure drop', 'Drive motor tripped', 'Card wire damage'],
  Combing: ['Comber nipper misalignment', 'Lap feed jam'],
  Drawing: ['Drive motor tripped', 'Auto-leveller sensor fault'],
  Roving: ['Drive motor tripped', 'Flyer bearing failure'],
  'Ring Spinning': [
    'Spindle bearing failure',
    'Spindle tape snapped',
    'Drive motor tripped',
    'Suction pressure drop',
  ],
  'Open End': ['Rotor bearing noise', 'Drive motor tripped'],
  Winding: ['Yarn clearer sensor fault', 'Splicer air pressure fault'],
  TFO: ['Spindle belt slip', 'Drive motor tripped'],
  Gassing: ['Gas burner ignition fault', 'Drive motor tripped'],
  Weaving: ['Loom weft feeder jam', 'Warp stop motion fault'],
}

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
  reason: rng.pick(breakdownReasonsByProcess[machine.process]),
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
