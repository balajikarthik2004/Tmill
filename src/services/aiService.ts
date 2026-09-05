/**
 * Copilot service layer.
 *
 * This is the swap-in point for a real assistant. Today it assembles a plant
 * snapshot from the mock modules, runs the deterministic answer engine in
 * `src/lib/ai/`, and returns the result behind a realistic think-time. Point
 * `askCopilot` at a model endpoint and nothing above this file changes.
 */
import type {
  AiAnswer,
  AiEngineer,
  AiIncident,
  AiInsight,
  AiScope,
  AiSystemStatus,
} from '@/types'
import {
  alerts,
  breakdowns,
  complaints,
  cottonLots,
  customers,
  energyRecords,
  engineers,
  factories,
  incidents,
  inventorySummary,
  machines,
  pmTasks,
  productionOrders,
  productionRecords,
  products,
  qualityPassRatePct,
  qualityTests,
  rejections,
  salesOrders,
  spareParts,
  suppliers,
  currentUser,
} from '@/mock'
import { buildInsights, classifySmallTalk, composeAnswer, insightsForScope, type AiDataContext } from '@/lib/ai'
import { simulateDelay } from './delay'

/** The snapshot the engine reasons over. Built once - the mock data is static. */
const context: AiDataContext = {
  user: currentUser,
  factories,
  machines,
  breakdowns,
  pmTasks,
  spareParts,
  salesOrders,
  productionOrders,
  productionRecords,
  qualityTests,
  rejections,
  complaints,
  cottonLots,
  energyRecords,
  inventory: inventorySummary,
  alerts,
  customers,
  products,
  suppliers,
  engineers,
  incidents,
  qualityPassRatePct,
}

/**
 * Think-time still scales with question length the way a streaming model does,
 * but kept short enough that the assistant feels immediate.
 */
function thinkTime(question: string) {
  // A greeting needs no retrieval, so it should not sit behind a retrieval wait.
  if (classifySmallTalk(question)) return 260
  return Math.min(950, 380 + question.trim().length * 5)
}

export async function askCopilot(question: string): Promise<AiAnswer> {
  const answer = composeAnswer(question, context)
  const delay = thinkTime(question)
  return simulateDelay(answer, delay * 0.85, delay * 1.15)
}

export async function getAiInsights(scope: AiScope, limit = 3): Promise<AiInsight[]> {
  return simulateDelay(insightsForScope(context, scope, limit), 120, 260)
}

export async function getAllAiInsights(): Promise<AiInsight[]> {
  return simulateDelay(buildInsights(context), 140, 280)
}

export async function getEngineers(): Promise<AiEngineer[]> {
  return simulateDelay(engineers)
}

export interface IncidentFilters {
  topic?: AiIncident['topic']
  search?: string
  engineerId?: string
}

export async function getIncidents(filters: IncidentFilters = {}): Promise<AiIncident[]> {
  let result = incidents
  if (filters.topic) result = result.filter((i) => i.topic === filters.topic)
  if (filters.engineerId) result = result.filter((i) => i.resolvedByIds.includes(filters.engineerId!))
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter((i) =>
      [i.title, i.symptom, i.rootCause, i.category, i.machineCode ?? '', i.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }
  return simulateDelay(result)
}

/** Rolls the knowledge base up by failure signature, for the playbook view. */
export interface AiPlaybook {
  key: string
  title: string
  topic: AiIncident['topic']
  category: string
  occurrences: number
  lastSeen: string
  avgDowntimeHrs: number
  avgCostInr: number
  rootCause: string
  preventiveAction: string
  steps: AiIncident['resolutionSteps']
  owners: Array<{ id: string; name: string; role: string; fixes: number }>
  machineCodes: string[]
  tags: string[]
}

export async function getPlaybooks(): Promise<AiPlaybook[]> {
  const grouped = new Map<string, AiIncident[]>()
  for (const incident of incidents) {
    grouped.set(incident.title, [...(grouped.get(incident.title) ?? []), incident])
  }

  const playbooks: AiPlaybook[] = [...grouped.entries()].map(([title, group]) => {
    const ownerCounts = new Map<string, number>()
    for (const incident of group) {
      for (const id of incident.resolvedByIds) ownerCounts.set(id, (ownerCounts.get(id) ?? 0) + 1)
    }
    const owners = [...ownerCounts.entries()]
      .map(([id, fixes]) => {
        const engineer = engineers.find((e) => e.id === id)
        return { id, name: engineer?.name ?? id, role: engineer?.role ?? '', fixes }
      })
      .sort((a, b) => b.fixes - a.fixes)

    const first = group[0]
    return {
      key: title,
      title,
      topic: first.topic,
      category: first.category,
      occurrences: group.length,
      lastSeen: group.reduce((latest, i) => (i.occurredAt > latest ? i.occurredAt : latest), group[0].occurredAt),
      avgDowntimeHrs: Math.round((group.reduce((s, i) => s + i.downtimeHrs, 0) / group.length) * 10) / 10,
      avgCostInr: Math.round(group.reduce((s, i) => s + i.costInr, 0) / group.length),
      rootCause: first.rootCause,
      preventiveAction: first.preventiveAction,
      steps: first.resolutionSteps,
      owners,
      machineCodes: [...new Set(group.map((i) => i.machineCode).filter((c): c is string => Boolean(c)))],
      tags: first.tags,
    }
  })

  playbooks.sort((a, b) => b.occurrences - a.occurrences || (a.lastSeen < b.lastSeen ? 1 : -1))
  return simulateDelay(playbooks)
}

/** Cosmetic telemetry for the copilot landing page. */
export async function getAiSystemStatus(): Promise<AiSystemStatus> {
  const now = Date.now()
  const minutesAgo = (m: number) => new Date(now - m * 60000).toISOString()

  const status: AiSystemStatus = {
    modelLabel: 'T-Mills Copilot',
    version: 'TM-Textile-1 · build 2.4',
    status: 'Online',
    indexedRecords:
      machines.length +
      salesOrders.length +
      productionOrders.length +
      productionRecords.length +
      qualityTests.length +
      cottonLots.length +
      energyRecords.length +
      spareParts.length +
      pmTasks.length,
    knowledgeCases: incidents.length,
    connectedSources: [
      { name: 'Production & shift records', records: productionRecords.length, syncedAt: minutesAgo(4), status: 'Live' },
      { name: 'Machine registry & OEE', records: machines.length, syncedAt: minutesAgo(2), status: 'Live' },
      { name: 'Sales & production orders', records: salesOrders.length + productionOrders.length, syncedAt: minutesAgo(7), status: 'Live' },
      { name: 'Central Testing Laboratory', records: qualityTests.length, syncedAt: minutesAgo(11), status: 'Live' },
      { name: 'Energy & utilities meters', records: energyRecords.length, syncedAt: minutesAgo(3), status: 'Live' },
      { name: 'Resolution knowledge base', records: incidents.length, syncedAt: minutesAgo(26), status: 'Syncing' },
    ],
    answersToday: 47,
    avgLatencyMs: 1180,
    groundedPct: 98.4,
    deflectedHours: 12.5,
  }
  return simulateDelay(status)
}

/** Starter prompts shown on an empty copilot thread. */
export const suggestedPrompts: string[] = [
  'Which machine is down and how long will it take to fix?',
  'Which sales orders are at risk and what do we do about them?',
  'Why did production fall short this week and how do we recover it?',
  'What is driving the quality deviations in the lab results?',
]
