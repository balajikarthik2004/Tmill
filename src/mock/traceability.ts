import type { ProductionBatch, TraceGraph } from '@/types'
import { makeRng } from '@/lib/random'
import { productionOrders } from './production'
import { machineById } from './machines'
import { cottonLotById, cottonLots } from './cotton'
import { supplierById } from './suppliers'
import { salesOrderById } from './orders'
import { customerById } from './customers'
import { qualityTests } from './quality'

const rng = makeRng(1515)

const completedOrders = productionOrders.filter((p) => p.status === 'Completed').slice(0, 45)

export const productionBatches: ProductionBatch[] = completedOrders.map((po, i) => ({
  id: `batch-${String(i + 1).padStart(4, '0')}`,
  batchNo: `YB-2026-${String(1000 + i)}`,
  productionOrderId: po.id,
  machineId: po.machineId,
  shift: po.shift,
  cottonLotId: rng.pick(cottonLots).id,
  producedDate: po.endDate,
  qtyKg: po.producedQty,
  qualityTestId: rng.bool(0.6) ? rng.pick(qualityTests).id : undefined,
}))

export const productionBatchById = new Map(productionBatches.map((b) => [b.id, b]))

/** Walk the domain graph both directions from a production batch for the traceability page. */
export function buildTraceGraph(batchId: string): TraceGraph | null {
  const batch = productionBatchById.get(batchId)
  if (!batch) return null

  const po = productionOrders.find((p) => p.id === batch.productionOrderId)
  const so = po?.salesOrderId ? salesOrderById.get(po.salesOrderId) : undefined
  const customer = so ? customerById.get(so.customerId) : undefined
  const machine = machineById.get(batch.machineId)
  const cottonLot = cottonLotById.get(batch.cottonLotId)
  const supplier = cottonLot ? supplierById.get(cottonLot.supplierId) : undefined
  const qualityTest = batch.qualityTestId ? qualityTests.find((q) => q.id === batch.qualityTestId) : undefined

  const nodes: TraceGraph['nodes'] = []
  const edges: TraceGraph['edges'] = []

  if (customer) nodes.push({ id: customer.id, type: 'Customer', label: customer.name, sublabel: customer.country, linkTo: `/master/customers/${customer.id}` })
  if (so) {
    nodes.push({ id: so.id, type: 'SalesOrder', label: so.orderNo, sublabel: so.productName, linkTo: `/sales/sales-orders?highlight=${so.id}` })
    if (customer) edges.push({ from: customer.id, to: so.id })
  }
  if (po) {
    nodes.push({ id: po.id, type: 'ProductionOrder', label: po.orderNo, sublabel: po.process, linkTo: `/production` })
    if (so) edges.push({ from: so.id, to: po.id })
  }
  nodes.push({ id: batch.id, type: 'ProductionBatch', label: batch.batchNo, sublabel: `${batch.qtyKg} kg`, linkTo: `/cotton/cotton-testing` })
  if (po) edges.push({ from: po.id, to: batch.id })

  if (machine) {
    nodes.push({ id: machine.id, type: 'Machine', label: machine.code, sublabel: machine.name, linkTo: `/maintenance/machine-dashboard` })
    edges.push({ from: batch.id, to: machine.id })
  }
  if (cottonLot) {
    nodes.push({ id: cottonLot.id, type: 'CottonLot', label: cottonLot.lotNumber, sublabel: cottonLot.origin, linkTo: `/cotton/cotton-lots` })
    edges.push({ from: batch.id, to: cottonLot.id })
  }
  if (supplier) {
    nodes.push({ id: supplier.id, type: 'Supplier', label: supplier.name, sublabel: supplier.country, linkTo: `/master/suppliers` })
    if (cottonLot) edges.push({ from: cottonLot.id, to: supplier.id })
  }
  if (qualityTest) {
    nodes.push({ id: qualityTest.id, type: 'QualityTest', label: qualityTest.testNo, sublabel: qualityTest.result, linkTo: `/quality/lab-tests` })
    edges.push({ from: batch.id, to: qualityTest.id })
  }

  return { rootBatchId: batch.id, nodes, edges }
}
