import type {
  FacilityStockRow,
  InventoryCategory,
  InventoryValuation,
  InventoryValuationPoint,
  InventoryValuationRow,
  StockMovementType,
} from '@/types'
import {
  factories,
  godownCapacityMt,
  inventorySummary,
  standardRateInr,
  stockMovements,
} from '@/mock'
import { makeRng } from '@/lib/random'
import { simulateDelay } from './delay'

export async function getInventorySummary() {
  return simulateDelay(inventorySummary)
}

/**
 * Movement ledger, newest first. Filters mirror the ledger screens —
 * a movement type (GRN, Issue, Transfer, Prod Consumption, Prod Receipt,
 * Dispatch, Adjustment) and/or a stock category.
 */
export async function getStockMovements(
  filters: { type?: StockMovementType; category?: InventoryCategory } = {},
) {
  let result = stockMovements
  if (filters.type) result = result.filter((m) => m.type === filters.type)
  if (filters.category) result = result.filter((m) => m.category === filters.category)
  return simulateDelay([...result].sort((a, b) => (a.date < b.date ? 1 : -1)))
}


/* ------------------------------------------------------------ valuation */

/** Stock is held in tonnes; standard rates are per kg. */
function valueOf(category: InventoryCategory, qtyMt: number) {
  return qtyMt * 1000 * standardRateInr[category].rate
}

const VALUATION_DAYS = 30

/**
 * Values the standing stock at standard rates and reconstructs a 30-day
 * valuation trend.
 *
 * The trend is generated from a seeded walk anchored to today's actual
 * valuation, so the series always lands exactly on the current figure rather
 * than drifting away from the number shown beside it.
 */
export async function getInventoryValuation(): Promise<InventoryValuation> {
  const rows: InventoryValuationRow[] = inventorySummary.map((item) => ({
    category: item.category,
    qty: item.currentQty,
    unit: item.unit,
    ratePerUnitInr: standardRateInr[item.category].rate,
    rateBasis: standardRateInr[item.category].basis,
    valueInr: Math.round(valueOf(item.category, item.currentQty)),
    sharePct: 0,
    belowReorder: item.belowReorder,
  }))

  const totalInr = rows.reduce((sum, row) => sum + row.valueInr, 0)
  for (const row of rows) {
    row.sharePct = totalInr ? (row.valueInr / totalInr) * 100 : 0
  }

  // Walk backwards from today so the last point equals the live valuation.
  const rng = makeRng(9017)
  const factorsBack: number[] = [1]
  for (let i = 1; i < VALUATION_DAYS; i += 1) {
    factorsBack.push(factorsBack[i - 1] * (1 + rng.float(-0.012, 0.014, 4)))
  }

  const byCategory = (category: InventoryCategory) =>
    rows.find((r) => r.category === category)?.valueInr ?? 0

  const trend: InventoryValuationPoint[] = []
  for (let i = VALUATION_DAYS - 1; i >= 0; i -= 1) {
    const factor = factorsBack[i]
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const point: InventoryValuationPoint = {
      date: date.toISOString(),
      rawCottonInr: Math.round(byCategory('Raw Cotton') * factor),
      wipInr: Math.round(byCategory('WIP') * factor),
      finishedYarnInr: Math.round(byCategory('Finished Yarn') * factor),
      totalInr: 0,
    }
    point.totalInr = point.rawCottonInr + point.wipInr + point.finishedYarnInr
    trend.push(point)
  }

  const previousTotalInr = trend[0]?.totalInr ?? totalInr
  const avgDaysOfCover =
    inventorySummary.reduce((sum, item) => sum + item.daysOfStock, 0) /
    Math.max(1, inventorySummary.length)

  return simulateDelay({
    rows,
    totalInr,
    previousTotalInr,
    changePct: previousTotalInr ? ((totalInr - previousTotalInr) / previousTotalInr) * 100 : 0,
    trend,
    valuePerDayOfCoverInr: avgDaysOfCover ? Math.round(totalInr / avgDaysOfCover) : 0,
  })
}

/**
 * Splits the tonnage-based stock across the units by godown capacity, so the
 * facility bars reflect the real installed base rather than a flat guess.
 */
export async function getFacilityStock(): Promise<FacilityStockRow[]> {
  const tonnage = inventorySummary.reduce((sum, item) => sum + item.currentQty, 0)

  const totalCapacity = factories.reduce(
    (sum, factory) => sum + (godownCapacityMt[factory.id] ?? 0),
    0,
  )

  const rng = makeRng(3311)

  const rows = factories.map((factory) => {
    const capacityMt = godownCapacityMt[factory.id] ?? 0
    // Share of the standing tonnage, nudged so units are not all identical.
    const share = totalCapacity ? capacityMt / totalCapacity : 0
    const stockMt = Math.round(tonnage * share * rng.float(0.86, 1.1, 3))
    return {
      factoryId: factory.id,
      factoryName: factory.name,
      shortName: factory.shortName,
      stockMt,
      capacityMt,
      utilisationPct: capacityMt ? Math.min(100, (stockMt / capacityMt) * 100) : 0,
      valueInr: Math.round(stockMt * 1000 * standardRateInr['Raw Cotton'].rate),
    }
  })

  return simulateDelay(rows.sort((a, b) => b.utilisationPct - a.utilisationPct))
}
