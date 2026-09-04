import type { ID, ISODate } from './common'

export type QualityStage = 'Cotton' | 'Yarn' | 'Fabric'

/** Instruments in the Central Testing Laboratory, as published on tmills.com. */
export type LabInstrument =
  | 'USTER UT5'
  | 'USTER UTR4'
  | 'USTER UTJ4'
  | 'USTER CMT5'
  | 'USTER Tensojet'
  | 'USTER Eva Tester'
  | 'USTER Strength Tester'
  | 'Zweigle Hairiness'
  | 'TPI Tester'
  | 'CSP Tester'
  | 'USTER HVI'
  | 'USTER AFIS PRO-2'
  | 'Trash Separator'

export const yarnInstruments: LabInstrument[] = [
  'USTER UT5',
  'USTER UTR4',
  'USTER UTJ4',
  'USTER CMT5',
  'USTER Tensojet',
  'USTER Eva Tester',
  'USTER Strength Tester',
  'Zweigle Hairiness',
  'TPI Tester',
  'CSP Tester',
]

export const cottonInstruments: LabInstrument[] = ['USTER HVI', 'USTER AFIS PRO-2', 'Trash Separator']

export interface QualityParameters {
  count?: string
  /** Tenacity, g/tex — USTER Tensojet / Strength Tester */
  strength?: number
  /** Count Strength Product — CSP Tester */
  csp?: number
  /** Unevenness U% — USTER UT5 */
  uster?: number
  /** Hairiness index — Zweigle */
  hairiness?: number
  /** Twists per inch — TPI Tester */
  tpi?: number
  /** Imperfections per 1000 m (thin/thick/neps) */
  imperfections?: number
  /** HVI micronaire (cotton) */
  micronaire?: number
  /** HVI staple length, mm (cotton) */
  staple?: number
  /** AFIS neps per gram (cotton) */
  nepsPerGram?: number
  trashPct?: number
  moisturePct?: number
}

export interface QualityTest {
  id: ID
  testNo: string
  stage: QualityStage
  instrument: LabInstrument
  batchId?: ID
  cottonLotId?: ID
  machineId?: ID
  productId?: string
  testedDate: ISODate
  parameters: QualityParameters
  result: 'Pass' | 'Fail' | 'Rework'
  remarks?: string
  testedBy: string
}

export interface Rejection {
  id: ID
  date: ISODate
  stage: QualityStage
  productionOrderId?: ID
  reason: string
  qtyKg: number
  factoryId: string
}

export interface CustomerComplaint {
  id: ID
  complaintNo: string
  customerId: ID
  customerName: string
  salesOrderId?: ID
  date: ISODate
  category: string
  description: string
  status: 'Open' | 'Investigating' | 'Resolved' | 'Closed'
}
