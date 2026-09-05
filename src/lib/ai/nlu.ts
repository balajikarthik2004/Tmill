/**
 * Question understanding for the copilot.
 *
 * A small, transparent rules engine rather than a model: it extracts the
 * entities the plant actually uses (machine codes, order numbers, lot numbers,
 * processes, units, counts, customers, countries), scores the question against
 * topic vocabularies, and picks an intent. Everything downstream - retrieval,
 * ranking, planning - keys off the result.
 */
import type { AiEntity, AiIntent, AiTopic, ProcessName } from '@/types'
import type { AiDataContext } from './context'

export interface ParsedQuestion {
  raw: string
  normalised: string
  tokens: string[]
  topic: AiTopic
  /** Runner-up topic, used to blend evidence when the question straddles two. */
  secondaryTopic?: AiTopic
  intent: AiIntent
  entities: AiEntity[]
  /** 0-1. How confidently the question was classified. */
  clarity: number
  /** Whether the user is describing a problem, as opposed to asking for a figure. */
  isProblem: boolean
  wantsPlan: boolean
  wantsPeople: boolean
  wantsHistory: boolean
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'on', 'for',
  'and', 'or', 'we', 'our', 'us', 'i', 'me', 'my', 'it', 'this', 'that', 'these', 'those',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'will', 'shall', 'have', 'has',
  'had', 'with', 'at', 'by', 'from', 'as', 'any', 'some', 'what', 'please', 'tell',
])

const TOPIC_VOCAB: Record<AiTopic, string[]> = {
  breakdown: [
    'breakdown', 'break', 'down', 'stopped', 'stoppage', 'failure', 'failed', 'fault', 'trip',
    'tripped', 'bearing', 'spindle', 'motor', 'drive', 'belt', 'tape', 'noise', 'vibration',
    'jam', 'repair', 'machine', 'frame', 'maintenance', 'mttr', 'downtime', 'sensor', 'clearer',
    'suction', 'nipper', 'rotor', 'overhaul', 'spare', 'pm',
  ],
  quality: [
    'quality', 'defect', 'deviation', 'reject', 'rejection', 'rework', 'complaint', 'csp',
    'strength', 'uster', 'evenness', 'unevenness', 'u%', 'hairiness', 'imperfection', 'neps',
    'nep', 'tpi', 'twist', 'micronaire', 'staple', 'trash', 'contamination', 'test', 'lab',
    'tolerance', 'specification', 'spec', 'pass', 'fail', 'afis', 'hvi', 'tensojet',
  ],
  orderDelay: [
    'order', 'orders', 'delay', 'delayed', 'late', 'risk', 'overdue', 'due', 'delivery',
    'deliver', 'dispatch', 'shipment', 'ship', 'container', 'customer', 'export', 'commit',
    'commitment', 'lead', 'slip', 'slipping', 'promise', 'eta',
  ],
  production: [
    'production', 'output', 'produce', 'produced', 'target', 'shortfall', 'volume', 'kg',
    'oee', 'efficiency', 'utilisation', 'utilization', 'shift', 'yield', 'throughput',
    'changeover', 'speed', 'doffing', 'spinning', 'weaving', 'trend',
  ],
  energy: [
    'energy', 'power', 'kwh', 'electricity', 'consumption', 'unit', 'tariff', 'renewable',
    'solar', 'wind', 'humidification', 'compressed', 'air', 'leak', 'factor', 'bill',
    'emission', 'co2', 'carbon', 'water',
  ],
  inventory: [
    'inventory', 'stock', 'reorder', 'godown', 'warehouse', 'wip', 'finished', 'goods',
    'cover', 'shortage', 'balance', 'movement', 'bales', 'store', 'stores',
  ],
  procurement: [
    'procurement', 'purchase', 'supplier', 'vendor', 'grn', 'requisition', 'po', 'buying',
    'sourcing', 'cotton', 'lot', 'lots', 'receipt', 'price',
  ],
  capacity: [
    'capacity', 'plan', 'planning', 'bottleneck', 'constraint', 'load', 'schedule',
    'scheduling', 'spindles', 'rotors', 'looms', 'available', 'feasible', 'feasibility',
    'sequence', 'backlog', 'queue',
  ],
  cost: ['cost', 'cost', 'spend', 'value', 'margin', 'inr', 'rupees', 'expense', 'saving', 'loss', 'penalty'],
  people: [
    'who', 'engineer', 'engineers', 'technician', 'team', 'assign', 'assigned', 'operator',
    'staff', 'expert', 'specialist', 'resolved', 'handled', 'owner', 'responsible',
  ],
  general: [],
}

const PROCESS_NAMES: ProcessName[] = [
  'Blow Room', 'Carding', 'Combing', 'Drawing', 'Roving', 'Ring Spinning',
  'Open End', 'Winding', 'TFO', 'Gassing', 'Weaving',
]

const PROCESS_ALIASES: Record<string, ProcessName> = {
  'blow room': 'Blow Room',
  blowroom: 'Blow Room',
  carding: 'Carding',
  card: 'Carding',
  combing: 'Combing',
  comber: 'Combing',
  drawing: 'Drawing',
  'draw frame': 'Drawing',
  roving: 'Roving',
  'speed frame': 'Roving',
  'ring spinning': 'Ring Spinning',
  'ring frame': 'Ring Spinning',
  ringframe: 'Ring Spinning',
  'open end': 'Open End',
  oe: 'Open End',
  autocoro: 'Open End',
  winding: 'Winding',
  autoconer: 'Winding',
  winder: 'Winding',
  tfo: 'TFO',
  doubling: 'TFO',
  twisting: 'TFO',
  gassing: 'Gassing',
  singeing: 'Gassing',
  weaving: 'Weaving',
  loom: 'Weaving',
}

const PLAN_WORDS = ['plan', 'project plan', 'how long', 'timeline', 'schedule', 'steps', 'roadmap', 'eta', 'when will', 'duration', 'take']
const PEOPLE_WORDS = ['who', 'engineer', 'technician', 'assign', 'team', 'expert', 'specialist', 'responsible']
const HISTORY_WORDS = ['before', 'previously', 'past', 'history', 'historical', 'last time', 'earlier', 'again', 'recurring', 'repeat', 'similar']
const PROBLEM_WORDS = [
  'why', 'issue', 'problem', 'fault', 'fail', 'failed', 'failing', 'down', 'drop', 'dropped',
  'fall', 'fell', 'low', 'high', 'delay', 'delayed', 'late', 'risk', 'stuck', 'wrong',
  'deviation', 'breakdown', 'reject', 'complaint', 'shortfall', 'overdue', 'resolve', 'fix',
  'trouble', 'not working', 'spike', 'abnormal',
]

function includesAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w))
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%/\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
}

function pushEntity(list: AiEntity[], entity: AiEntity) {
  if (!list.some((e) => e.type === entity.type && e.value === entity.value)) list.push(entity)
}

function extractEntities(raw: string, lower: string, ctx: AiDataContext): AiEntity[] {
  const entities: AiEntity[] = []

  // Machine codes: RF-021, AW-003, TF-002 ...
  const machineMatches = raw.toUpperCase().match(/\b(BR|CD|CB|DF|SF|RF|OE|AW|TF|GS|LM)-?\s?\d{1,3}\b/g) ?? []
  for (const match of machineMatches) {
    const digits = match.replace(/\D/g, '')
    const prefix = match.slice(0, 2)
    const code = `${prefix}-${digits.padStart(3, '0')}`
    const machine = ctx.machines.find((m) => m.code === code)
    if (machine) pushEntity(entities, { type: 'machine', value: machine.code, label: machine.code })
  }

  // Sales orders: SO-291
  for (const match of raw.toUpperCase().match(/\bSO-?\s?\d{2,5}\b/g) ?? []) {
    const num = match.replace(/\D/g, '')
    const order = ctx.salesOrders.find((o) => o.orderNo === `SO-${num}`)
    if (order) pushEntity(entities, { type: 'order', value: order.orderNo, label: order.orderNo })
  }

  // Production orders: PO-1042
  for (const match of raw.toUpperCase().match(/\bPO-?\s?\d{2,6}\b/g) ?? []) {
    const num = match.replace(/\D/g, '')
    const po = ctx.productionOrders.find((p) => p.orderNo.endsWith(num))
    if (po) pushEntity(entities, { type: 'productionOrder', value: po.orderNo, label: po.orderNo })
  }

  // Cotton lots: CL-2026-0007
  for (const match of raw.toUpperCase().match(/\bCL-\d{4}-\d{1,4}\b/g) ?? []) {
    const lot = ctx.cottonLots.find((l) => l.lotNumber === match)
    if (lot) pushEntity(entities, { type: 'cottonLot', value: lot.lotNumber, label: lot.lotNumber })
  }

  // Processes
  for (const [alias, process] of Object.entries(PROCESS_ALIASES)) {
    if (lower.includes(alias)) pushEntity(entities, { type: 'process', value: process, label: process })
  }

  // Units / factories
  for (const factory of ctx.factories) {
    const short = factory.shortName.toLowerCase()
    if (lower.includes(factory.name.toLowerCase()) || new RegExp(`\\b${short}\\b`).test(lower)) {
      pushEntity(entities, { type: 'factory', value: factory.id, label: factory.name })
    }
  }
  if (/\bmill\s*(i{1,3}|1|2|3)\b/.test(lower)) {
    const roman = lower.match(/\bmill\s*(i{1,3}|1|2|3)\b/)?.[1] ?? ''
    const index = { i: 1, ii: 2, iii: 3, '1': 1, '2': 2, '3': 3 }[roman]
    const factory = ctx.factories[(index ?? 1) - 1]
    if (factory) pushEntity(entities, { type: 'factory', value: factory.id, label: factory.name })
  }

  // Counts: 40s, 2/60s, 120s
  for (const match of lower.match(/\b\d{1,3}\/?\d{0,3}s\b/g) ?? []) {
    const product = ctx.products.find((p) => p.count?.toLowerCase() === match)
    pushEntity(entities, {
      type: 'product',
      value: product?.id ?? match,
      label: product ? product.name : `${match} count`,
    })
  }

  // Customers and countries
  for (const customer of ctx.customers) {
    const first = customer.name.split(' ')[0].toLowerCase()
    if (first.length > 4 && lower.includes(first)) {
      pushEntity(entities, { type: 'customer', value: customer.id, label: customer.name })
    }
  }
  for (const country of [...new Set(ctx.customers.map((c) => c.country))]) {
    if (lower.includes(country.toLowerCase())) {
      pushEntity(entities, { type: 'country', value: country, label: country })
    }
  }

  // Engineers by name
  for (const engineer of ctx.engineers) {
    const surname = engineer.name.split(' ').pop()?.toLowerCase() ?? ''
    if (surname.length > 4 && lower.includes(surname)) {
      pushEntity(entities, { type: 'engineer', value: engineer.id, label: engineer.name })
    }
  }

  // Periods
  const periods: Array<[RegExp, string]> = [
    [/\btoday\b/, 'Today'],
    [/\byesterday\b/, 'Yesterday'],
    [/\bthis week\b|\bpast week\b|\blast 7 days\b/, 'This week'],
    [/\blast week\b/, 'Last week'],
    [/\bthis month\b/, 'This month'],
    [/\blast month\b/, 'Last month'],
    [/\bthis quarter\b/, 'This quarter'],
    [/\blast year\b|\bprevious year\b/, 'Last year'],
  ]
  for (const [pattern, label] of periods) {
    if (pattern.test(lower)) pushEntity(entities, { type: 'period', value: label, label })
  }

  return entities
}

function scoreTopics(tokens: string[], lower: string): Array<{ topic: AiTopic; score: number }> {
  return (Object.keys(TOPIC_VOCAB) as AiTopic[])
    .map((topic) => {
      const vocab = TOPIC_VOCAB[topic]
      let score = 0
      for (const token of tokens) {
        if (vocab.includes(token)) score += 2
        else if (vocab.some((v) => v.length > 4 && token.startsWith(v.slice(0, 4)))) score += 0.5
      }
      // Multi-word phrases carry more weight than single tokens.
      for (const phrase of vocab.filter((v) => v.includes(' '))) {
        if (lower.includes(phrase)) score += 3
      }
      return { topic, score }
    })
    .sort((a, b) => b.score - a.score)
}

function pickIntent(lower: string, isProblem: boolean, wantsPlan: boolean, wantsPeople: boolean): AiIntent {
  if (wantsPeople && !isProblem) return 'recommend'
  if (wantsPlan) return 'plan'
  if (/\bforecast\b|\bpredict\b|\bwill\b|\bexpect\b|\bnext week\b|\bnext month\b|\bprojection\b/.test(lower)) {
    return 'forecast'
  }
  if (/\bcompare\b|\bversus\b|\bvs\b|\bbetter\b|\bworse\b|\bbetween\b/.test(lower)) return 'compare'
  if (isProblem) return 'diagnose'
  if (/\bsummar|overview\b|\bbrief\b|\bstatus\b|\bhow are we\b|\bhow is\b/.test(lower)) return 'summarise'
  return 'lookup'
}

export function parseQuestion(raw: string, ctx: AiDataContext): ParsedQuestion {
  const lower = raw.toLowerCase().trim()
  const tokens = tokenise(raw)
  const entities = extractEntities(raw, lower, ctx)

  const scored = scoreTopics(tokens, lower)
  let topic = scored[0].score > 0 ? scored[0].topic : 'general'
  const secondaryTopic = scored[1]?.score > 1 ? scored[1].topic : undefined

  // Entities are strong evidence and can override a weak vocabulary score.
  const hasMachine = entities.some((e) => e.type === 'machine')
  const hasOrder = entities.some((e) => e.type === 'order')
  if (scored[0].score <= 2) {
    if (hasMachine) topic = 'breakdown'
    else if (hasOrder) topic = 'orderDelay'
  }

  const isProblem = includesAny(lower, PROBLEM_WORDS)
  const wantsPlan = includesAny(lower, PLAN_WORDS) || isProblem
  const wantsPeople = includesAny(lower, PEOPLE_WORDS) || isProblem
  const wantsHistory = includesAny(lower, HISTORY_WORDS) || isProblem

  const clarity = Math.min(
    1,
    0.35 + Math.min(scored[0].score, 8) / 16 + entities.length * 0.08 + (tokens.length > 3 ? 0.1 : 0),
  )

  return {
    raw: raw.trim(),
    normalised: lower,
    tokens,
    topic,
    secondaryTopic,
    intent: pickIntent(lower, isProblem, wantsPlan, wantsPeople),
    entities,
    clarity,
    isProblem,
    wantsPlan,
    wantsPeople,
    wantsHistory,
  }
}

/**
 * Folds extra search terms - taken from the live record rather than the user's
 * wording - into a parsed question, so knowledge-base retrieval searches for
 * the cause actually being diagnosed and not only for what was typed.
 */
export function withRetrievalHints(parsed: ParsedQuestion, hints: string[]): ParsedQuestion {
  if (hints.length === 0) return parsed
  const extra = hints.flatMap((hint) => tokenise(hint))
  if (extra.length === 0) return parsed
  return { ...parsed, tokens: [...new Set([...parsed.tokens, ...extra])] }
}

export { PROCESS_NAMES }
