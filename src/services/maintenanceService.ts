import type { Machine, MachineStatus, ProcessName } from '@/types'
import { breakdowns, factories, machines, maintenanceSummary, pmTasks, spareParts } from '@/mock'
import { simulateDelay } from './delay'

export async function getMaintenanceSummary() {
  return simulateDelay(maintenanceSummary)
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

export interface FleetGroupStat {
  key: string
  label: string
  machines: number
  avgOeePct: number
  avgUtilizationPct: number
}

export interface MachineFleetSummary {
  total: number
  byStatus: Record<MachineStatus, number>
  critical: number
  avgOeePct: number
  avgUtilizationPct: number
  byUnit: FleetGroupStat[]
  byProcess: FleetGroupStat[]
}

const round1 = (value: number) => Math.round(value * 10) / 10

const factoryNames = new Map<string, string>(factories.map((f) => [f.id, f.name]))

function average(values: number[]) {
  return values.length ? round1(values.reduce((sum, v) => sum + v, 0) / values.length) : 0
}

/** Fleet-level OEE, utilisation and status counts for the machine registry. */
export async function getMachineFleetSummary(
  filters: { factoryId?: string; process?: ProcessName } = {},
) {
  let list = machines
  if (filters.factoryId && filters.factoryId !== 'all') {
    list = list.filter((m) => m.factoryId === filters.factoryId)
  }
  if (filters.process) list = list.filter((m) => m.process === filters.process)

  const statuses: MachineStatus[] = ['Running', 'Idle', 'Breakdown', 'Maintenance']
  const byStatus = statuses.reduce(
    (acc, status) => {
      acc[status] = list.filter((m) => m.status === status).length
      return acc
    },
    {} as Record<MachineStatus, number>,
  )

  const groupBy = (keyOf: (machine: Machine) => string, labelOf: (key: string) => string) => {
    const map = new Map<string, typeof list>()
    for (const machine of list) {
      const key = keyOf(machine)
      map.set(key, [...(map.get(key) ?? []), machine])
    }
    return [...map.entries()]
      .map(([key, group]) => ({
        key,
        label: labelOf(key),
        machines: group.length,
        avgOeePct: average(group.map((m) => m.oeePct)),
        avgUtilizationPct: average(group.map((m) => m.utilizationPct)),
      }))
      .sort((a, b) => b.avgOeePct - a.avgOeePct)
  }

  const summary: MachineFleetSummary = {
    total: list.length,
    byStatus,
    critical: list.filter((m) => m.isCritical).length,
    avgOeePct: average(list.map((m) => m.oeePct)),
    avgUtilizationPct: average(list.map((m) => m.utilizationPct)),
    byUnit: groupBy(
      (m) => m.factoryId,
      (key) => factoryNames.get(key) ?? key,
    ),
    byProcess: groupBy(
      (m) => m.process,
      (key) => key,
    ),
  }
  return simulateDelay(summary)
}
