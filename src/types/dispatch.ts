import type { ID, ISODate } from './common'

export interface Dispatch {
  id: ID
  dispatchNo: string
  salesOrderId: ID
  salesOrderNo: string
  customerName: string
  dispatchDate: ISODate
  qty: number
  unit: 'kg' | 'm'
  vehicleNo?: string
  containerNo?: string
  status: 'Pending' | 'Dispatched' | 'In Transit' | 'Delivered'
}
