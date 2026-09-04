import type { ID, ISODate } from './common'

export type QualityStage = 'Cotton' | 'Yarn' | 'Fabric'

export interface QualityParameters {
  count?: string
  strength?: number // g/tex (Tenacity)
  csp?: number // Count Strength Product
  uster?: number // U% (evenness)
  hairiness?: number // H value
  tpi?: number // twists per inch
  evenness?: number // %
  imperfections?: number // per 1000m (IPI)
  moisturePct?: number
}

export interface QualityTest {
  id: ID
  testNo: string
  stage: QualityStage
  batchId?: ID
  cottonLotId?: ID
  machineId?: ID
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
