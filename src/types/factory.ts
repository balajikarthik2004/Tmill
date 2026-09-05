import type { ID } from './common'

export type FactoryId = 'all' | 'mill-1' | 'mill-2' | 'mill-3' | 'oe-unit' | 'weaving-unit'

export type FactoryType = 'Spinning' | 'Post-Spinning' | 'Weaving'

export interface Factory {
  id: Exclude<FactoryId, 'all'>
  name: string
  shortName: string
  type: FactoryType
  location: string
  /** Year the unit was commissioned, where the public record states it. */
  commissionedYear?: number
  /** Which yarn count group this mill specialises in (tmills.com). */
  countGroup: string
  installedCapacity: string
  spindles: number
  rotors: number
  looms: number
}

/** Processes backed by machinery published on tmills.com. */
export type ProcessName =
  | 'Blow Room'
  | 'Carding'
  | 'Combing'
  | 'Drawing'
  | 'Roving'
  | 'Ring Spinning'
  | 'Open End'
  | 'Winding'
  | 'TFO'
  | 'Gassing'
  | 'Weaving'

export interface Department {
  id: ID
  name: ProcessName
  factoryId: FactoryId
}

export type Shift = 'A' | 'B' | 'C'
