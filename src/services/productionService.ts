import type { DateRangePreset, FactoryId, ProductType } from '@/types'
import { productionRecords, productionOrders } from '@/mock'
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
 * Daily actual-vs-target series. Spinning factories are measured in kg (yarn),
 * the Weaving Unit in metres (fabric) — when "All Factories" is selected we
 * report the yarn (kg) trend, since that is the flagship production metric.
 */
export async function getProductionTrend(
  preset: DateRangePreset,
  factoryId: FactoryId,
): Promise<ProductionTrendResult> {
  const records = filterRecords(preset, factoryId)
  const isWeavingOnly = factoryId === 'weaving-1'
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
  factoryId: FactoryId
  name: string
  achievedPct: number
  actual: number
  target: number
  unit: 'kg' | 'm'
}

export async function getFactoryPerformance(preset: DateRangePreset): Promise<FactoryPerformance[]> {
  const factoryIds: Exclude<FactoryId, 'all'>[] = ['spinning-1', 'spinning-2', 'spinning-3', 'weaving-1']
  const names: Record<Exclude<FactoryId, 'all'>, string> = {
    'spinning-1': 'Spinning Unit 1',
    'spinning-2': 'Spinning Unit 2',
    'spinning-3': 'Spinning Unit 3',
    'weaving-1': 'Weaving Unit',
  }

  const results = factoryIds.map((id) => {
    const records = filterRecords(preset, id)
    const isWeaving = id === 'weaving-1'
    const actual = records.reduce((sum, r) => sum + (isWeaving ? r.actualM ?? 0 : r.actualKg), 0)
    const target = records.reduce((sum, r) => sum + (isWeaving ? r.targetM ?? 0 : r.targetKg), 0)
    return {
      factoryId: id,
      name: names[id],
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

// Approx. linear weight for greige fabric at typical width/GSM, used only to give
// the product-mix donut a fair kg-equivalent basis alongside yarn (kg) segments —
// production trend and factory performance elsewhere keep native kg/m units.
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

export async function getProductionOrders() {
  return simulateDelay(productionOrders)
}
