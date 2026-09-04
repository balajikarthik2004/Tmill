import type { ID, ISODate } from './common'
import type { FactoryId } from './factory'

export type InventoryCategory = 'Raw Cotton' | 'WIP' | 'Finished Yarn' | 'Fabric'

export interface InventorySummary {
  category: InventoryCategory
  currentQty: number
  unit: 'MT' | 'm'
  reorderLevel: number
  daysOfStock: number
  belowReorder: boolean
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
