/**
 * Machine registry. Every make/model below is drawn from the machinery published
 * on tmills.com (infrastructure, products and quality pages). Machine codes,
 * statuses and OEE readings are illustrative operational values.
 */
import type { Machine, MachineStatus, ProcessName } from '@/types'
import { makeRng } from '@/lib/random'
import { factories, processesByFactory } from './factories'

const rng = makeRng(404)

/** Published machinery, by process. */
export const machineryByProcess: Record<ProcessName, string[]> = {
  'Blow Room': ['Blendomat Bale Opener'],
  Carding: ['Trutzschler Card'],
  Combing: ['Rieter Hi-Speed Comber'],
  Drawing: ['Draw Frame with Auto Leveller'],
  Roving: ['Speed Frame'],
  'Ring Spinning': ['Rieter ComforSpin K44', 'Rieter Ring Frame'],
  'Open End': ['OE-Schlafhorst Autocoro'],
  Winding: ['Schlafhorst Autoconer (FR 900 clearer)', 'Savio Autoconer (FR 900 clearer)', 'Soft Package Winder UFLE', 'Autoconer Oerlikon'],
  TFO: ['Two-For-One Twister'],
  Gassing: ['Gassing / Singeing Frame'],
  Weaving: ['Air Jet Loom', 'Sulzer Loom'],
}

const processCodes: Record<ProcessName, string> = {
  'Blow Room': 'BR',
  Carding: 'CD',
  Combing: 'CB',
  Drawing: 'DF',
  Roving: 'SF',
  'Ring Spinning': 'RF',
  'Open End': 'OE',
  Winding: 'AW',
  TFO: 'TF',
  Gassing: 'GS',
  Weaving: 'LM',
}

const statusPool: MachineStatus[] = [
  'Running', 'Running', 'Running', 'Running', 'Running', 'Running', 'Running',
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

/** How many machines of each process sit in each unit. */
const machineCounts: Record<string, Partial<Record<ProcessName, number>>> = {
  'mill-1': { 'Blow Room': 1, Carding: 4, Combing: 3, Drawing: 3, Roving: 2, 'Ring Spinning': 6 },
  'mill-2': { 'Blow Room': 1, Carding: 4, Combing: 3, Drawing: 3, Roving: 2, 'Ring Spinning': 6 },
  'mill-3': { 'Blow Room': 1, Carding: 3, Combing: 2, Drawing: 2, Roving: 2, 'Ring Spinning': 5 },
  'oe-unit': { 'Open End': 4, Winding: 5, TFO: 3, Gassing: 2 },
}

const counters: Partial<Record<ProcessName, number>> = {}

export const machines: Machine[] = factories.flatMap((factory) => {
  const counts = machineCounts[factory.id] ?? {}
  return (processesByFactory[factory.id] as ProcessName[]).flatMap((process) => {
    const count = counts[process] ?? 0
    return Array.from({ length: count }, () => {
      const seq = (counters[process] = (counters[process] ?? 0) + 1)
      const code = `${processCodes[process]}-${String(seq).padStart(3, '0')}`
      const status = rng.pick(statusPool)
      return {
        id: `mach-${code}`,
        code,
        name: `${process} — ${code}`,
        factoryId: factory.id,
        process,
        make: rng.pick(machineryByProcess[process]),
        installedYear: rng.int(2008, 2023),
        status,
        oeePct: status === 'Breakdown' ? 0 : rng.float(72, 94, 1),
        utilizationPct: status === 'Breakdown' ? 0 : rng.float(74, 96, 1),
        lastMaintenanceDate: daysAgoIso(rng.int(3, 60)),
        nextPmDueDate: daysFromNowIso(rng.int(-5, 30)),
        isCritical: rng.bool(0.15),
      }
    })
  })
})

/**
 * Normalise the fleet so the status spread stays realistic for a 75-machine
 * plant regardless of how the seeded draw fell — a handful of breakdowns and
 * machines under preventive work at any given time.
 */
function ensureStatusCount(status: MachineStatus, target: number) {
  const current = machines.filter((m) => m.status === status)
  if (current.length >= target) return
  const spare = machines.filter((m) => m.status === 'Running' || m.status === 'Idle')
  for (const machine of spare.slice(0, target - current.length)) {
    machine.status = status
    if (status === 'Breakdown') {
      machine.oeePct = 0
      machine.utilizationPct = 0
    }
  }
}

ensureStatusCount('Breakdown', 4)
ensureStatusCount('Maintenance', 6)

export const machineById = new Map(machines.map((m) => [m.id, m]))

export function machinesByFactory(factoryId: string) {
  return factoryId === 'all' ? machines : machines.filter((m) => m.factoryId === factoryId)
}

export function machinesByProcess(process: ProcessName) {
  return machines.filter((m) => m.process === process)
}
