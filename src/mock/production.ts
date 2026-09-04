/**
 * Production history and orders.
 * Daily targets are calibrated to the output published on tmills.com:
 * approximately 25,000 kg of yarn per day,
 * split across the three spinning mills and the OE/post-spinning unit.
 */
import type { FactoryId, ProcessName, ProductionOrder, ProductionRecord, ProductType, Shift } from '@/types'
import { makeRng } from '@/lib/random'
import { factories, processesByFactory } from './factories'
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

/** Daily targets — spinning/OE in kg (25,000 kg total). */
const dailyTargetKg: Record<string, number> = {
  'mill-1': 6200,
  'mill-2': 7400,
  'mill-3': 6900,
  'oe-unit': 4500,
}

/** Which product types each unit makes, per its published count group. */
const productTypesByFactory: Record<string, ProductType[]> = {
  'mill-1': ['Compact', 'Single'],
  'mill-2': ['Single', 'Compact'],
  'mill-3': ['Single', 'Double'],
  'oe-unit': ['Open End', 'Double', 'Gassed'],
}

export const productionRecords: ProductionRecord[] = []

for (let dayOffset = HISTORY_DAYS - 1; dayOffset >= 0; dayOffset--) {
  const date = isoDaysAgo(dayOffset)
  const dow = new Date(date).getDay()
  const weekendFactor = dow === 0 ? 0.58 : dow === 6 ? 0.85 : 1

  factories.forEach((factory) => {
    const types = productTypesByFactory[factory.id]
    const target = dailyTargetKg[factory.id]
    const perTypeTarget = target / types.length
    const factoryProcesses = processesByFactory[factory.id] as readonly ProcessName[]

    types.forEach((productType) => {
      const noise = rng.float(0.9, 1.07, 3)
      const actual = Math.round(perTypeTarget * weekendFactor * noise)
      const factoryMachines = machinesByFactory(factory.id)
      const machine = rng.pick(factoryMachines.length ? factoryMachines : machines)
      productionRecords.push({
        date,
        factoryId: factory.id,
        process: rng.pick(factoryProcesses),
        machineId: machine.id,
        shift: rng.pick(shifts),
        productType,
        actualKg: actual,
        targetKg: Math.round(perTypeTarget),
      })
    })
  })
}

// ---- Production orders -------------------------------------------------

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

/** Route each product type to the unit that actually makes it. */
function factoryForProductType(productType: ProductType): FactoryId {
  const candidates = factories.filter((f) => productTypesByFactory[f.id] && productTypesByFactory[f.id].includes(productType))
  return (candidates.length ? rng.pick(candidates) : factories[0]).id
}

const linkedSalesOrders = rng.shuffle(salesOrders).slice(0, 150)

export const productionOrders: ProductionOrder[] = linkedSalesOrders.map((so, i) => {
  const factoryId = factoryForProductType(so.productType)
  const factoryProcesses = processesByFactory[factoryId] as readonly ProcessName[]
  const process = rng.pick(factoryProcesses)
  const factoryMachines = machinesByFactory(factoryId).filter((m) => m.process === process)
  const machine = rng.pick(factoryMachines.length ? factoryMachines : machinesByFactory(factoryId))
  const status = rng.pick(statuses)
  const plannedQty = so.qtyOrdered
  const producedQty =
    status === 'Completed' ? plannedQty : status === 'Planned' ? 0 : Math.round(plannedQty * rng.float(0.15, 0.9, 2))

  return {
    id: `po-${String(i + 1).padStart(4, '0')}`,
    orderNo: `PRD-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    salesOrderId: so.id,
    salesOrderNo: so.orderNo,
    factoryId,
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
