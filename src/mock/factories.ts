/**
 * Five manufacturing facilities at Kappalur, Madurai — as published on tmills.com:
 * three spinning mills (each specialising in a distinct yarn count group),
 * post-spinning (TFO / gassing / winding) and weaving.
 * Published totals: 86,112 spindles · 480 rotors · 300 looms · ~1,600 employees.
 */
import type { Factory } from '@/types'

export const factories: Factory[] = [
  {
    id: 'mill-1',
    name: 'Spinning Mill I',
    shortName: 'SM-I',
    type: 'Spinning',
    location: 'Kappalur, Madurai',
    countGroup: 'Fine counts — NE 60s–140s combed & compact',
    installedCapacity: '30,240 spindles',
    spindles: 30240,
    rotors: 0,
    looms: 0,
  },
  {
    id: 'mill-2',
    name: 'Spinning Mill II',
    shortName: 'SM-II',
    type: 'Spinning',
    location: 'Kappalur, Madurai',
    countGroup: 'Medium counts — NE 30s–60s combed',
    installedCapacity: '31,872 spindles',
    spindles: 31872,
    rotors: 0,
    looms: 0,
  },
  {
    id: 'mill-3',
    name: 'Spinning Mill III',
    shortName: 'SM-III',
    type: 'Spinning',
    location: 'Kappalur, Madurai',
    countGroup: 'Coarse counts — NE 16s–30s combed & carded',
    installedCapacity: '24,000 spindles',
    spindles: 24000,
    rotors: 0,
    looms: 0,
  },
  {
    id: 'oe-unit',
    name: 'Open End & Post-Spinning Unit',
    shortName: 'OE-PS',
    type: 'Post-Spinning',
    location: 'Kappalur, Madurai',
    countGroup: 'OE NE 6s–12s · TFO doubling · gassing · winding',
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
