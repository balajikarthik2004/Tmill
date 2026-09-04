import { breakdowns, machines, maintenanceSummary, pmTasks, spareParts } from '@/mock'
import { simulateDelay } from './delay'

export async function getMaintenanceSummary() {
  return simulateDelay(maintenanceSummary)
}

export async function getMachines() {
  return simulateDelay(machines)
}

export async function getPmTasks() {
  return simulateDelay(pmTasks)
}

export async function getBreakdowns() {
  return simulateDelay(breakdowns)
}

export async function getSpareParts() {
  return simulateDelay(spareParts)
}
