/**
 * Retrieval and ranking.
 *
 * Cases are scored against the question with a lexical overlap model plus
 * structural bonuses (same topic, same process, same machine, same unit) and a
 * mild recency prior - a stand-in for the embedding search a real deployment
 * would run. Engineers are then ranked on how much of the retrieved evidence
 * they personally closed, on top of a skills and availability fit.
 */
import type { AiEngineer, AiEngineerMatch, AiHistoricalCase, AiIncident, AiTopic } from '@/types'
import type { AiDataContext } from './context'
import { factoryLabel } from './context'
import type { ParsedQuestion } from './nlu'

const WORD_SPLIT = /[^a-z0-9%]+/

function bagOfWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(WORD_SPLIT)
      .filter((w) => w.length > 2),
  )
}

function daysSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000))
}

interface ScoredIncident {
  incident: AiIncident
  score: number
}

function scoreIncident(incident: AiIncident, parsed: ParsedQuestion): number {
  const haystack = bagOfWords(
    [
      incident.title,
      incident.symptom,
      incident.category,
      incident.rootCause,
      incident.tags.join(' '),
      incident.contributingFactors.join(' '),
      incident.process ?? '',
    ].join(' '),
  )

  let score = 0
  for (const token of parsed.tokens) {
    if (haystack.has(token)) score += 3
    else if ([...haystack].some((w) => w.startsWith(token.slice(0, 4)) && token.length > 3)) score += 1
  }

  if (incident.topic === parsed.topic) score += 8
  if (parsed.secondaryTopic && incident.topic === parsed.secondaryTopic) score += 3

  for (const entity of parsed.entities) {
    if (entity.type === 'process' && incident.process === entity.value) score += 7
    if (entity.type === 'machine' && incident.machineCode === entity.value) score += 10
    if (entity.type === 'factory' && incident.factoryId === entity.value) score += 4
  }

  // Recent cases are more representative of how the plant runs today.
  const age = daysSince(incident.occurredAt)
  score += Math.max(0, 4 - age / 180)

  // A signature that keeps coming back matters more.
  score += Math.min(incident.recurrence, 4) * 0.6

  return score
}

/** Raw scored retrieval, used by both the case list and engineer ranking. */
export function retrieveIncidents(
  parsed: ParsedQuestion,
  ctx: AiDataContext,
  limit = 3,
): ScoredIncident[] {
  const scored = ctx.incidents
    .map((incident) => ({ incident, score: scoreIncident(incident, parsed) }))
    .filter((s) => s.score > 4)
    .sort((a, b) => b.score - a.score)

  // Prefer distinct failure signatures over three rows of the same one.
  const seen = new Set<string>()
  const distinct: ScoredIncident[] = []
  for (const entry of scored) {
    const signature = entry.incident.title
    if (seen.has(signature)) continue
    seen.add(signature)
    distinct.push(entry)
    if (distinct.length >= limit) break
  }

  // If nothing distinct cleared the bar, fall back to topic-matched cases.
  if (distinct.length === 0) {
    const byTopic = ctx.incidents
      .filter((i) => i.topic === parsed.topic)
      .slice(0, limit)
      .map((incident) => ({ incident, score: 6 }))
    return byTopic
  }

  return distinct
}

/** Map a retrieval hit onto the shape the answer card renders. */
export function toHistoricalCase(
  entry: ScoredIncident,
  ctx: AiDataContext,
  topScore: number,
): AiHistoricalCase {
  const { incident, score } = entry
  // Normalise into a believable similarity band rather than a raw score.
  const ratio = topScore > 0 ? score / topScore : 1
  const similarityPct = Math.round(Math.min(97, Math.max(56, 58 + ratio * 38)))

  const resolvedBy = incident.resolvedByIds
    .map((id) => ctx.engineers.find((e) => e.id === id))
    .filter((e): e is AiEngineer => Boolean(e))
    .map((e) => ({ id: e.id, name: e.name, role: e.role }))

  return {
    incidentId: incident.id,
    refNo: incident.refNo,
    title: incident.title,
    occurredAt: incident.occurredAt,
    machineCode: incident.machineCode,
    factoryLabel: factoryLabel(ctx, incident.factoryId),
    similarityPct,
    rootCause: incident.rootCause,
    resolutionSteps: incident.resolutionSteps,
    downtimeHrs: incident.downtimeHrs,
    costInr: incident.costInr,
    resolvedBy,
    preventiveAction: incident.preventiveAction,
    outcome: incident.outcome,
    recurrence: incident.recurrence,
  }
}

export function retrieveCases(parsed: ParsedQuestion, ctx: AiDataContext, limit = 3): AiHistoricalCase[] {
  const hits = retrieveIncidents(parsed, ctx, limit)
  const top = hits[0]?.score ?? 1
  return hits.map((hit) => toHistoricalCase(hit, ctx, top))
}

/* --------------------------------------------------------------- engineers */

const DEPARTMENT_BY_TOPIC: Record<AiTopic, AiEngineer['department'][]> = {
  breakdown: ['Maintenance', 'Production'],
  quality: ['Quality', 'Production'],
  orderDelay: ['Planning', 'Production'],
  production: ['Production', 'Maintenance'],
  energy: ['Utilities', 'Maintenance'],
  inventory: ['Maintenance', 'Planning'],
  procurement: ['Quality', 'Planning'],
  capacity: ['Planning', 'Production'],
  cost: ['Planning', 'Utilities'],
  people: ['Maintenance', 'Production'],
  general: ['Maintenance', 'Production', 'Quality'],
}

const AVAILABILITY_WEIGHT: Record<AiEngineer['availability'], number> = {
  Available: 10,
  'On shift': 7,
  'On another job': 3,
  'Off shift': 1,
  'On leave': -6,
}

interface RankOptions {
  /** Incidents already retrieved for this question - counted as direct experience. */
  cases: AiHistoricalCase[]
  limit?: number
}

export function rankEngineers(
  parsed: ParsedQuestion,
  ctx: AiDataContext,
  { cases, limit = 3 }: RankOptions,
): AiEngineerMatch[] {
  const preferredDepts = DEPARTMENT_BY_TOPIC[parsed.topic] ?? ['Maintenance']
  const processEntities = parsed.entities.filter((e) => e.type === 'process').map((e) => e.value)
  const factoryEntities = parsed.entities.filter((e) => e.type === 'factory').map((e) => e.value)
  const machineEntity = parsed.entities.find((e) => e.type === 'machine')
  const machine = machineEntity ? ctx.machines.find((m) => m.code === machineEntity.value) : undefined
  const targetProcesses = [...new Set([...processEntities, ...(machine ? [machine.process] : [])])]
  const targetFactories = [...new Set([...factoryEntities, ...(machine ? [machine.factoryId] : [])])]

  // Direct credit for closing the very cases we just retrieved.
  const caseCredit = new Map<string, number>()
  cases.forEach((c, index) => {
    const weight = 14 - index * 3
    for (const person of c.resolvedBy) {
      caseCredit.set(person.id, (caseCredit.get(person.id) ?? 0) + weight)
    }
  })

  const scored = ctx.engineers.map((engineer) => {
    let score = 0
    const reasons: string[] = []

    const credit = caseCredit.get(engineer.id) ?? 0
    if (credit > 0) {
      score += credit
      const fixes = cases.filter((c) => c.resolvedBy.some((p) => p.id === engineer.id)).length
      reasons.push(`closed ${fixes} of the ${cases.length} matching historical case${cases.length === 1 ? '' : 's'}`)
    }

    const deptIndex = preferredDepts.indexOf(engineer.department)
    if (deptIndex === 0) score += 8
    else if (deptIndex > 0) score += 4

    if (targetProcesses.length) {
      const overlap = engineer.specialities.filter((s) => targetProcesses.includes(s))
      if (overlap.length) {
        score += 9
        reasons.push(`speciality in ${overlap.join(' and ')}`)
      }
    }

    if (targetFactories.length && targetFactories.includes(engineer.factoryId)) {
      score += 5
      reasons.push('based in the affected unit')
    }

    // Skill text overlap with the question wording.
    const skillBag = bagOfWords(engineer.skills.join(' ') + ' ' + engineer.specialities.join(' '))
    const skillHits = parsed.tokens.filter((t) => skillBag.has(t)).length
    if (skillHits > 0) {
      score += skillHits * 3
      reasons.push('skills match the reported symptom')
    }

    score += AVAILABILITY_WEIGHT[engineer.availability]
    score += engineer.firstTimeFixPct / 12
    score += Math.min(engineer.incidentsResolved, 300) / 40
    score -= engineer.avgMttrHrs / 6

    if (reasons.length === 0) {
      reasons.push(`${engineer.yearsExperience} years on ${engineer.specialities.slice(0, 2).join(' and ')}`)
    }

    return { engineer, score, reasons }
  })

  const ranked = scored.sort((a, b) => b.score - a.score).slice(0, limit)
  const top = ranked[0]?.score ?? 1

  return ranked.map(({ engineer, score, reasons }) => ({
    engineerId: engineer.id,
    name: engineer.name,
    initials: engineer.initials,
    role: engineer.role,
    factoryLabel: factoryLabel(ctx, engineer.factoryId),
    shift: engineer.shift === 'General' ? 'General shift' : `Shift ${engineer.shift}`,
    matchPct: Math.round(Math.min(98, Math.max(62, 64 + (score / Math.max(top, 1)) * 34))),
    reason: reasons.slice(0, 2).join('; '),
    pastFixes: engineer.incidentsResolved,
    avgMttrHrs: engineer.avgMttrHrs,
    firstTimeFixPct: engineer.firstTimeFixPct,
    avgResponseMins: engineer.avgResponseMins,
    availability: engineer.availability,
    skills: engineer.skills.slice(0, 3),
    contact: engineer.contact,
  }))
}
