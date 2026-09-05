import type { ISODate } from './common'
import type { FactoryId } from './factory'

/** Where the electricity comes from. */
export type EnergySource = 'Captive Wind' | 'Solar' | 'Grid (TANGEDCO)' | 'Diesel Genset'

/** Where the electricity goes once it is inside the mill. */
export type EnergyEndUse =
  | 'Ring Spinning'
  | 'Open End'
  | 'Blow Room & Carding'
  | 'Combing, Drawing & Roving'
  | 'Winding & TFO'
  | 'Humidification'
  | 'Compressed Air'
  | 'Lighting & Utilities'

/** Resources metered alongside power. */
export type ResourceKind = 'Electricity' | 'Water' | 'Compressed Air' | 'Diesel'

/**
 * Where water goes. A spinning mill has no dyeing, so there is no process
 * effluent — the load is humidification make-up, machine cooling and the
 * domestic draw of a 1,600-person site.
 */
export type WaterUse =
  | 'Humidification make-up'
  | 'Cooling & compressors'
  | 'Domestic & canteen'
  | 'Cleaning & housekeeping'

/** Where water comes from. Recycled is treated sewage put back to work. */
export type WaterSource =
  | 'Borewell'
  | 'Municipal (TWAD)'
  | 'Rainwater harvested'
  | 'Recycled (STP)'

/**
 * One day, one unit. Carries the operating context — output, count spun and
 * ambient humidity — alongside the meter readings, because energy on its own
 * says nothing: 26,000 kWh is good on a heavy day of coarse counts and poor on
 * a light day of the same.
 */
export interface EnergyDayRecord {
  date: ISODate
  factoryId: Exclude<FactoryId, 'all'>
  /** Yarn produced that day — the denominator for every intensity figure. */
  outputKg: number
  totalKwh: number
  kwhBySource: Record<EnergySource, number>
  kwhByEndUse: Record<EnergyEndUse, number>
  /** Total water applied — fresh intake plus recycled reuse. */
  waterKl: number
  waterKlByUse: Record<WaterUse, number>
  waterKlBySource: Record<WaterSource, number>
  compressedAirNm3: number
  dieselL: number
  powerFactor: number
  /** Ambient relative humidity — what the humidification plant has to fight. */
  ambientRhPct: number
  /** Volume-weighted average yarn count (NE) spun that day. */
  avgCount: number
}
