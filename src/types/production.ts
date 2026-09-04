import type { ID, ISODate } from './common'
import type { FactoryId, ProcessName, Shift } from './factory'
import type { ProductType } from './product'

export type ProductionStatus =
  | 'Planned'
  | 'In Progress'
  | 'Quality Check'
  | 'Completed'
  | 'Rejected'
  | 'On Hold'

export interface ProductionOrder {
  id: ID
  orderNo: string // PO-xxxx (internal production order, distinct from procurement PO)
  salesOrderId?: ID
  salesOrderNo?: string
  factoryId: FactoryId
  process: ProcessName
  productId: string
  productName: string
  productType: ProductType
  plannedQty: number
  producedQty: number
  unit: 'kg' | 'm'
  status: ProductionStatus
  startDate: ISODate
  endDate: ISODate
  machineId: ID
  machineCode: string
  shift: Shift
  cottonLotId?: ID
}

/** A single day/shift production record used to build trend charts and drilldowns. */
export interface ProductionRecord {
  date: ISODate
  factoryId: FactoryId
  process: ProcessName
  machineId: ID
  shift: Shift
  productType: ProductType
  actualKg: number
  targetKg: number
  actualM?: number
  targetM?: number
}

export interface ProductionBatch {
  id: ID
  batchNo: string // e.g. YB-2026-0341
  productionOrderId: ID
  machineId: ID
  shift: Shift
  cottonLotId: ID
  producedDate: ISODate
  qtyKg: number
  qualityTestId?: ID
}
