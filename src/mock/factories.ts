/**
 * The manufacturing base, per the public record.
 *
 * tmills.com states three spinning mills, each dedicated to one of three count
 * groups (fine combed, hosiery, coarse combed). Trade press reporting puts the
 * group at roughly 110,000 spindles producing about 26 tonnes a day, with the
 * corporate office and one unit at Kappalur (Madurai) and the other two units,
 * commissioned in 1992 and 2007, at Nilakottai. Two-for-one twisting and
 * gassing are named as core capabilities, so post-spinning is modelled as its
 * own unit serving all three mills.
 *
 * Spindle splits between the three mills are apportioned to the published
 * total; the company does not publish a per-unit breakdown.
 */
import type { Factory } from '@/types'

export const factories: Factory[] = [
  {
    id: 'mill-1',
    name: 'Spinning Mill I — Kappalur',
    shortName: 'SM-I',
    type: 'Spinning',
    location: 'Kappalur, Madurai',
    commissionedYear: 1936,
    countGroup: 'Fine counts — NE 60s–140s combed & compact',
    installedCapacity: '30,240 spindles',
    spindles: 30240,
    rotors: 0,
    looms: 0,
  },
  {
    id: 'mill-2',
    name: 'Spinning Mill II — Nilakottai',
    shortName: 'SM-II',
    type: 'Spinning',
    location: 'Nilakottai, Dindigul',
    commissionedYear: 1992,
    countGroup: 'Hosiery counts — NE 30s–60s combed',
    installedCapacity: '42,000 spindles',
    spindles: 42000,
    rotors: 0,
    looms: 0,
  },
  {
    id: 'mill-3',
    name: 'Spinning Mill III — Nilakottai',
    shortName: 'SM-III',
    type: 'Spinning',
    location: 'Nilakottai, Dindigul',
    commissionedYear: 2007,
    countGroup: 'Coarse counts — NE 16s–30s combed & carded',
    installedCapacity: '37,760 spindles',
    spindles: 37760,
    rotors: 0,
    looms: 0,
  },
  {
    id: 'oe-unit',
    name: 'Open End & Post-Spinning Unit',
    shortName: 'OE-PS',
    type: 'Post-Spinning',
    location: 'Kappalur, Madurai',
    commissionedYear: 1998,
    countGroup: 'OE NE 6s–10s · TFO doubling · gassing · winding',
    installedCapacity: '480 rotors',
    spindles: 0,
    rotors: 480,
    looms: 0,
  }
]

export const factoryById = new Map(factories.map((f) => [f.id, f]))

/** Processes actually referenced by the published machinery list. */
export const spinningProcesses = [
  'Blow Room',
  'Carding',
  'Combing',
  'Drawing',
  'Roving',
  'Ring Spinning',
] as const

export const postSpinningProcesses = ['Open End', 'Winding', 'TFO', 'Gassing'] as const

export const processesByFactory: Record<string, readonly string[]> = {
  'mill-1': spinningProcesses,
  'mill-2': spinningProcesses,
  'mill-3': spinningProcesses,
  'oe-unit': postSpinningProcesses,
}
