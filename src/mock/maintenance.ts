import type { BreakdownRecord, MaintenanceSummary, PmTask, SparePart } from '@/types'
import { makeRng } from '@/lib/random'
import { machines } from './machines'

const rng = makeRng(909)

export const maintenanceSummary: MaintenanceSummary = {
  breakdowns: 4,
  pmDue: 12,
  criticalMachines: 3,
  lowSpares: 7,
}

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

export const pmTasks: PmTask[] = Array.from({ length: 12 }, (_, i) => {
  const machine = rng.pick(machines)
  return {
    id: `pm-${String(i + 1).padStart(3, '0')}`,
    machineId: machine.id,
    machineCode: machine.code,
    factoryId: machine.factoryId,
    scheduledDate: daysFromNowIso(rng.int(0, 10)),
    frequency: rng.pick(['Weekly', 'Monthly', 'Quarterly']),
    status: rng.pick(['Due', 'Scheduled', 'Overdue']),
    assignedTo: rng.pick(['V. Karthik', 'S. Murugan', 'R. Bala', 'A. Suresh']),
  }
})

const breakdownMachines = machines.filter((m) => m.status === 'Breakdown')
export const breakdowns: BreakdownRecord[] = breakdownMachines.slice(0, 4).map((machine, i) => ({
  id: `bd-${String(i + 1).padStart(3, '0')}`,
  machineId: machine.id,
  machineCode: machine.code,
  factoryId: machine.factoryId,
  startTime: daysAgoIso(rng.int(0, 2)),
  reason: rng.pick(['Spindle bearing failure', 'Motor tripped', 'Belt snapped', 'Sensor fault']),
  status: rng.pick(['Open', 'In Progress']),
}))

export const spareParts: SparePart[] = Array.from({ length: 20 }, (_, i) => {
  const reorderLevel = rng.int(10, 50)
  const currentStock = i < 7 ? rng.int(1, reorderLevel - 1) : rng.int(reorderLevel, reorderLevel * 3)
  return {
    id: `sp-${String(i + 1).padStart(3, '0')}`,
    partCode: `SPR-${1000 + i}`,
    name: rng.pick(['Ring Traveller', 'Spindle Tape', 'Apron', 'Cot & Apron Set', 'Drafting Roller', 'Autoconer Yarn Guide']),
    compatibleMachines: rng.shuffle(machines).slice(0, 3).map((m) => m.code),
    currentStock,
    reorderLevel,
    unit: 'pcs',
    isLow: currentStock < reorderLevel,
  }
})
