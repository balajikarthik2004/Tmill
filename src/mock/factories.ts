/**
 * Prototype — demo data only, not actual T-Mills operational figures.
 * Four factories at the Kappalur, Madurai campus.
 */
import type { Factory } from '@/types'

export const factories: Factory[] = [
  {
    id: 'spinning-1',
    name: 'Spinning Unit 1',
    shortName: 'SU-1',
    type: 'Spinning',
    location: 'Kappalur, Madurai',
    installedCapacity: '38,400 spindles',
    spindlesOrLooms: 38400,
  },
  {
    id: 'spinning-2',
    name: 'Spinning Unit 2',
    shortName: 'SU-2',
    type: 'Spinning',
    location: 'Kappalur, Madurai',
    installedCapacity: '42,000 spindles',
    spindlesOrLooms: 42000,
  },
  {
    id: 'spinning-3',
    name: 'Spinning Unit 3',
    shortName: 'SU-3',
    type: 'Spinning',
    location: 'Kappalur, Madurai',
    installedCapacity: '35,200 spindles',
    spindlesOrLooms: 35200,
  },
  {
    id: 'weaving-1',
    name: 'Weaving Unit',
    shortName: 'WU-1',
    type: 'Weaving',
    location: 'Kappalur, Madurai',
    installedCapacity: '312 looms',
    spindlesOrLooms: 312,
  },
]

export const factoryById = new Map(factories.map((f) => [f.id, f]))

export const spinningProcesses = [
  'Blow Room',
  'Carding',
  'Combing',
  'Drawing',
  'Roving',
  'Ring Spinning',
  'Open End',
  'Winding',
  'TFO',
  'Gassing',
] as const

export const weavingProcesses = ['Weaving'] as const
