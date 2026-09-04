import type { Machine, MachineStatus, ProcessName } from '@/types'
import { makeRng } from '@/lib/random'
import { spinningProcesses } from './factories'

const rng = makeRng(404)

const makesByProcess: Partial<Record<ProcessName, string[]>> = {
  'Blow Room': ['Trutzschler', 'Rieter'],
  Carding: ['Trutzschler TC 15', 'Rieter C 70'],
  Combing: ['Rieter E 90', 'LMW LK69'],
  Drawing: ['Rieter RSB-D 50', 'Trutzschler TD 10'],
  Roving: ['Rieter F 40', 'LMW LF 4280'],
  'Ring Spinning': ['Rieter G 38', 'LMW LR9/6D', 'Toyota RX360'],
  'Open End': ['Rieter R 70', 'Saurer Autocoro 10'],
  Winding: ['Savio Orion', 'Murata No.21C'],
  TFO: ['RPR Two-for-One', 'Murata TFO'],
  Gassing: ['Suzuki Gassing Frame'],
  Weaving: ['Picanol OmniPlus', 'Toyota JAT810', 'Tsudakoma ZAX'],
}

const statusPool: MachineStatus[] = [
  'Running', 'Running', 'Running', 'Running', 'Running', 'Running',
  'Idle', 'Idle',
  'Breakdown',
  'Maintenance',
]

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

let seq = 1
function buildMachinesForFactory(factoryId: Machine['factoryId'], processes: readonly ProcessName[], count: number): Machine[] {
  return Array.from({ length: count }, () => {
    const process = rng.pick(processes)
    const makeOptions = makesByProcess[process] ?? ['Generic OEM']
    const status = rng.pick(statusPool)
    const code = `${process === 'Weaving' ? 'WV' : process.slice(0, 2).toUpperCase()}-${String(seq).padStart(3, '0')}`
    seq += 1
    return {
      id: `mach-${code}`,
      code,
      name: `${process} Frame ${code}`,
      factoryId,
      process,
      make: rng.pick(makeOptions),
      installedYear: rng.int(2008, 2023),
      status,
      oeePct: status === 'Breakdown' ? 0 : rng.float(68, 94, 1),
      utilizationPct: status === 'Breakdown' ? 0 : rng.float(70, 96, 1),
      lastMaintenanceDate: daysAgoIso(rng.int(3, 60)),
      nextPmDueDate: daysFromNowIso(rng.int(-5, 30)),
      isCritical: rng.bool(0.15),
    }
  })
}

export const machines: Machine[] = [
  ...buildMachinesForFactory('spinning-1', spinningProcesses, 11),
  ...buildMachinesForFactory('spinning-2', spinningProcesses, 12),
  ...buildMachinesForFactory('spinning-3', spinningProcesses, 9),
  ...buildMachinesForFactory('weaving-1', ['Weaving'], 8),
]

export const machineById = new Map(machines.map((m) => [m.id, m]))
export const machinesByFactory = (factoryId: string) =>
  factoryId === 'all' ? machines : machines.filter((m) => m.factoryId === factoryId)

// Ensure a well-known breakdown machine used by the demo alert exists.
const rf021 = machines.find((m) => m.process === 'Ring Spinning' && m.factoryId === 'spinning-2')
if (rf021) {
  rf021.code = 'RF-021'
  rf021.id = 'mach-RF-021'
  rf021.name = 'Ring Spinning Frame RF-021'
  rf021.status = 'Breakdown'
  rf021.oeePct = 0
  rf021.utilizationPct = 0
  rf021.isCritical = true
}
