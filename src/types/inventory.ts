import type { ID, ISODate } from './common'
import type { FactoryId } from './factory'

/**
 * Thiagarajar Mills is a spinning company - cotton in, yarn out. There is no
 * weaving, so stock never takes a fabric form.
 */
export type InventoryCategory = 'Raw Cotton' | 'WIP' | 'Finished Yarn'

export interface InventorySummary {
  category: InventoryCategory
  currentQty: number
  unit: 'MT'
  reorderLevel: number
  daysOfStock: number
  belowReorder: boolean
}

/** One category valued at its standard rate. */
export interface InventoryValuationRow {
  category: InventoryCategory
  qty: number
  unit: 'MT'
  /** Standard rate in INR per kg. */
  ratePerUnitInr: number
  rateBasis: string
  valueInr: number
  sharePct: number
  belowReorder: boolean
}

export interface InventoryValuationPoint {
  date: ISODate
  rawCottonInr: number
  wipInr: number
  finishedYarnInr: number
  totalInr: number
}

export interface InventoryValuation {
  rows: InventoryValuationRow[]
  totalInr: number
  /** Same period a month back, for the headline movement. */
  previousTotalInr: number
  changePct: number
  trend: InventoryValuationPoint[]
  /** Working capital tied up per day of cover, a useful executive read. */
  valuePerDayOfCoverInr: number
}

/** Stock held at one unit, for the facility split. */
export interface FacilityStockRow {
  factoryId: string
  factoryName: string
  shortName: string
  /** Tonnes of cotton, WIP and yarn standing at this unit. */
  stockMt: number
  /** Godown capacity in tonnes. */
  capacityMt: number
  utilisationPct: number
  valueInr: number
}

export type StockMovementType =
  | 'GRN'
  | 'Issue'
  | 'Transfer'
  | 'Prod Consumption'
  | 'Prod Receipt'
  | 'Dispatch'
  | 'Adjustment'

export interface StockMovement {
  id: ID
  date: ISODate
  type: StockMovementType
  category: InventoryCategory
  itemName: string
  qty: number
  unit: 'MT' | 'kg' | 'm'
  factoryId: FactoryId
  referenceNo: string
  remarks?: string
}
