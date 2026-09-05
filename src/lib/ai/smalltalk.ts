/**
 * Conversational turns — greetings, thanks, "who are you", goodbyes.
 *
 * A "hi" is not a plant question, and running it through topic scoring and
 * case retrieval produces a ranked-cause card for a problem nobody described.
 * These turns are answered the way a real assistant would: greet back, say
 * what is happening on the floor right now so the reply is still grounded,
 * and offer somewhere to go next.
 *
 * Classification is deliberately strict — only a message that is *entirely*
 * small talk qualifies. "Good morning, why is RF-021 down?" is a real question
 * with a greeting attached, so the greeting is stripped and the question is
 * answered normally.
 */
import type { AiAnswer, AiBlock, AiMetric } from '@/types'
import { formatKg, formatNumber, formatPct } from '@/lib/format'
import type { AiDataContext } from './context'

export type SmallTalkKind = 'greeting' | 'howAreYou' | 'identity' | 'capabilities' | 'thanks' | 'farewell'

/** Anchored so only a whole message of small talk matches. */
const PATTERNS: { kind: SmallTalkKind; re: RegExp }[] = [
  { kind: 'howAreYou', re: /^(how are (you|things|we doing)|how('s| is) it going|how do you do|you (ok|okay|good|there|alright)|what('s| is) up|sup)$/ },
  { kind: 'identity', re: /^(who|what) (are|r) (you|u)( again)?$|^what('s| is) your name$|^introduce yourself$|^(are|r) (you|u) (an? )?(ai|bot|robot|human|real)$/ },
  { kind: 'capabilities', re: /^(what can (you|u) do|what do you do|how can (you|u) help( me)?|can (you|u) help( me)?|help|what (can|should) i ask( you)?|show me what you can do|options|capabilities)$/ },
  { kind: 'thanks', re: /^(thanks|thank you|thankyou|thx|ty|cheers|nice|great|cool|awesome|perfect|got it|understood|ok|okay|k)( (a lot|so much|man|mate|buddy))?$/ },
  { kind: 'farewell', re: /^(bye|goodbye|good bye|see (you|ya)( later)?|later|catch you later|good night|goodnight|signing off|that(')?s all|that will be all)$/ },
  { kind: 'greeting', re: /^(hi|hii+|hey+|heyy+|hello+|helo|yo|hiya|howdy|greetings|namaste|namaskar|vanakkam|vannakam|salaam|hola|bonjour|good (morning|afternoon|evening|day)|morning|evening)( (there|copilot|ai|bot|team|all|everyone))?$/ },
]

/** Strips the wrapping a chat message usually carries — punctuation, emoji, filler. */
function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[!?.,;:~*"()\-—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Returns the kind of small talk a message is, or null when it carries a real
 * question. Anything longer than a short phrase is a question by definition.
 */
export function classifySmallTalk(raw: string): SmallTalkKind | null {
  const text = normalise(raw)
  if (!text || text.split(' ').length > 6) return null
  return PATTERNS.find((p) => p.re.test(text))?.kind ?? null
}

const GREETING_PREFIX =
  /^\s*(hi+|hey+|hello+|yo|hiya|howdy|greetings|namaste|namaskar|vanakkam|hola|good (morning|afternoon|evening|day))\b[\s,!.-]*/i

/**
 * "Good morning, why is RF-021 down?" is a question, not a greeting — the
 * pleasantry is dropped so topic scoring sees only the substance.
 */
export function stripGreetingPrefix(raw: string): string {
  const stripped = raw.replace(GREETING_PREFIX, '').trim()
  return stripped.length >= 3 ? stripped : raw
}

/**
 * Mirrors the user's own greeting when they used one - answering "good
 * morning" with "good afternoon" because of the server clock is the kind of
 * tin ear that gives an assistant away. Falls back to the wall clock.
 */
function timeGreeting(raw = ''): string {
  const said = /good (morning|afternoon|evening)/i.exec(raw)?.[1]?.toLowerCase()
  if (said) return `Good ${said}`
  if (/^\s*morning/i.test(raw)) return 'Good morning'
  if (/^\s*evening/i.test(raw)) return 'Good evening'

  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** The one-line floor status every conversational reply is grounded in. */
function pulse(ctx: AiDataContext) {
  const cutoff = Date.now() - 7 * 86400000
  const recent = ctx.productionRecords.filter((r) => new Date(r.date).getTime() >= cutoff)
  const actual = recent.reduce((s, r) => s + r.actualKg, 0)
  const target = recent.reduce((s, r) => s + r.targetKg, 0)

  return {
    running: ctx.machines.filter((m) => m.status === 'Running').length,
    total: ctx.machines.length,
    down: ctx.machines.filter((m) => m.status === 'Breakdown'),
    atRisk: ctx.salesOrders.filter((o) => o.risk === 'atRisk' || o.risk === 'delayed'),
    critical: ctx.alerts.filter((a) => a.severity === 'critical' && !a.acknowledged),
    outputKg: actual,
    achievementPct: target ? (actual / target) * 100 : 0,
    records: recent.length,
  }
}

/** Follow-ups that name what is actually wrong today, not canned examples. */
function liveFollowUps(ctx: AiDataContext): string[] {
  const p = pulse(ctx)
  const prompts: string[] = []

  if (p.down.length > 0) prompts.push(`Why is ${p.down[0].code} down and how long to fix it?`)
  if (p.atRisk.length > 0) prompts.push(`Which orders are at risk, starting with ${p.atRisk[0].orderNo}?`)
  if (p.achievementPct < 100) prompts.push('Why did production fall short this week?')
  prompts.push('Give me the plant position right now')

  return prompts.slice(0, 3)
}

function pulseMetrics(ctx: AiDataContext): AiMetric[] {
  const p = pulse(ctx)
  return [
    { label: 'Machines running', value: `${formatNumber(p.running)} / ${formatNumber(p.total)}`, tone: p.down.length ? 'warning' : 'success' },
    { label: 'Output (7d)', value: formatKg(p.outputKg) },
    { label: 'Achievement', value: formatPct(p.achievementPct), tone: p.achievementPct >= 100 ? 'success' : 'warning' },
    { label: 'Orders at risk', value: formatNumber(p.atRisk.length), tone: p.atRisk.length ? 'warning' : 'success' },
  ]
}

const CAPABILITY_BULLETS = [
  'Diagnose a problem — name a machine, order, lot or process and I rank the probable causes against the live record.',
  'Pull the history — the comparable cases we have closed before, what actually fixed them, and how long each took.',
  'Nominate the people — the engineers who resolved this kind of fault, with their first-time-fix rate and availability.',
  'Build the plan — phased tasks, owners, critical path and a realistic ETA you can commit to a customer.',
]

/**
 * Builds the conversational reply. Marked `kind: 'chat'` so the answer card
 * drops the confidence badge and retrieval trace — telemetry on a hello reads
 * as a machine, not an assistant.
 */
export function composeSmallTalkAnswer(
  kind: SmallTalkKind,
  question: string,
  ctx: AiDataContext,
): AiAnswer {
  const p = pulse(ctx)
  const blocks: AiBlock[] = []
  const name = ctx.user.firstName

  // What the floor looks like, phrased the way a shift-in-charge would say it.
  const floorLine = [
    `${formatNumber(p.running)} of ${formatNumber(p.total)} machines are running`,
    p.down.length
      ? `${formatNumber(p.down.length)} down (${p.down.slice(0, 2).map((m) => m.code).join(', ')}${
          p.down.length > 2 ? ` and ${formatNumber(p.down.length - 2)} more` : ''
        })`
      : 'nothing on breakdown',
    p.atRisk.length ? `${formatNumber(p.atRisk.length)} orders at risk` : 'the order book is clean',
    `${formatPct(ctx.qualityPassRatePct)} lab pass rate`,
  ].join(', ')

  let headline: string
  let summary: string

  switch (kind) {
    case 'greeting': {
      const greeting = timeGreeting(question)
      headline = `${greeting}, ${name}`
      summary = `${greeting}, ${name}. I have the live plant record open: ${floorLine}. Tell me what you are chasing — a machine, an order, a lot, a customer complaint — and I will work it through from cause to plan.`
      blocks.push({ kind: 'metrics', title: 'Where the plant stands right now', items: pulseMetrics(ctx) })
      break
    }

    case 'howAreYou':
      headline = 'Running clean, and so is most of the floor'
      summary = `All good on my side, ${name} — reading ${formatNumber(p.records)} production records, ${formatNumber(ctx.machines.length)} machines and ${formatNumber(ctx.incidents.length)} closed cases. On the floor: ${floorLine}.${
        p.critical.length ? ` ${formatNumber(p.critical.length)} critical alerts are still unacknowledged — worth a look.` : ' No critical alerts open.'
      }`
      blocks.push({ kind: 'metrics', title: 'Where the plant stands right now', items: pulseMetrics(ctx) })
      break

    case 'identity':
      headline = 'I am the T-Mills Copilot'
      summary = `I am the plant copilot for Thiagarajar Mills — an assistant wired into the live record across all ${formatNumber(ctx.factories.length)} units: machines, production, lab tests, cotton lots, orders, energy and ${formatNumber(ctx.incidents.length)} closed engineering cases. Every number I quote comes from those records, and I will show you where each one came from.`
      blocks.push({ kind: 'bullets', title: 'What that means in practice', items: CAPABILITY_BULLETS })
      break

    case 'capabilities':
      headline = 'Here is what I can take off your hands'
      summary = `Describe a problem in plain words — "RF-021 keeps stopping", "SO-291 is going to be late", "yarn strength dropped on Unit 3" — and I will work it end to end. Right now: ${floorLine}.`
      blocks.push({ kind: 'bullets', title: 'What I can do', items: CAPABILITY_BULLETS })
      break

    case 'thanks':
      headline = `Any time, ${name}`
      summary = `Happy to help, ${name}. I will keep watching the record — ${floorLine}. Come back whenever something moves.`
      break

    case 'farewell':
      headline = `See you, ${name}`
      summary = `Signing off, ${name}. If anything changes on the floor it will be waiting for you here: ${floorLine}.`
      break
  }

  return {
    id: `ans-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'chat',
    question: question.trim(),
    intent: 'summarise',
    topic: 'general',
    entities: [],
    headline,
    summary,
    confidencePct: 100,
    blocks,
    sources: [],
    followUps: kind === 'farewell' ? [] : liveFollowUps(ctx),
    reasoningSteps: ['Read the message as a conversational turn, not a plant question', 'Pulled the current floor position to answer in context'],
    modelLabel: '',
    latencyMs: 0,
    tokensUsed: 0,
    groundedRecords: p.records + ctx.machines.length,
  }
}
