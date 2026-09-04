import type { InventoryCategory, StockMovementType } from '@/types'
import { inventorySummary, stockMovements } from '@/mock'
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
