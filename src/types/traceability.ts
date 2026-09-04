import type { ID } from './common'

/**
 * A single node in the traceability graph:
 * Customer -> SalesOrder -> ProductionOrder -> ProductionBatch -> Machine -> CottonLot -> Supplier
 * QualityTest and FinishedGoods/Dispatch attach to ProductionBatch as leaves.
 */
export type TraceNodeType =
  | 'Customer'
  | 'SalesOrder'
  | 'ProductionOrder'
  | 'ProductionBatch'
  | 'Machine'
  | 'CottonLot'
  | 'Supplier'
  | 'QualityTest'
  | 'FinishedGoods'
  | 'Dispatch'

export interface TraceNode {
  id: ID
  type: TraceNodeType
  label: string
  sublabel?: string
  linkTo: string
}

export interface TraceEdge {
  from: ID
  to: ID
}

export interface TraceGraph {
  rootBatchId: ID
  nodes: TraceNode[]
  edges: TraceEdge[]
}
