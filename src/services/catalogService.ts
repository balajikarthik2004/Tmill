import type { CottonOrigin, ProcessName } from '@/types'
import {
  company,
  cottonLots,
  customers,
  factories,
  machines,
  products,
  suppliers,
} from '@/mock'
import { simulateDelay } from './delay'

export async function getCompany() {
  return simulateDelay(company)
}

export async function getFactories() {
  return simulateDelay(factories)
}

export async function getProducts() {
  return simulateDelay(products)
}

export async function getCustomers(filters: { segment?: 'Domestic' | 'Export' } = {}) {
  const result = filters.segment ? customers.filter((c) => c.segment === filters.segment) : customers
  return simulateDelay(result)
}

export async function getSuppliers(filters: { category?: string } = {}) {
  const result = filters.category ? suppliers.filter((s) => s.category === filters.category) : suppliers
  return simulateDelay(result)
}

export async function getMachines(filters: { factoryId?: string; process?: ProcessName } = {}) {
  let result = machines
  if (filters.factoryId && filters.factoryId !== 'all') result = result.filter((m) => m.factoryId === filters.factoryId)
  if (filters.process) result = result.filter((m) => m.process === filters.process)
  return simulateDelay(result)
}

export async function getCottonLots(filters: { origin?: CottonOrigin; status?: string } = {}) {
  let result = cottonLots
  if (filters.origin) result = result.filter((l) => l.origin === filters.origin)
  if (filters.status) result = result.filter((l) => l.status === filters.status)
  return simulateDelay(result)
}
