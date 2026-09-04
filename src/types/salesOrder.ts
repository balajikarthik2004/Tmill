import type { ID, ISODate, RiskLevel } from './common'
import type { ProductType } from './product'

export type OrderStage = 'Booked' | 'Production' | 'Quality' | 'Dispatch' | 'Completed'

export interface SalesOrder {
  id: ID
  orderNo: string // SO-291
  customerId: ID
  customerName: string
  country: string
  isExport: boolean
  productId: string
  productName: string
  productType: ProductType
  qtyOrdered: number
  unit: 'kg' | 'm'
  orderDate: ISODate
  dueDate: ISODate
  stage: OrderStage
  productionPct: number
  qualityPct: number
  dispatchPct: number
  risk: RiskLevel
  riskReason?: string
  valueInr: number
}
