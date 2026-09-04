import type { OrderStage, RiskLevel, SalesOrder } from '@/types'
import { makeRng } from '@/lib/random'
import { customers } from './customers'
import { products } from './products'

const rng = makeRng(505)

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
function daysFromNowIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const ORDER_COUNT = 238 // 118 onSchedule + 17 atRisk + 7 delayed + 96 completed (matches dashboard tiles)

const riskPlan: RiskLevel[] = [
  ...Array(118).fill('onSchedule'),
  ...Array(17).fill('atRisk'),
  ...Array(7).fill('delayed'),
  ...Array(96).fill('completed'),
]

const riskReasons = [
  'Cotton lot delayed by supplier',
  'Machine breakdown on assigned line',
  'Quality rework in progress',
  'Awaiting customer approval sample',
  'Dyeing/finishing backlog',
  'Container booking delayed',
]

const stagesByRisk: Record<RiskLevel, OrderStage[]> = {
  onSchedule: ['Booked', 'Production', 'Quality'],
  atRisk: ['Production', 'Quality', 'Dispatch'],
  delayed: ['Production', 'Quality'],
  completed: ['Completed'],
}

export const salesOrders: SalesOrder[] = Array.from({ length: ORDER_COUNT }, (_, i) => {
  const customer = rng.pick(customers)
  const product = rng.pick(products)
  const risk = riskPlan[i]
  const stage = rng.pick(stagesByRisk[risk])
  const orderDate = daysAgoIso(rng.int(5, 75))
  const dueOffset = risk === 'delayed' ? rng.int(-8, -1) : risk === 'atRisk' ? rng.int(1, 5) : rng.int(3, 30)
  const qty = product.unit === 'kg' ? rng.int(500, 12000) : rng.int(5000, 120000)

  let productionPct = 0
  let qualityPct = 0
  let dispatchPct = 0
  if (stage === 'Production') productionPct = rng.int(20, 85)
  if (stage === 'Quality') {
    productionPct = 100
    qualityPct = rng.int(30, 90)
  }
  if (stage === 'Dispatch') {
    productionPct = 100
    qualityPct = 100
    dispatchPct = rng.int(20, 80)
  }
  if (stage === 'Completed' || risk === 'completed') {
    productionPct = 100
    qualityPct = 100
    dispatchPct = 100
  }

  return {
    id: `so-${String(i + 1).padStart(4, '0')}`,
    orderNo: `SO-${100 + i}`,
    customerId: customer.id,
    customerName: customer.name,
    country: customer.country,
    isExport: customer.segment === 'Export',
    productId: product.id,
    productName: product.name,
    productType: product.type,
    qtyOrdered: qty,
    unit: product.unit,
    orderDate,
    dueDate: daysFromNowIso(dueOffset),
    stage,
    productionPct,
    qualityPct,
    dispatchPct,
    risk,
    riskReason: risk === 'atRisk' || risk === 'delayed' ? rng.pick(riskReasons) : undefined,
    valueInr: Math.round(qty * rng.float(180, 420, 0)),
  }
})

// The dashboard's example alert references SO-291 specifically — pin it to a
// 3-day at-risk state so the alert's drilldown is consistent.
const so291 = salesOrders.find((o) => o.orderNo === 'SO-291')
if (so291) {
  so291.risk = 'atRisk'
  so291.stage = 'Production'
  so291.productionPct = 62
  so291.qualityPct = 0
  so291.dispatchPct = 0
  so291.dueDate = daysFromNowIso(3)
  so291.riskReason = 'Machine breakdown on assigned line'
}

export const salesOrderById = new Map(salesOrders.map((o) => [o.id, o]))

export const orderStatusTiles = {
  onSchedule: 118,
  atRisk: 17,
  delayed: 7,
  completed: 96,
}
