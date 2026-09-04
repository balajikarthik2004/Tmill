import { grns, purchaseOrders, purchaseRequisitions } from '@/mock'
import { simulateDelay } from './delay'

export async function getPurchaseRequisitions(filters: { status?: string } = {}) {
  const result = filters.status ? purchaseRequisitions.filter((p) => p.status === filters.status) : purchaseRequisitions
  return simulateDelay(result)
}

export async function getPurchaseOrders(filters: { status?: string; supplierId?: string } = {}) {
  let result = purchaseOrders
  if (filters.status) result = result.filter((p) => p.status === filters.status)
  if (filters.supplierId) result = result.filter((p) => p.supplierId === filters.supplierId)
  return simulateDelay(result)
}

export async function getGrns(filters: { status?: string; supplierId?: string } = {}) {
  let result = grns
  if (filters.status) result = result.filter((g) => g.status === filters.status)
  if (filters.supplierId) result = result.filter((g) => g.supplierId === filters.supplierId)
  return simulateDelay(result)
}
