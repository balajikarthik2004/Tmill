import type { FactoryId, RiskLevel, SalesOrder } from '@/types'
import { orderStatusTiles, salesOrders } from '@/mock'
import { simulateDelay } from './delay'

export async function getOrderStatusTiles() {
  return simulateDelay(orderStatusTiles)
}

export interface SalesOrderFilters {
  risk?: RiskLevel | 'high'
  factoryId?: FactoryId
}

export async function getSalesOrders(filters: SalesOrderFilters = {}): Promise<SalesOrder[]> {
  let result = salesOrders
  if (filters.risk === 'high') {
    result = result.filter((o) => o.risk === 'atRisk' || o.risk === 'delayed')
  } else if (filters.risk) {
    result = result.filter((o) => o.risk === filters.risk)
  }
  return simulateDelay(result)
}
