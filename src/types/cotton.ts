import type { ID, ISODate } from './common'

/** The three cotton types published on tmills.com. */
export type CottonOrigin = 'Indian extra-long staple' | 'Egyptian Cotton' | 'US Pima'

export interface CottonLot {
  id: ID
  lotNumber: string
  origin: CottonOrigin
  supplierId: ID
  supplierLotRef: string
  bales: number
  weightKg: number
  /** USTER HVI / AFIS PRO-2 readings from the Central Testing Laboratory. */
  micronaire: number
  staple: number
  strength: number
  trashPct: number
  moisturePct: number
  receivedDate: ISODate
  warehouseLocation: string
  status: 'In Testing' | 'Approved' | 'In Use' | 'Consumed' | 'On Hold'
}
