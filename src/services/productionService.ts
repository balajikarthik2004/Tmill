import type { DateRangePreset, FactoryId, ProcessName, ProductType, Shift } from '@/types'
import { productionRecords, productionOrders, factories } from '@/mock'
import { resolveDateRange } from '@/lib/dateRange'
import { simulateDelay } from './delay'

function inRange(dateIso: string, fromIso: string, toIso: string) {
  return dateIso >= fromIso && dateIso <= toIso
}

function filterRecords(preset: DateRangePreset, factoryId: FactoryId) {
  const { from, to } = resolveDateRange(preset)
  return productionRecords.filter(
    (r) => inRange(r.date, from, to) && (factoryId === 'all' || r.factoryId === factoryId),
  )
}

export interface ProductionTrendPoint {
  date: string
  actual: number
  target: number
}

export interface ProductionTrendResult {
  unit: 'kg' | 'm'
  points: ProductionTrendPoint[]
}

/**
 * Daily actual-vs-target series. Spinning and OE units are measured in kg,
 * the weaving unit in metres; "All units" reports the yarn (kg) trend.
 */
export async function getProductionTrend(
  preset: DateRangePreset,
  factoryId: FactoryId,
): Promise<ProductionTrendResult> {
  const records = filterRecords(preset, factoryId)
  const isWeavingOnly = factoryId === 'weaving-unit'
  const byDate = new Map<string, { actual: number; target: number }>()

  for (const r of records) {
    const day = r.date.slice(0, 10)
    const entry = byDate.get(day) ?? { actual: 0, target: 0 }
    if (isWeavingOnly) {
      entry.actual += r.actualM ?? 0
      entry.target += r.targetM ?? 0
    } else {
      entry.actual += r.actualKg
      entry.target += r.targetKg
    }
    byDate.set(day, entry)
  }

  const points = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, actual: Math.round(v.actual), target: Math.round(v.target) }))

  return simulateDelay({ unit: isWeavingOnly ? 'm' : 'kg', points })
}

export interface FactoryPerformance {
  factoryId: Exclude<FactoryId, 'all'>
  name: string
  achievedPct: number
  actual: number
  target: number
  unit: 'kg' | 'm'
}

export async function getFactoryPerformance(preset: DateRangePreset): Promise<FactoryPerformance[]> {
  const results = factories.map((factory) => {
    const records = filterRecords(preset, factory.id)
    const isWeaving = factory.type === 'Weaving'
    const actual = records.reduce((sum, r) => sum + (isWeaving ? r.actualM ?? 0 : r.actualKg), 0)
    const target = records.reduce((sum, r) => sum + (isWeaving ? r.targetM ?? 0 : r.targetKg), 0)
    return {
      factoryId: factory.id,
      name: factory.name,
      achievedPct: target > 0 ? Math.round((actual / target) * 1000) / 10 : 0,
      actual: Math.round(actual),
      target: Math.round(target),
      unit: isWeaving ? ('m' as const) : ('kg' as const),
    }
  })

  return simulateDelay(results)
}

export interface ProductTypeSlice {
  productType: ProductType
  qty: number
}

/**
 * Approximate linear weight of greige fabric, used only so the product-mix donut
 * can compare fabric (metres) against yarn (kg) on one kg-equivalent basis.
 * Trend and factory performance keep their native units.
 */
const FABRIC_KG_PER_METRE = 0.38

export async function getProductTypeBreakdown(
  preset: DateRangePreset,
  factoryId: FactoryId,
): Promise<ProductTypeSlice[]> {
  const records = filterRecords(preset, factoryId)
  const totals = new Map<ProductType, number>()
  for (const r of records) {
    const qty = r.actualKg || (r.actualM ?? 0) * FABRIC_KG_PER_METRE
    totals.set(r.productType, (totals.get(r.productType) ?? 0) + qty)
  }
  const result = [...totals.entries()].map(([productType, qty]) => ({ productType, qty: Math.round(qty) }))
  return simulateDelay(result)
}

export interface ProductionOrderFilters {
  process?: ProcessName
  factoryId?: FactoryId
  productType?: ProductType
  status?: string
}

export async function getProductionOrders(filters: ProductionOrderFilters = {}) {
  let result = productionOrders
  if (filters.process) result = result.filter((p) => p.process === filters.process)
  if (filters.factoryId && filters.factoryId !== 'all') result = result.filter((p) => p.factoryId === filters.factoryId)
  if (filters.productType) result = result.filter((p) => p.productType === filters.productType)
  if (filters.status) result = result.filter((p) => p.status === filters.status)
  return simulateDelay(result)
}

/** Per-process summary used by the production overview and process pages. */
export async function getProcessSummary(process: ProcessName, factoryId: FactoryId = 'all') {
  const { from, to } = resolveDateRange('30d')
  const records = productionRecords.filter(
    (r) => r.process === process && inRange(r.date, from, to) && (factoryId === 'all' || r.factoryId === factoryId),
  )
  const orders = productionOrders.filter((p) => p.process === process)
  const actual = records.reduce((sum, r) => sum + (r.actualKg || r.actualM || 0), 0)
  const target = records.reduce((sum, r) => sum + (r.targetKg || r.targetM || 0), 0)
  return simulateDelay({
    process,
    actual: Math.round(actual),
    target: Math.round(target),
    achievedPct: target > 0 ? Math.round((actual / target) * 1000) / 10 : 0,
    orderCount: orders.length,
    inProgress: orders.filter((o) => o.status === 'In Progress').length,
  })
}

export interface ProductionSummary {
  /** Yarn output from the three spinning mills and the OE/post-spinning unit. */
  yarnActualKg: number
  yarnTargetKg: number
  /** Greige fabric output from the weaving unit. */
  fabricActualM: number
  fabricTargetM: number
  /**
   * Combined achievement, comparing yarn (kg) and fabric (metres) on the same
   * kg-equivalent basis used by the product-mix donut.
   */
  achievedPct: number
  /** Orders still on the shop floor — planned, running or awaiting quality clearance. */
  activeOrders: number
  totalOrders: number
  recordCount: number
}

const activeOrderStatuses = new Set(['Planned', 'In Progress', 'Quality Check'])

/** Headline totals for the production hub, honouring the unit / product-type scope. */
export async function getProductionSummary(
  preset: DateRangePreset,
  factoryId: FactoryId = 'all',
  productType?: ProductType,
): Promise<ProductionSummary> {
  let records = filterRecords(preset, factoryId)
  if (productType) records = records.filter((r) => r.productType === productType)

  let yarnActualKg = 0
  let yarnTargetKg = 0
  let fabricActualM = 0
  let fabricTargetM = 0
  for (const r of records) {
    yarnActualKg += r.actualKg
    yarnTargetKg += r.targetKg
    fabricActualM += r.actualM ?? 0
    fabricTargetM += r.targetM ?? 0
  }

  const actualEq = yarnActualKg + fabricActualM * FABRIC_KG_PER_METRE
  const targetEq = yarnTargetKg + fabricTargetM * FABRIC_KG_PER_METRE

  const orders = productionOrders.filter(
    (o) =>
      (factoryId === 'all' || o.factoryId === factoryId) &&
      (!productType || o.productType === productType),
  )

  return simulateDelay({
    yarnActualKg: Math.round(yarnActualKg),
    yarnTargetKg: Math.round(yarnTargetKg),
    fabricActualM: Math.round(fabricActualM),
    fabricTargetM: Math.round(fabricTargetM),
    achievedPct: targetEq > 0 ? Math.round((actualEq / targetEq) * 1000) / 10 : 0,
    activeOrders: orders.filter((o) => activeOrderStatuses.has(o.status)).length,
    totalOrders: orders.length,
    recordCount: records.length,
  })
}

export interface ProcessOutput {
  process: ProcessName
  actualKg: number
  targetKg: number
  actualM: number
  targetM: number
}

export interface ShiftOutput {
  shift: Shift
  actualKg: number
  actualM: number
}

export interface ProductionDayDetail {
  /** Calendar day in YYYY-MM-DD form, as deep-linked from the trend chart. */
  date: string
  actualKg: number
  targetKg: number
  actualM: number
  targetM: number
  byProcess: ProcessOutput[]
  byShift: ShiftOutput[]
}

/**
 * Single-day drilldown behind the `?date=` deep link on the production hub.
 * Returns null when no records exist for that day in the given scope.
 */
export async function getProductionDay(
  day: string,
  factoryId: FactoryId = 'all',
  productType?: ProductType,
): Promise<ProductionDayDetail | null> {
  const records = productionRecords.filter(
    (r) =>
      r.date.slice(0, 10) === day &&
      (factoryId === 'all' || r.factoryId === factoryId) &&
      (!productType || r.productType === productType),
  )
  if (records.length === 0) return simulateDelay(null)

  const processes = new Map<ProcessName, ProcessOutput>()
  const shiftTotals = new Map<Shift, ShiftOutput>()
  let actualKg = 0
  let targetKg = 0
  let actualM = 0
  let targetM = 0

  for (const r of records) {
    actualKg += r.actualKg
    targetKg += r.targetKg
    actualM += r.actualM ?? 0
    targetM += r.targetM ?? 0

    const p = processes.get(r.process) ?? {
      process: r.process,
      actualKg: 0,
      targetKg: 0,
      actualM: 0,
      targetM: 0,
    }
    p.actualKg += r.actualKg
    p.targetKg += r.targetKg
    p.actualM += r.actualM ?? 0
    p.targetM += r.targetM ?? 0
    processes.set(r.process, p)

    const s = shiftTotals.get(r.shift) ?? { shift: r.shift, actualKg: 0, actualM: 0 }
    s.actualKg += r.actualKg
    s.actualM += r.actualM ?? 0
    shiftTotals.set(r.shift, s)
  }

  const byProcess: ProcessOutput[] = [...processes.values()]
    .map((p) => ({
      process: p.process,
      actualKg: Math.round(p.actualKg),
      targetKg: Math.round(p.targetKg),
      actualM: Math.round(p.actualM),
      targetM: Math.round(p.targetM),
    }))
    .sort((a, b) => b.actualKg + b.actualM - (a.actualKg + a.actualM))

  const byShift: ShiftOutput[] = [...shiftTotals.values()]
    .map((s) => ({ shift: s.shift, actualKg: Math.round(s.actualKg), actualM: Math.round(s.actualM) }))
    .sort((a, b) => (a.shift < b.shift ? -1 : 1))

  return simulateDelay({
    date: day,
    actualKg: Math.round(actualKg),
    targetKg: Math.round(targetKg),
    actualM: Math.round(actualM),
    targetM: Math.round(targetM),
    byProcess,
    byShift,
  })
}
