import type { ID, ISODate } from './common'

export type CottonOrigin = 'Indian ELS' | 'Suvin' | 'Egyptian Giza' | 'US Pima' | 'Australian'

export interface CottonLot {
  id: ID
  lotNumber: string
  origin: CottonOrigin
  supplierId: ID
  supplierLotRef: string
  bales: number
  weightKg: number
  micronaire: number
  staple: number // mm
  strength: number // g/tex
  trashPct: number
  moisturePct: number
  receivedDate: ISODate
  warehouseLocation: string
  status: 'In Testing' | 'Approved' | 'In Use' | 'Consumed' | 'On Hold'
}
