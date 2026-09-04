import type { FactoryId, RiskLevel, SalesOrder } from '@/types'
import { company, customers, dispatches, orderStatusTiles, salesOrders } from '@/mock'
import { simulateDelay } from './delay'

export async function getOrderStatusTiles() {
  return simulateDelay(orderStatusTiles)
}

export interface SalesOrderFilters {
  risk?: RiskLevel | 'high'
  factoryId?: FactoryId
  exportOnly?: boolean
  customerId?: string
}

export async function getSalesOrders(filters: SalesOrderFilters = {}): Promise<SalesOrder[]> {
  let result = salesOrders
  if (filters.risk === 'high') {
    result = result.filter((o) => o.risk === 'atRisk' || o.risk === 'delayed')
  } else if (filters.risk) {
    result = result.filter((o) => o.risk === filters.risk)
  }
  if (filters.exportOnly) result = result.filter((o) => o.isExport)
  if (filters.customerId) result = result.filter((o) => o.customerId === filters.customerId)
  return simulateDelay(result)
}

export async function getDispatches(filters: { status?: string } = {}) {
  const result = filters.status ? dispatches.filter((d) => d.status === filters.status) : dispatches
  return simulateDelay(result)
}

/** Export profile — published figures plus the live order book breakdown. */
export async function getExportSummary() {
  const exportOrders = salesOrders.filter((o) => o.isExport)
  const byRegion = new Map<string, { orders: number; valueInr: number }>()
  for (const order of exportOrders) {
    const key = order.region ?? 'Other'
    const entry = byRegion.get(key) ?? { orders: 0, valueInr: 0 }
    entry.orders += 1
    entry.valueInr += order.valueInr
    byRegion.set(key, entry)
  }

  const countries = [...new Set(exportOrders.map((o) => o.country))]

  return simulateDelay({
    published: company.exports,
    exportOrderCount: exportOrders.length,
    exportValueInr: exportOrders.reduce((sum, o) => sum + o.valueInr, 0),
    activeCountries: countries.length,
    exportCustomers: customers.filter((c) => c.segment === 'Export').length,
    byRegion: [...byRegion.entries()].map(([region, v]) => ({ region, ...v })).sort((a, b) => b.valueInr - a.valueInr),
  })
}
