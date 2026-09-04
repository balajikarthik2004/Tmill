import type { ProductionBatch } from '@/types'
import {
  buildTraceGraph,
  cottonLotById,
  customerById,
  machineById,
  productionBatches,
  productionOrders,
  salesOrderById,
} from '@/mock'
import { simulateDelay } from './delay'

export async function getProductionBatches() {
  return simulateDelay(productionBatches)
}

/**
 * A production batch with its neighbouring records resolved, so the traceability
 * picker can be searched by batch, customer, order, machine or cotton lot.
 */
export interface TraceableBatch extends ProductionBatch {
  machineCode: string
  cottonLotNumber: string
  cottonOrigin: string
  customerName: string
  salesOrderNo: string
}

export async function getTraceableBatches(): Promise<TraceableBatch[]> {
  const result: TraceableBatch[] = productionBatches.map((batch) => {
    const po = productionOrders.find((p) => p.id === batch.productionOrderId)
    const so = po?.salesOrderId ? salesOrderById.get(po.salesOrderId) : undefined
    const customer = so ? customerById.get(so.customerId) : undefined
    const lot = cottonLotById.get(batch.cottonLotId)
    return {
      ...batch,
      machineCode: machineById.get(batch.machineId)?.code ?? 'Unassigned',
      cottonLotNumber: lot?.lotNumber ?? 'Unassigned',
      cottonOrigin: lot?.origin ?? 'Unassigned',
      customerName: customer?.name ?? 'Stock build',
      salesOrderNo: so?.orderNo ?? 'Stock build',
    }
  })
  return simulateDelay(result)
}

export async function getTraceGraph(batchId: string) {
  return simulateDelay(buildTraceGraph(batchId))
}
