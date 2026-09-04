/**
 * Sales order book. Weighted so roughly 90% of volume is export business across
 * America, Australia, Europe and South Asia — the export profile published on
 * tmills.com. Order numbers, quantities and dates are illustrative.
 */
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

const ORDER_COUNT = 238

const riskPlan: RiskLevel[] = [
  ...Array(118).fill('onSchedule'),
  ...Array(17).fill('atRisk'),
  ...Array(7).fill('delayed'),
  ...Array(96).fill('completed'),
]

const riskReasons = [
  'Cotton lot delayed by supplier',
  'Machine breakdown on assigned frame',
  'Quality rework in progress',
  'Awaiting customer approval sample',
  'Container booking delayed',
  'Doubling capacity constrained at TFO',
]

const stagesByRisk: Record<RiskLevel, OrderStage[]> = {
  onSchedule: ['Booked', 'Production', 'Quality'],
  atRisk: ['Production', 'Quality', 'Dispatch'],
  delayed: ['Production', 'Quality'],
  completed: ['Completed'],
}

const exportCustomers = customers.filter((c) => c.segment === 'Export')
const domesticCustomers = customers.filter((c) => c.segment === 'Domestic')

export const salesOrders: SalesOrder[] = Array.from({ length: ORDER_COUNT }, (_, i) => {
  // ~90% export share, as published.
  const customer = rng.bool(0.9) ? rng.pick(exportCustomers) : rng.pick(domesticCustomers)
  const product = rng.pick(products)
  const risk = riskPlan[i]
  const stage = rng.pick(stagesByRisk[risk])
  const orderDate = daysAgoIso(rng.int(5, 75))
  const dueOffset = risk === 'delayed' ? rng.int(-8, -1) : risk === 'atRisk' ? rng.int(1, 5) : rng.int(3, 30)
  const qty = product.unit === 'kg' ? rng.int(500, 12000) : rng.int(5000, 90000)

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
    region: customer.region,
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

// SO-291 is referenced by the dashboard alert — pin it to a 3-day at-risk state.
const so291 = salesOrders.find((o) => o.orderNo === 'SO-291')
if (so291) {
  so291.risk = 'atRisk'
  so291.stage = 'Production'
  so291.productionPct = 62
  so291.qualityPct = 0
  so291.dispatchPct = 0
  so291.dueDate = daysFromNowIso(3)
  so291.riskReason = 'Machine breakdown on assigned frame'
}

export const salesOrderById = new Map(salesOrders.map((o) => [o.id, o]))

export const orderStatusTiles = {
  onSchedule: salesOrders.filter((o) => o.risk === 'onSchedule').length,
  atRisk: salesOrders.filter((o) => o.risk === 'atRisk').length,
  delayed: salesOrders.filter((o) => o.risk === 'delayed').length,
  completed: salesOrders.filter((o) => o.risk === 'completed').length,
}
