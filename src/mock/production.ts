import type { FactoryId, ProcessName, ProductionOrder, ProductionRecord, ProductType, Shift } from '@/types'
import { makeRng } from '@/lib/random'
import { factories, spinningProcesses } from './factories'
import { machines, machinesByFactory } from './machines'
import { salesOrders } from './orders'

const rng = makeRng(606)
const HISTORY_DAYS = 30

const shifts: Shift[] = ['A', 'B', 'C']

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(6, 0, 0, 0)
  return d.toISOString()
}

// Baseline daily targets per factory (kg for spinning, m for weaving), tuned so that
// the trailing-30-days total lands close to the headline dashboard KPIs.
const dailyTargetKg: Record<Exclude<FactoryId, 'all'>, number> = {
  'spinning-1': 9800,
  'spinning-2': 10800,
  'spinning-3': 8200,
  'weaving-1': 0,
}
const dailyTargetM = 66800 // weaving-1 only — matches the headline Fabric Production KPI

const productTypesByFactory: Record<Exclude<FactoryId, 'all'>, ProductType[]> = {
  'spinning-1': ['Ring Spun', 'Specialty'],
  'spinning-2': ['Ring Spun', 'Open End', 'Doubled'],
  'spinning-3': ['Open End', 'Doubled'],
  'weaving-1': ['Fabric'],
}

export const productionRecords: ProductionRecord[] = []

for (let dayOffset = HISTORY_DAYS - 1; dayOffset >= 0; dayOffset--) {
  const date = isoDaysAgo(dayOffset)
  const dow = new Date(date).getDay()
  const weekendFactor = dow === 0 ? 0.55 : dow === 6 ? 0.82 : 1
  ;(Object.keys(dailyTargetKg) as Exclude<FactoryId, 'all'>[]).forEach((factoryId) => {
    const types = productTypesByFactory[factoryId]
    const isWeaving = factoryId === 'weaving-1'
    const target = isWeaving ? dailyTargetM : dailyTargetKg[factoryId]
    const perTypeTarget = target / types.length
    types.forEach((productType) => {
      const noise = rng.float(0.88, 1.08, 3)
      const actual = Math.round(perTypeTarget * weekendFactor * noise)
      const factoryMachines = machinesByFactory(factoryId)
      const machine = rng.pick(factoryMachines.length ? factoryMachines : machines)
      const process: ProcessName = isWeaving ? 'Weaving' : rng.pick(spinningProcesses)
      productionRecords.push({
        date,
        factoryId,
        process,
        machineId: machine.id,
        shift: rng.pick(shifts),
        productType,
        actualKg: isWeaving ? 0 : actual,
        targetKg: isWeaving ? 0 : Math.round(perTypeTarget),
        actualM: isWeaving ? actual : undefined,
        targetM: isWeaving ? Math.round(perTypeTarget) : undefined,
      })
    })
  })
}

export function totalsForRange(records: ProductionRecord[]) {
  return records.reduce(
    (acc, r) => {
      acc.actualKg += r.actualKg
      acc.targetKg += r.targetKg
      acc.actualM += r.actualM ?? 0
      acc.targetM += r.targetM ?? 0
      return acc
    },
    { actualKg: 0, targetKg: 0, actualM: 0, targetM: 0 },
  )
}

// ---- Production orders (~150) -----------------------------------------

const statuses: ProductionOrder['status'][] = [
  'Planned', 'In Progress', 'In Progress', 'Quality Check', 'Completed', 'Completed', 'Completed', 'On Hold', 'Rejected',
]

function isoDaysAgoFrom(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
function isoDaysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const linkedSalesOrders = rng.shuffle(salesOrders).slice(0, 150)

export const productionOrders: ProductionOrder[] = linkedSalesOrders.map((so, i) => {
  const factory = rng.pick(factories)
  const isWeaving = factory.type === 'Weaving'
  const process: ProcessName = isWeaving ? 'Weaving' : rng.pick(spinningProcesses)
  const factoryMachines = machinesByFactory(factory.id)
  const machine = rng.pick(factoryMachines.length ? factoryMachines : machines)
  const status = rng.pick(statuses)
  const plannedQty = so.qtyOrdered
  const producedQty =
    status === 'Completed' ? plannedQty : status === 'Planned' ? 0 : Math.round(plannedQty * rng.float(0.15, 0.9, 2))

  return {
    id: `po-${String(i + 1).padStart(4, '0')}`,
    orderNo: `PRD-${2026}-${String(i + 1).padStart(4, '0')}`,
    salesOrderId: so.id,
    salesOrderNo: so.orderNo,
    factoryId: factory.id,
    process,
    productId: so.productId,
    productName: so.productName,
    productType: so.productType,
    plannedQty,
    producedQty,
    unit: so.unit,
    status,
    startDate: isoDaysAgoFrom(rng.int(1, 45)),
    endDate: isoDaysFromNow(rng.int(-5, 20)),
    machineId: machine.id,
    machineCode: machine.code,
    shift: rng.pick(shifts),
  }
})

export const productionOrderById = new Map(productionOrders.map((p) => [p.id, p]))

export const productTypeTotals = (records: ProductionRecord[]) => {
  const totals = new Map<ProductType, number>()
  for (const r of records) {
    const qty = r.actualKg || r.actualM || 0
    totals.set(r.productType, (totals.get(r.productType) ?? 0) + qty)
  }
  return totals
}
