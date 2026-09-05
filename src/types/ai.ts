/**
 * Types for the T-Mills Copilot module.
 *
 * The copilot is a *simulated* assistant: there is no model behind it. Every
 * answer is composed deterministically in `src/lib/ai/` from the same mock
 * domain data the rest of the app renders, then streamed back through
 * `src/services/aiService.ts` with realistic latency. The shapes below are
 * deliberately close to what a real RAG pipeline would emit (retrieved cases,
 * ranked causes, citations, confidence) so swapping in a real model later is a
 * service-layer change only.
 */
import type { ID, ISODate, Severity } from './common'
import type { FactoryId, ProcessName } from './factory'

/** What the question is *about*. */
export type AiTopic =
  | 'breakdown'
  | 'quality'
  | 'orderDelay'
  | 'production'
  | 'energy'
  | 'inventory'
  | 'procurement'
  | 'capacity'
  | 'cost'
  | 'people'
  | 'general'

/** What the user wants *done* with it. */
export type AiIntent =
  | 'diagnose'
  | 'lookup'
  | 'forecast'
  | 'plan'
  | 'recommend'
  | 'compare'
  | 'summarise'

export type AiEntityType =
  | 'machine'
  | 'order'
  | 'productionOrder'
  | 'cottonLot'
  | 'process'
  | 'factory'
  | 'product'
  | 'customer'
  | 'country'
  | 'engineer'
  | 'period'

export interface AiEntity {
  type: AiEntityType
  /** Canonical id or code used to look the record up. */
  value: string
  /** Human label shown as a chip in the UI. */
  label: string
}

/* ------------------------------------------------------------------ people */

export type EngineerAvailability =
  | 'Available'
  | 'On shift'
  | 'On another job'
  | 'Off shift'
  | 'On leave'

export interface AiEngineer {
  id: ID
  name: string
  initials: string
  role: string
  department: 'Maintenance' | 'Production' | 'Quality' | 'Utilities' | 'Planning'
  factoryId: Exclude<FactoryId, 'all'>
  shift: 'A' | 'B' | 'C' | 'General'
  yearsExperience: number
  /** Processes / machine families this person is strongest on. */
  specialities: string[]
  skills: string[]
  certifications: string[]
  incidentsResolved: number
  firstTimeFixPct: number
  avgResponseMins: number
  avgMttrHrs: number
  availability: EngineerAvailability
  rating: number
  contact: string
}

/* --------------------------------------------------------------- incidents */

export interface AiResolutionStep {
  step: string
  detail: string
  durationHrs: number
}

/** A closed case in the resolution knowledge base. */
export interface AiIncident {
  id: ID
  refNo: string
  title: string
  topic: AiTopic
  category: string
  symptom: string
  machineCode?: string
  process?: ProcessName
  factoryId: Exclude<FactoryId, 'all'>
  occurredAt: ISODate
  severity: Severity
  detectedBy: string
  rootCause: string
  contributingFactors: string[]
  resolutionSteps: AiResolutionStep[]
  resolvedByIds: ID[]
  downtimeHrs: number
  outputLossKg: number
  costInr: number
  preventiveAction: string
  /** How many times a case of this signature has been logged historically. */
  recurrence: number
  tags: string[]
  outcome: string
}

/* ----------------------------------------------------------- answer blocks */

export interface AiSource {
  label: string
  detail?: string
  to?: string
}

export type AiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface AiMetric {
  label: string
  value: string
  hint?: string
  tone?: AiTone
}

export interface AiCause {
  cause: string
  /** 0-100. Ranked probability this is the driver. */
  likelihood: number
  evidence: string
  signal?: string
}

export interface AiHistoricalCase {
  incidentId: ID
  refNo: string
  title: string
  occurredAt: ISODate
  machineCode?: string
  factoryLabel: string
  /** 0-100 similarity to the question being asked now. */
  similarityPct: number
  rootCause: string
  resolutionSteps: AiResolutionStep[]
  downtimeHrs: number
  costInr: number
  resolvedBy: Array<{ id: ID; name: string; role: string }>
  preventiveAction: string
  outcome: string
  recurrence: number
}

export interface AiEngineerMatch {
  engineerId: ID
  name: string
  initials: string
  role: string
  factoryLabel: string
  shift: string
  /** 0-100 fit for *this* problem. */
  matchPct: number
  reason: string
  pastFixes: number
  avgMttrHrs: number
  firstTimeFixPct: number
  avgResponseMins: number
  availability: EngineerAvailability
  skills: string[]
  contact: string
}

export interface AiPlanTask {
  id: string
  name: string
  detail: string
  owner: string
  ownerRole: string
  durationHrs: number
  /** Hours from plan start. */
  startOffsetHrs: number
  dependsOn: string[]
  onCriticalPath: boolean
}

export interface AiPlanPhase {
  id: string
  name: string
  objective: string
  tasks: AiPlanTask[]
}

export interface AiPlanRisk {
  risk: string
  likelihood: 'Low' | 'Medium' | 'High'
  impact: string
  mitigation: string
}

export interface AiPlan {
  title: string
  objective: string
  phases: AiPlanPhase[]
  /** Elapsed hours on the critical path, not the sum of all task hours. */
  totalHrs: number
  /** Sum of all task hours - the effort estimate. */
  effortHrs: number
  etaIso: ISODate
  confidencePct: number
  criticalPath: string[]
  assumptions: string[]
  resources: string[]
  risks: AiPlanRisk[]
  successCriteria: string[]
  /** Comparable historical durations the estimate was calibrated against. */
  benchmark: string
}

export interface AiTimelineStep {
  label: string
  at: string
  detail: string
  tone?: AiTone
}

export interface AiTableBlockRow {
  cells: string[]
  tone?: AiTone
}

export type AiBlock =
  | { kind: 'text'; body: string }
  | { kind: 'metrics'; title: string; items: AiMetric[] }
  | { kind: 'bullets'; title: string; items: string[] }
  | { kind: 'diagnosis'; title: string; causes: AiCause[] }
  | { kind: 'history'; title: string; cases: AiHistoricalCase[] }
  | { kind: 'engineers'; title: string; people: AiEngineerMatch[] }
  | { kind: 'plan'; plan: AiPlan }
  | { kind: 'table'; title: string; columns: string[]; rows: AiTableBlockRow[] }
  | { kind: 'timeline'; title: string; steps: AiTimelineStep[] }
  | { kind: 'callout'; tone: AiTone; title: string; body: string }

/* ---------------------------------------------------------------- answers */

export interface AiAnswer {
  id: ID
  question: string
  intent: AiIntent
  topic: AiTopic
  entities: AiEntity[]
  headline: string
  /** The streamed opening paragraph. */
  summary: string
  confidencePct: number
  blocks: AiBlock[]
  sources: AiSource[]
  followUps: string[]
  /** Shown while "thinking" - the retrieval trace. */
  reasoningSteps: string[]
  modelLabel: string
  latencyMs: number
  tokensUsed: number
  groundedRecords: number
}

export interface AiChatMessage {
  id: ID
  role: 'user' | 'assistant'
  createdAt: ISODate
  /** Present on user turns and on plain assistant text. */
  text?: string
  /** Present on structured assistant turns. */
  answer?: AiAnswer
}

export interface AiConversation {
  id: ID
  title: string
  createdAt: ISODate
  updatedAt: ISODate
  messages: AiChatMessage[]
}

/* --------------------------------------------------------------- insights */

export type AiScope =
  | 'dashboard'
  | 'production'
  | 'quality'
  | 'maintenance'
  | 'sales'
  | 'inventory'
  | 'energy'

export type AiInsightKind = 'risk' | 'anomaly' | 'opportunity' | 'forecast' | 'recommendation'

export interface AiInsight {
  id: ID
  scope: AiScope
  kind: AiInsightKind
  title: string
  detail: string
  /** What it is worth, in words. */
  impact: string
  confidencePct: number
  severity: Severity
  /** Clicking through pre-fills the copilot with this question. */
  prompt: string
  linkTo?: string
  linkLabel?: string
}

/** Model/telemetry panel on the copilot page. */
export interface AiSystemStatus {
  modelLabel: string
  version: string
  status: 'Online' | 'Degraded' | 'Offline'
  indexedRecords: number
  knowledgeCases: number
  connectedSources: Array<{
    name: string
    records: number
    syncedAt: ISODate
    status: 'Live' | 'Syncing'
  }>
  answersToday: number
  avgLatencyMs: number
  groundedPct: number
  deflectedHours: number
}
