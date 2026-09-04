import type { ID, ISODate } from './common'

export type PrStatus = 'Draft' | 'Submitted' | 'Approved' | 'Converted' | 'Rejected'
export type PoStatus = 'Open' | 'Partially Received' | 'Received' | 'Closed' | 'Cancelled'
export type GrnStatus = 'Pending QC' | 'Accepted' | 'Partially Accepted' | 'Rejected'

export interface PurchaseRequisition {
  id: ID
  prNo: string
  raisedDate: ISODate
  requiredBy: ISODate
  itemName: string
  category: 'Cotton' | 'Spares' | 'Packing Material' | 'Consumables'
  qty: number
  unit: string
  factoryId: string
  raisedBy: string
  status: PrStatus
}

export interface PurchaseOrder {
  id: ID
  poNo: string
  prId?: ID
  supplierId: ID
  supplierName: string
  orderDate: ISODate
  expectedDate: ISODate
  itemName: string
  category: 'Cotton' | 'Spares' | 'Packing Material' | 'Consumables'
  qty: number
  receivedQty: number
  unit: string
  ratePerUnit: number
  valueInr: number
  status: PoStatus
}

export interface Grn {
  id: ID
  grnNo: string
  poId: ID
  poNo: string
  supplierId: ID
  supplierName: string
  receivedDate: ISODate
  itemName: string
  qtyReceived: number
  qtyAccepted: number
  unit: string
  cottonLotId?: ID
  status: GrnStatus
  inspectedBy: string
}
