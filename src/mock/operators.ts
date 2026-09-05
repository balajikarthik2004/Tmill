/**
 * Shop-floor operator roster.
 *
 * Roughly 1,600 people work at Kappalur across three shifts; this is the
 * machine-facing slice of that — the tenters, doffers, operators and shift
 * supervisors who appear on the floor board. Roles follow the machinery
 * published on tmills.com, so a Comber Tenter only ever appears in a spinning
 * mill and an OE Operator only in the post-spinning unit.
 *
 * Names and employee codes are illustrative demo data.
 */
import type { Operator, OperatorRole, ProcessName, Shift } from '@/types'
import { makeRng } from '@/lib/random'
import { factories, processesByFactory } from './factories'
import { machines } from './machines'

const rng = makeRng(6120)

const shifts: Shift[] = ['A', 'B', 'C']

const givenNames = [
  'M. Selvakumar', 'K. Pandiyan', 'R. Vetrivel', 'S. Anbarasan', 'T. Muthupandi',
  'P. Kalaiselvi', 'A. Jeyanthi', 'V. Ramesh', 'N. Sathishkumar', 'G. Perumal',
  'S. Meenakshi', 'D. Arunkumar', 'R. Lakshmi', 'K. Thangaraj', 'M. Sivakami',
  'P. Chandran', 'S. Vijayalakshmi', 'A. Manoharan', 'R. Kavitha', 'T. Sundaram',
  'V. Nagarajan', 'K. Poornima', 'S. Dhanasekaran', 'M. Revathi', 'P. Ganesan',
  'R. Amudha', 'N. Balamurugan', 'S. Vasuki', 'K. Elangovan', 'A. Priyadarshini',
  'M. Rajendran', 'T. Saroja', 'V. Kumaravel', 'S. Indhumathi', 'P. Marimuthu',
  'R. Nithya', 'K. Ashokkumar', 'D. Bhuvaneswari', 'S. Palanisamy', 'M. Gowri',
  'A. Senthilnathan', 'V. Kalaimani', 'R. Prabhakaran', 'S. Umadevi', 'K. Mohanraj',
  'T. Vennila', 'P. Arivazhagan', 'N. Shanthi', 'M. Ravichandran', 'S. Deepalakshmi',
  'K. Sivaprakasam', 'R. Malathi', 'V. Karuppasamy', 'A. Jothimani', 'S. Balaji',
  'P. Rekha', 'M. Chinnadurai', 'T. Yasodha', 'K. Velmurugan', 'S. Anitha',
  'R. Subramani', 'V. Kanimozhi', 'N. Ilanchezhian', 'M. Punitha', 'P. Sakthivel',
  'S. Nirmala', 'K. Dhandapani', 'A. Vijayakumari', 'R. Ezhilarasan', 'T. Chitra',
  'M. Alagarsamy', 'S. Bhavani'
]

/** Which floor role runs which process. */
const roleByProcess: Record<ProcessName, OperatorRole> = {
  'Blow Room': 'Blow Room Attendant',
  Carding: 'Card Tenter',
  Combing: 'Comber Tenter',
  Drawing: 'Draw Frame Tenter',
  Roving: 'Speed Frame Tenter',
  'Ring Spinning': 'Ring Frame Tenter',
  'Open End': 'OE Operator',
  Winding: 'Autoconer Operator',
  TFO: 'TFO Operator',
  Gassing: 'Gassing Operator',
  Weaving: 'Ring Frame Tenter',
}

function initialsOf(name: string) {
  const parts = name.replace(/\./g, '').split(' ').filter(Boolean)
  return (parts[0][0] + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

let nameCursor = 0
function nextName() {
  const name = givenNames[nameCursor % givenNames.length]
  nameCursor += 1
  return name
}

let seq = 0

function makeOperator(
  factoryId: Operator['factoryId'],
  shift: Shift,
  role: OperatorRole,
  certifiedProcesses: ProcessName[],
): Operator {
  seq += 1
  const name = nextName()
  return {
    id: `op-${String(seq).padStart(3, '0')}`,
    employeeCode: `TM-${4000 + seq}`,
    name,
    initials: initialsOf(name),
    role,
    shift,
    factoryId,
    certifiedProcesses,
    yearsService: rng.int(2, 28),
  }
}

const roster: Operator[] = []

/**
 * Manning follows the installed machinery: a tenter covers about two frames, so
 * the roster is sized from the real machine count per process rather than a
 * flat two-per-process. Without this, one person ends up shown against five
 * ring frames at once.
 */
function tentersNeeded(factoryId: string, process: ProcessName) {
  const count = machines.filter((m) => m.factoryId === factoryId && m.process === process).length
  return Math.max(1, Math.ceil(count / 2))
}

for (const factory of factories) {
  const processes = (processesByFactory[factory.id] ?? []) as ProcessName[]
  for (const shift of shifts) {
    // One supervisor per unit per shift, certified across the whole route.
    roster.push(makeOperator(factory.id, shift, 'Shift Supervisor', processes))

    for (const process of processes) {
      const needed = tentersNeeded(factory.id, process)
      for (let i = 0; i < needed; i += 1) {
        roster.push(makeOperator(factory.id, shift, roleByProcess[process], [process]))
      }
    }

    // Doffers and a fitter float across the whole route.
    roster.push(makeOperator(factory.id, shift, 'Doffer', processes))
    roster.push(makeOperator(factory.id, shift, 'Doffer', processes))
    roster.push(makeOperator(factory.id, shift, 'Maintenance Fitter', processes))
  }
}

export const operators: Operator[] = roster

export const operatorById = new Map(operators.map((o) => [o.id, o]))

/** The shift a given clock time falls in: A 06:00–14:00, B 14:00–22:00, C 22:00–06:00. */
export function shiftForHour(hour: number): Shift {
  if (hour >= 6 && hour < 14) return 'A'
  if (hour >= 14 && hour < 22) return 'B'
  return 'C'
}

export function operatorsOnShift(shift: Shift, factoryId?: string) {
  return operators.filter(
    (o) => o.shift === shift && (!factoryId || factoryId === 'all' || o.factoryId === factoryId),
  )
}
