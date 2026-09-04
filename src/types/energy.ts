import type { ISODate } from './common'
import type { FactoryId } from './factory'

export interface EnergySummary {
  totalKwh: number
  renewablePct: number
  gridPct: number
  kwhPerKg: number
  targetKwhPerKg: number
}

export interface EnergyRecord {
  date: ISODate
  factoryId: FactoryId
  totalKwh: number
  renewableKwh: number
  gridKwh: number
  kwhPerKg: number
}
