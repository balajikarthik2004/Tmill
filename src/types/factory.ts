import type { ID } from './common'

export type FactoryId = 'all' | 'spinning-1' | 'spinning-2' | 'spinning-3' | 'weaving-1'

export interface Factory {
  id: FactoryId
  name: string
  shortName: string
  type: 'Spinning' | 'Weaving'
  location: string
  installedCapacity: string
  spindlesOrLooms: number
}

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
