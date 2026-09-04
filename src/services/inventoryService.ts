import { inventorySummary, stockMovements } from '@/mock'
import { simulateDelay } from './delay'

export async function getInventorySummary() {
  return simulateDelay(inventorySummary)
}

export async function getStockMovements() {
  return simulateDelay(stockMovements)
}
