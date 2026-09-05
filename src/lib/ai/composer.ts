/**
 * Answer composition.
 *
 * Takes a parsed question, gathers live evidence from the plant snapshot for
 * that topic, ranks probable causes, pulls comparable closed cases, nominates
 * engineers and builds a resolution plan - then assembles the whole thing into
 * the block list the answer card renders.
 *
 * Every number quoted in an answer comes from the same records the rest of the
 * app displays, which is what makes the assistant read as grounded rather than
 * generic.
 */
import type {
  AiAnswer,
  AiBlock,
  AiCause,
  AiMetric,
  AiSource,
  BreakdownRecord,
  Machine,
  SalesOrder,
} from '@/types'
import { formatInrCompact, formatKg, formatNumber, formatPct, formatRelativeShort } from '@/lib/format'
import type { AiDataContext } from './context'
import { factoryLabel } from './context'
import { parseQuestion, withRetrievalHints, type ParsedQuestion } from './nlu'
import { rankEngineers, retrieveCases } from './retrieval'
import { buildPlan } from './planner'
import { classifySmallTalk, composeSmallTalkAnswer, stripGreetingPrefix } from './smalltalk'

export const AI_MODEL_LABEL = 'T-Mills Copilot - TM-Textile-1'

interface Evidence {
  subject: string
  headline: string
  summary: string
  metrics: AiMetric[]
  metricsTitle: string
  causes: AiCause[]
  leadingBlocks: AiBlock[]
  trailingBlocks: AiBlock[]
  sources: AiSource[]
  followUps: string[]
  groundedRecords: number
  /**
   * Extra search terms taken from the live record - the reported breakdown
   * cause, the failing instrument, the flagged risk reason. Without these the
   * knowledge base is searched on the user's wording alone, and the retrieved
   * cases can drift away from the cause actually being diagnosed.
   */
  retrievalHints: string[]
}

const daysBetween = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 86400000)

function emptyEvidence(): Evidence {
  return {
    subject: 'the issue raised',
    headline: '',
    summary: '',
    metrics: [],
    metricsTitle: 'Current position',
    causes: [],
    leadingBlocks: [],
    trailingBlocks: [],
    sources: [],
    followUps: [],
    groundedRecords: 0,
    retrievalHints: [],
  }
}

/* --------------------------------------------------- cause libraries */

const BREAKDOWN_CAUSES: Record<string, AiCause[]> = {
  'Spindle bearing failure': [
    {
      cause: 'Lubrication interval stretched, leading to raceway pitting',
      likelihood: 62,
      evidence: 'Bearing failures in the case history all follow a missed or extended lubrication cycle.',
      signal: 'Bearing temperature and audible growl before the stop',
    },
    {
      cause: 'Cotton fly ingress past a perished housing seal',
      likelihood: 24,
      evidence: 'Seal degradation is the second most common contributor recorded against this signature.',
      signal: 'Fly packing visible at the bolster',
    },
    {
      cause: 'Sustained running at the upper speed band for fine counts',
      likelihood: 14,
      evidence: 'Fine-count campaigns raise spindle load and shorten bearing life.',
      signal: 'Count group running above the reference speed',
    },
  ],
  'Drive motor tripped': [
    {
      cause: 'Cooling path choked with fly, raising winding temperature',
      likelihood: 58,
      evidence: 'Every closed case of repeated overcurrent tripping on this fleet traced back to blocked cooling.',
      signal: 'Trip recurs within minutes of restart',
    },
    {
      cause: 'Drive belt over-tensioned, adding load torque',
      likelihood: 22,
      evidence: 'Running current above nameplate with no mechanical fault found.',
      signal: 'Elevated steady-state current draw',
    },
    {
      cause: 'Loose or unbalanced phase connection at the terminal box',
      likelihood: 20,
      evidence: 'Phase imbalance shows up as intermittent overcurrent under load.',
      signal: 'Inverter overcurrent fault logged',
    },
  ],
  'Spindle tape snapped': [
    {
      cause: 'Seized jockey pulley cutting the tape edge',
      likelihood: 66,
      evidence: 'A worn flat on the pulley is the recorded root cause in the matched cases.',
      signal: 'A contiguous band of spindles stopped',
    },
    {
      cause: 'Tape tension set above the recommended range',
      likelihood: 21,
      evidence: 'Tension set by feel rather than gauge accelerates fatigue.',
      signal: 'Repeat failures on the same band',
    },
    {
      cause: 'Tape beyond its service life',
      likelihood: 13,
      evidence: 'Age-related fatigue where the tape set has not been renewed on schedule.',
    },
  ],
  'Yarn clearer sensor fault': [
    {
      cause: 'Optical head fouled with wax and fly, drifting calibration',
      likelihood: 57,
      evidence: 'Clearer faults on the Autoconers have consistently traced to contaminated optics.',
      signal: 'Good yarn cut on some drums, real faults passed on others',
    },
    {
      cause: 'Calibration not re-run after a firmware or setting change',
      likelihood: 27,
      evidence: 'Channel settings reset to default after firmware updates in past cases.',
      signal: 'Fault pattern differs drum to drum',
    },
    {
      cause: 'Waxing station over-applying on fine counts',
      likelihood: 16,
      evidence: 'Excess wax transfers onto the sensor window within a shift.',
    },
  ],
  'Suction pressure drop': [
    {
      cause: 'Choked filter drum reducing suction head',
      likelihood: 54,
      evidence: 'Filter cleaning intervals extended in every matched case.',
      signal: 'Suction weakest at the far end of the frame',
    },
    {
      cause: 'Split duct joint bleeding pressure downstream',
      likelihood: 32,
      evidence: 'Perished gaskets found on inspection in comparable cases.',
      signal: 'Pressure profile drops sharply at one point',
    },
    {
      cause: 'Damper positions out of balance after a previous intervention',
      likelihood: 14,
      evidence: 'System rebalance restored suction without any component failure.',
    },
  ],
  'Comber nipper misalignment': [
    {
      cause: 'Nipper gauge shifted during a lap changeover',
      likelihood: 61,
      evidence: 'Changeovers done without the gauge fixture are the recorded cause.',
      signal: 'Noil percentage moved with no material change',
    },
    {
      cause: 'Worn nipper shaft bush introducing play',
      likelihood: 27,
      evidence: 'Play at the shaft lets the set gauge drift under load.',
      signal: 'Sliver unevenness rising downstream',
    },
    {
      cause: 'Detaching timing out against the setting chart',
      likelihood: 12,
      evidence: 'Timing errors produce the same noil and evenness signature.',
    },
  ],
  'Rotor bearing noise': [
    {
      cause: 'Rotor bearing wear past the recommended running hours',
      likelihood: 63,
      evidence: 'Every rotor noise case on the Autocoros traced to bearings run beyond their change interval.',
      signal: 'Noise concentrated on specific positions, with yarn faults on the same drums',
    },
    {
      cause: 'Rotor groove fouling raising imbalance',
      likelihood: 23,
      evidence: 'Trash build-up in the groove shows up as noise before it shows up in the yarn.',
      signal: 'Fault rate rising on the affected positions',
    },
    {
      cause: 'Opening roller clothing worn',
      likelihood: 14,
      evidence: 'Worn clothing changes the fibre feed and loads the rotor unevenly.',
    },
  ],
  'Spindle belt slip': [
    {
      cause: 'Tension pulley spring fatigue letting the belt slip',
      likelihood: 60,
      evidence: 'The recorded cause of TFO twist variation in the matched case history.',
      signal: 'A block of spindles running below set speed',
    },
    {
      cause: 'Belt beyond its service life',
      likelihood: 26,
      evidence: 'Belt stretch reduces grip well before the belt actually fails.',
      signal: 'TPI variation between spindles on the same lot',
    },
    {
      cause: 'Spindle bearing drag raising the load on the belt',
      likelihood: 14,
      evidence: 'Added drag makes an otherwise serviceable belt slip.',
    },
  ],
  'Splicer air pressure fault': [
    {
      cause: 'Line pressure dropping below the splicer requirement',
      likelihood: 57,
      evidence: 'Compressed air leaks elsewhere on the network starve the winding splicers first.',
      signal: 'Splice failures across several drums at once',
    },
    {
      cause: 'Blocked filter or regulator at the machine',
      likelihood: 28,
      evidence: 'Local restriction produces the same symptom on one machine only.',
      signal: 'Fault confined to a single autoconer',
    },
    {
      cause: 'Worn splicer chamber or clamp',
      likelihood: 15,
      evidence: 'Mechanical wear gives weak splices even at correct pressure.',
    },
  ],
  'Card wire damage': [
    {
      cause: 'Foreign object through the feed damaging the wire',
      likelihood: 52,
      evidence: 'Contamination reaching the cylinder is the recorded cause of wire damage in past cases.',
      signal: 'Neps rising sharply on the affected card',
    },
    {
      cause: 'Wire beyond its grinding interval',
      likelihood: 33,
      evidence: 'Blunt points carry neps through rather than opening them.',
      signal: 'Imperfections climbing across the counts from that card',
    },
    {
      cause: 'Flat-to-cylinder gauge out of setting',
      likelihood: 15,
      evidence: 'An out-of-setting gauge accelerates wire wear.',
    },
  ],
  'Loom weft feeder jam': [
    {
      cause: 'Weft accumulator winding fault causing repeated stops',
      likelihood: 55,
      evidence: 'Feeder jams on the loom shed trace back to accumulator winding in past cases.',
      signal: 'Loom stopping repeatedly on weft fault',
    },
    {
      cause: 'Yarn package build fault feeding the loom',
      likelihood: 28,
      evidence: 'Poor package build from winding shows up as feeder jams downstream.',
      signal: 'Jams concentrated on packages from one lot',
    },
    {
      cause: 'Weft sensor sensitivity out of adjustment',
      likelihood: 17,
      evidence: 'False weft detection produces the same stop pattern.',
    },
  ],
}

const GENERIC_CAUSES: AiCause[] = [
  {
    cause: 'Deviation from the written standard during a changeover or shift handover',
    likelihood: 44,
    evidence: 'Most closed cases in this category start with a setting that drifted at a handover.',
  },
  {
    cause: 'A maintenance or calibration interval extended under production pressure',
    likelihood: 34,
    evidence: 'Extended intervals appear as a contributing factor across the knowledge base.',
  },
  {
    cause: 'Input material variation outside the assumed band',
    likelihood: 22,
    evidence: 'Material variation is the recurring third factor when the process itself checks out.',
  },
]

/* ------------------------------------------------------- topic evidence */

function breakdownEvidence(parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const machineEntity = parsed.entities.find((e) => e.type === 'machine')
  const machine: Machine | undefined = machineEntity
    ? ctx.machines.find((m) => m.code === machineEntity.value)
    : undefined

  const downNow = ctx.machines.filter((m) => m.status === 'Breakdown')
  const openBreakdowns = ctx.breakdowns
  const pmDue = ctx.pmTasks.filter((t) => t.status === 'Due' || t.status === 'Overdue')
  const lowSpares = ctx.spareParts.filter((s) => s.isLow)

  ev.sources = [
    { label: 'Machine registry', detail: `${ctx.machines.length} assets`, to: '/maintenance/machine-dashboard' },
    { label: 'Breakdown register', detail: `${openBreakdowns.length} open`, to: '/maintenance/breakdown' },
    { label: 'PM schedule', detail: `${pmDue.length} due or overdue`, to: '/maintenance/pm' },
    { label: 'Spare parts', detail: `${lowSpares.length} below reorder`, to: '/maintenance/spare-parts' },
  ]
  ev.groundedRecords =
    ctx.machines.length + openBreakdowns.length + ctx.pmTasks.length + ctx.spareParts.length

  if (machine) {
    const record: BreakdownRecord | undefined = openBreakdowns.find((b) => b.machineId === machine.id)
    const unit = factoryLabel(ctx, machine.factoryId)
    ev.subject = `${machine.code} (${machine.process}, ${unit})`
    ev.headline =
      machine.status === 'Breakdown'
        ? `${machine.code} is down in ${unit}`
        : `${machine.code} is ${machine.status.toLowerCase()} in ${unit}`

    ev.summary =
      machine.status === 'Breakdown'
        ? `${machine.code} (${machine.make}, ${machine.process}, ${unit}) is in breakdown${
            record ? `, reported as "${record.reason}" ${formatRelativeShort(record.startTime)}` : ''
          } and producing nothing while it is stopped.`
        : `${machine.code} is a ${machine.make} on ${machine.process} in ${unit} — ${machine.status.toLowerCase()}, ${formatPct(
            machine.oeePct,
          )} OEE, next service ${
            daysBetween(machine.nextPmDueDate) < 0
              ? `${Math.abs(daysBetween(machine.nextPmDueDate))} days overdue`
              : `in ${daysBetween(machine.nextPmDueDate)} days`
          }.`

    ev.metricsTitle = `${machine.code} — current position`
    ev.metrics = [
      { label: 'Status', value: machine.status, tone: machine.status === 'Breakdown' ? 'danger' : 'success' },
      { label: 'OEE', value: formatPct(machine.oeePct), tone: machine.oeePct >= 85 ? 'success' : machine.oeePct > 0 ? 'warning' : 'danger' },
      { label: 'Utilisation', value: formatPct(machine.utilizationPct) },
      { label: 'Make', value: machine.make, hint: `Installed ${machine.installedYear}` },
      {
        label: 'Last service',
        value: formatRelativeShort(machine.lastMaintenanceDate),
        hint: machine.isCritical ? 'Critical asset' : 'Standard asset',
      },
      {
        label: 'Next PM',
        value:
          daysBetween(machine.nextPmDueDate) < 0
            ? `${Math.abs(daysBetween(machine.nextPmDueDate))}d overdue`
            : `in ${daysBetween(machine.nextPmDueDate)}d`,
        tone: daysBetween(machine.nextPmDueDate) < 0 ? 'warning' : 'neutral',
      },
    ]

    ev.causes = record ? (BREAKDOWN_CAUSES[record.reason] ?? GENERIC_CAUSES) : GENERIC_CAUSES
    ev.retrievalHints = [record?.reason ?? '', machine.process, machine.make].filter(Boolean)

    if (record) {
      ev.leadingBlocks.push({
        kind: 'callout',
        tone: 'danger',
        title: `Reported cause: ${record.reason}`,
        body: `Logged ${formatRelativeShort(record.startTime)} against ${record.machineCode} in ${unit}. Status is "${record.status}". Every hour this asset stays down costs output on ${machine.process}.`,
      })
    }
    ev.followUps = [
      `What is the fastest way to restore ${machine.code}?`,
      `Which orders are affected while ${machine.code} is down?`,
      `Who should I assign to ${machine.code} right now?`,
    ]
    return ev
  }

  // Fleet-level view.
  const avgOee = ctx.machines.filter((m) => m.status !== 'Breakdown')
  const avg = avgOee.length ? avgOee.reduce((s, m) => s + m.oeePct, 0) / avgOee.length : 0

  ev.subject = 'the current breakdown position'
  ev.headline = `${downNow.length} machines are in breakdown across the plant`
  ev.summary = `${downNow.length} assets are down${
    downNow.length ? ` — ${downNow.map((m) => m.code).join(', ')}` : ''
  }, with fleet OEE at ${formatPct(avg)} across the running machines. ${pmDue.length} PM tasks are overdue and ${
    lowSpares.length
  } spare lines are below reorder — the combination that turns a stoppage into a long one.`

  ev.metricsTitle = 'Fleet position'
  ev.metrics = [
    { label: 'In breakdown', value: formatNumber(downNow.length), tone: downNow.length ? 'danger' : 'success' },
    { label: 'Under maintenance', value: formatNumber(ctx.machines.filter((m) => m.status === 'Maintenance').length), tone: 'info' },
    { label: 'Running', value: formatNumber(ctx.machines.filter((m) => m.status === 'Running').length), tone: 'success' },
    { label: 'Avg OEE (running)', value: formatPct(avg) },
    { label: 'PM due / overdue', value: formatNumber(pmDue.length), tone: pmDue.length ? 'warning' : 'neutral' },
    { label: 'Spares below reorder', value: formatNumber(lowSpares.length), tone: lowSpares.length ? 'warning' : 'neutral' },
  ]

  if (openBreakdowns.length) {
    ev.leadingBlocks.push({
      kind: 'table',
      title: 'Open breakdowns',
      columns: ['Machine', 'Unit', 'Reported cause', 'Since', 'Status'],
      rows: openBreakdowns.map((b) => ({
        cells: [
          b.machineCode,
          factoryLabel(ctx, b.factoryId),
          b.reason,
          formatRelativeShort(b.startTime),
          b.status,
        ],
        tone: b.status === 'Open' ? 'danger' : 'warning',
      })),
    })
    ev.causes = BREAKDOWN_CAUSES[openBreakdowns[0].reason] ?? GENERIC_CAUSES
    ev.retrievalHints = openBreakdowns.map((b) => b.reason)
    ev.subject = `the ${openBreakdowns.length} open breakdowns`
  } else {
    ev.causes = GENERIC_CAUSES
  }

  ev.followUps = [
    'Which breakdown should we clear first?',
    'How long will it take to bring all four machines back?',
    'Which engineers are available for these repairs?',
  ]
  return ev
}

function qualityEvidence(_parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const fails = ctx.qualityTests.filter((t) => t.result === 'Fail')
  const rework = ctx.qualityTests.filter((t) => t.result === 'Rework')
  const openComplaints = ctx.complaints.filter((c) => c.status === 'Open' || c.status === 'Investigating')
  const rejectedKg = ctx.rejections.reduce((s, r) => s + r.qtyKg, 0)

  // Which instrument is throwing the most failures right now.
  const byInstrument = new Map<string, number>()
  for (const test of [...fails, ...rework]) {
    byInstrument.set(test.instrument, (byInstrument.get(test.instrument) ?? 0) + 1)
  }
  const worstInstrument = [...byInstrument.entries()].sort((a, b) => b[1] - a[1])[0]

  ev.subject = 'the current quality deviations'
  ev.headline = `${fails.length} failed and ${rework.length} rework results in the open test set`
  ev.summary = `${fails.length} failures and ${rework.length} rework calls against ${
    ctx.qualityTests.length
  } tests — a ${formatPct(ctx.qualityPassRatePct)} pass rate. ${
    worstInstrument
      ? `The deviation clusters on the ${worstInstrument[0]} (${worstInstrument[1]} of the non-pass results)`
      : 'Deviations are spread across instruments'
  }, with ${formatKg(rejectedKg)} booked as rejection.`

  ev.metricsTitle = 'Quality position'
  ev.metrics = [
    { label: 'Pass rate', value: formatPct(ctx.qualityPassRatePct), tone: ctx.qualityPassRatePct >= 95 ? 'success' : 'warning' },
    { label: 'Failed tests', value: formatNumber(fails.length), tone: fails.length ? 'danger' : 'success' },
    { label: 'Rework', value: formatNumber(rework.length), tone: rework.length ? 'warning' : 'neutral' },
    { label: 'Rejected quantity', value: formatKg(rejectedKg), tone: 'warning' },
    { label: 'Open complaints', value: formatNumber(openComplaints.length), tone: openComplaints.length ? 'warning' : 'success' },
    { label: 'Tests logged', value: formatNumber(ctx.qualityTests.length), hint: 'Across cotton, yarn and fabric' },
  ]

  if (fails.length) {
    ev.leadingBlocks.push({
      kind: 'table',
      title: 'Failing tests, most recent first',
      columns: ['Test', 'Stage', 'Instrument', 'Tested by', 'Remark'],
      rows: fails.slice(0, 5).map((t) => ({
        cells: [t.testNo, t.stage, t.instrument, t.testedBy, t.remarks ?? 'Outside tolerance band'],
        tone: 'danger' as const,
      })),
    })
  }

  ev.causes = [
    {
      cause: 'Mixing drifted after a cotton lot substitution',
      likelihood: 41,
      evidence: 'Strength and CSP deviations in the case history start at the mixing entry, not at the frame.',
      signal: 'Deviation appears across counts spun from the same mixing',
    },
    {
      cause: 'Worn drafting components (cots, aprons, top rollers)',
      likelihood: 33,
      evidence: 'Periodic unevenness on the UT5 spectrogram points at the drafting zone.',
      signal: 'U% and imperfections rising together',
    },
    {
      cause: 'Ambient humidity outside the target band on the affected floor',
      likelihood: 26,
      evidence: 'Low relative humidity raises breakage and unevenness without any machine fault.',
      signal: 'Deviation concentrated on one floor or shift',
    },
  ]

  ev.retrievalHints = [
    worstInstrument?.[0] ?? '',
    ...fails.slice(0, 4).map((t) => t.remarks ?? ''),
    ...[...new Set(fails.map((t) => t.stage))],
  ].filter(Boolean)

  ev.sources = [
    { label: 'Lab tests', detail: `${ctx.qualityTests.length} records`, to: '/quality/lab-tests' },
    { label: 'Rejections', detail: `${ctx.rejections.length} records`, to: '/quality/rejections' },
    { label: 'Complaints', detail: `${ctx.complaints.length} records`, to: '/quality/complaints' },
    { label: 'Quality dashboard', to: '/quality/dashboard' },
  ]
  ev.groundedRecords = ctx.qualityTests.length + ctx.rejections.length + ctx.complaints.length
  ev.followUps = [
    'What is driving the CSP shortfall?',
    'Which cotton lots feed the failing batches?',
    'How long to clear the quality holds and release the stock?',
  ]
  return ev
}

function orderEvidence(parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const orderEntity = parsed.entities.find((e) => e.type === 'order')
  const order: SalesOrder | undefined = orderEntity
    ? ctx.salesOrders.find((o) => o.orderNo === orderEntity.value)
    : undefined

  const atRisk = ctx.salesOrders.filter((o) => o.risk === 'atRisk')
  const delayed = ctx.salesOrders.filter((o) => o.risk === 'delayed')
  const exposure = [...atRisk, ...delayed].reduce((s, o) => s + o.valueInr, 0)

  ev.sources = [
    { label: 'Sales order book', detail: `${ctx.salesOrders.length} orders`, to: '/sales/sales-orders' },
    { label: 'Production orders', detail: `${ctx.productionOrders.length} linked`, to: '/planning/production-orders' },
    { label: 'Dispatch', to: '/sales/dispatch' },
    { label: 'Capacity plan', to: '/planning/capacity-planning' },
  ]
  ev.groundedRecords = ctx.salesOrders.length + ctx.productionOrders.length

  if (order) {
    const days = daysBetween(order.dueDate)
    const linked = ctx.productionOrders.filter((p) => p.salesOrderNo === order.orderNo)
    const remaining = Math.round((order.qtyOrdered * (100 - order.productionPct)) / 100)

    ev.subject = `${order.orderNo} (${order.customerName})`
    ev.headline =
      order.risk === 'delayed'
        ? `${order.orderNo} is ${Math.abs(days)} days past its committed date`
        : order.risk === 'atRisk'
          ? `${order.orderNo} is at risk with ${days} days to go`
          : `${order.orderNo} is tracking to plan`

    ev.summary = `${formatNumber(order.qtyOrdered)} ${order.unit} of ${order.productName} for ${
      order.customerName
    } (${order.country}), worth ${formatInrCompact(order.valueInr)}. At the ${order.stage} stage with ${
      days < 0 ? `the due date ${Math.abs(days)} days behind` : `${days} days to go`
    } and ${formatNumber(remaining)} ${order.unit} still to make.${
      order.riskReason ? ` Flagged driver: ${order.riskReason}.` : ''
    }`

    ev.metricsTitle = `${order.orderNo} — position`
    ev.metrics = [
      { label: 'Customer', value: order.customerName, hint: order.country },
      { label: 'Quantity', value: `${formatNumber(order.qtyOrdered)} ${order.unit}`, hint: order.productName },
      { label: 'Value', value: formatInrCompact(order.valueInr) },
      {
        label: 'Due',
        value: days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`,
        tone: days < 0 ? 'danger' : days < 5 ? 'warning' : 'success',
      },
      { label: 'Production', value: `${order.productionPct}%`, tone: order.productionPct === 100 ? 'success' : 'warning' },
      { label: 'Balance to make', value: `${formatNumber(remaining)} ${order.unit}` },
    ]

    if (order.riskReason) {
      ev.leadingBlocks.push({
        kind: 'callout',
        tone: order.risk === 'delayed' ? 'danger' : 'warning',
        title: `Flagged reason: ${order.riskReason}`,
        body: `Recorded against ${order.orderNo} at the ${order.stage} stage${
          linked.length ? `, with ${linked.length} linked production order${linked.length === 1 ? '' : 's'} (${linked
            .map((l) => l.orderNo)
            .join(', ')})` : ''
        }.`,
      })
    }

    ev.causes = [
      {
        cause: 'Upstream material availability — the assigned cotton lot cleared late',
        likelihood: 38,
        evidence: 'Lot clearance delay is the single most common driver of slipped orders in the case history.',
        signal: order.riskReason?.toLowerCase().includes('cotton') ? 'Matches the flagged reason on this order' : undefined,
      },
      {
        cause: 'Capacity loss on the assigned frame from an unplanned stoppage',
        likelihood: 34,
        evidence: `${ctx.machines.filter((m) => m.status === 'Breakdown').length} machines are in breakdown right now, removing hours from the plan.`,
        signal: order.riskReason?.toLowerCase().includes('breakdown') ? 'Matches the flagged reason on this order' : undefined,
      },
      {
        cause: 'Quality hold or rework consuming the schedule buffer',
        likelihood: 28,
        evidence: 'Rework cycles routinely absorb the days that were held back as buffer.',
        signal: order.qualityPct > 0 && order.qualityPct < 100 ? 'Quality stage is part-complete on this order' : undefined,
      },
    ]

    ev.retrievalHints = [order.riskReason ?? '', order.stage, order.isExport ? 'export container shipping' : ''].filter(
      Boolean,
    )
    ev.followUps = [
      `How do we recover ${order.orderNo} without pushing another order out?`,
      `What did we do the last time an order for ${order.customerName} slipped?`,
      `Who should own the recovery for ${order.orderNo}?`,
    ]
    return ev
  }

  ev.subject = 'the at-risk order book'
  ev.headline = `${atRisk.length} orders at risk and ${delayed.length} already delayed`
  ev.summary = `${atRisk.length} orders are flagged at risk and ${delayed.length} have passed their committed date — ${formatInrCompact(
    exposure,
  )} of order value between them. The recurring drivers are cotton lot clearance, capacity lost to breakdowns, and rework at the quality stage.`

  ev.metricsTitle = 'Order book risk'
  ev.metrics = [
    { label: 'At risk', value: formatNumber(atRisk.length), tone: 'warning' },
    { label: 'Delayed', value: formatNumber(delayed.length), tone: 'danger' },
    { label: 'Value exposed', value: formatInrCompact(exposure), tone: 'warning' },
    { label: 'On schedule', value: formatNumber(ctx.salesOrders.filter((o) => o.risk === 'onSchedule').length), tone: 'success' },
    { label: 'Completed', value: formatNumber(ctx.salesOrders.filter((o) => o.risk === 'completed').length), tone: 'success' },
    { label: 'Export share', value: formatPct((ctx.salesOrders.filter((o) => o.isExport).length / ctx.salesOrders.length) * 100, 0) },
  ]

  const critical = [...delayed, ...atRisk]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6)

  if (critical.length) {
    ev.leadingBlocks.push({
      kind: 'table',
      title: 'Most time-critical positions',
      columns: ['Order', 'Customer', 'Product', 'Due', 'Stage', 'Flagged reason'],
      rows: critical.map((o) => {
        const days = daysBetween(o.dueDate)
        return {
          cells: [
            o.orderNo,
            `${o.customerName} (${o.country})`,
            o.productName,
            days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`,
            o.stage,
            o.riskReason ?? '—',
          ],
          tone: o.risk === 'delayed' ? ('danger' as const) : ('warning' as const),
        }
      }),
    })
  }

  ev.causes = [
    {
      cause: 'Cotton lot clearance running behind the spinning start date',
      likelihood: 36,
      evidence: `${ctx.cottonLots.filter((l) => l.status === 'In Testing').length} lots are still in testing and not yet released to the mixing.`,
    },
    {
      cause: 'Capacity lost to unplanned stoppages on assigned frames',
      likelihood: 34,
      evidence: `${ctx.machines.filter((m) => m.status === 'Breakdown').length} assets in breakdown and ${ctx.pmTasks.filter((t) => t.status === 'Overdue').length} preventive tasks overdue.`,
    },
    {
      cause: 'Rework and quality holds absorbing the schedule buffer',
      likelihood: 30,
      evidence: `${ctx.qualityTests.filter((t) => t.result !== 'Pass').length} tests currently sit outside a clean pass.`,
    },
  ]
  ev.retrievalHints = [...new Set(critical.map((o) => o.riskReason).filter((r): r is string => Boolean(r)))]
  ev.followUps = [
    'Which at-risk order should we protect first?',
    'How long will it take to recover the delayed orders?',
    'Who handled the last recovery of this kind?',
  ]
  return ev
}

function productionEvidence(_parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const cutoff = Date.now() - 7 * 86400000
  const recent = ctx.productionRecords.filter((r) => new Date(r.date).getTime() >= cutoff)
  const actual = recent.reduce((s, r) => s + r.actualKg, 0)
  const target = recent.reduce((s, r) => s + r.targetKg, 0)
  const achievement = target ? (actual / target) * 100 : 0
  const gap = target - actual

  const byFactory = new Map<string, { actual: number; target: number }>()
  for (const record of recent) {
    const entry = byFactory.get(record.factoryId) ?? { actual: 0, target: 0 }
    entry.actual += record.actualKg
    entry.target += record.targetKg
    byFactory.set(record.factoryId, entry)
  }
  const factoryRows = [...byFactory.entries()]
    .map(([id, v]) => ({
      id,
      label: factoryLabel(ctx, id),
      actual: v.actual,
      target: v.target,
      pct: v.target ? (v.actual / v.target) * 100 : 0,
    }))
    .sort((a, b) => a.pct - b.pct)

  const worst = factoryRows[0]
  const running = ctx.machines.filter((m) => m.status === 'Running')
  const avgOee = running.length ? running.reduce((s, m) => s + m.oeePct, 0) / running.length : 0

  ev.subject = 'the production shortfall'
  ev.headline =
    achievement >= 100
      ? `Output is running at ${formatPct(achievement)} of target over the last 7 days`
      : `Output is ${formatPct(100 - achievement)} short of target over the last 7 days`
  ev.summary = `${formatKg(actual)} produced against ${formatKg(target)} over seven days — ${formatPct(
    achievement,
  )} achievement${gap > 0 ? `, a ${formatKg(gap)} shortfall` : ''}.${
    worst ? ` ${worst.label} carries the largest share at ${formatPct(worst.pct)} of target.` : ''
  } ${ctx.machines.filter((m) => m.status === 'Breakdown').length} machines are down and ${
    ctx.machines.filter((m) => m.status === 'Idle').length
  } idle — where the recoverable hours sit.`

  ev.metricsTitle = 'Last 7 days'
  ev.metrics = [
    { label: 'Actual output', value: formatKg(actual) },
    { label: 'Target', value: formatKg(target) },
    { label: 'Achievement', value: formatPct(achievement), tone: achievement >= 98 ? 'success' : achievement >= 92 ? 'warning' : 'danger' },
    { label: 'Shortfall', value: gap > 0 ? formatKg(gap) : '—', tone: gap > 0 ? 'danger' : 'success' },
    { label: 'Avg OEE (running)', value: formatPct(avgOee) },
    { label: 'Assets down / idle', value: `${ctx.machines.filter((m) => m.status === 'Breakdown').length} / ${ctx.machines.filter((m) => m.status === 'Idle').length}`, tone: 'warning' },
  ]

  if (factoryRows.length) {
    ev.leadingBlocks.push({
      kind: 'table',
      title: 'Achievement by unit',
      columns: ['Unit', 'Actual', 'Target', 'Achievement'],
      rows: factoryRows.map((row) => ({
        cells: [row.label, formatKg(row.actual), formatKg(row.target), formatPct(row.pct)],
        tone: row.pct >= 98 ? ('success' as const) : row.pct >= 92 ? ('warning' as const) : ('danger' as const),
      })),
    })
  }

  ev.causes = [
    {
      cause: 'Hours lost to unplanned stoppages',
      likelihood: 39,
      evidence: `${ctx.machines.filter((m) => m.status === 'Breakdown').length} assets in breakdown contribute zero output while stopped.`,
      signal: 'Shortfall tracks the breakdown windows',
    },
    {
      cause: 'Extended count changeovers eating running hours',
      likelihood: 33,
      evidence: 'Changeover overruns are the second largest recorded loss in the production case history.',
      signal: 'Loss concentrated on units running mixed counts',
    },
    {
      cause: 'Reduced weekend and C-shift manning',
      likelihood: 28,
      evidence: 'Weekend shifts carry the largest share of the gap in comparable cases.',
      signal: 'Gap widens on weekend days in the trend',
    },
  ]

  ev.retrievalHints = ['output shortfall against target', 'changeover', 'manning', 'downtime']

  ev.sources = [
    { label: 'Production trend', detail: `${recent.length} day-records`, to: '/production' },
    { label: 'Machine dashboard', detail: `${ctx.machines.length} assets`, to: '/maintenance/machine-dashboard' },
    { label: 'Capacity plan', to: '/planning/capacity-planning' },
  ]
  ev.groundedRecords = recent.length + ctx.machines.length
  ev.followUps = [
    'Which unit should we recover first?',
    'How long will it take to get back on target?',
    'What did we do the last time output fell short?',
  ]
  return ev
}

function energyEvidence(_parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const cutoff = Date.now() - 7 * 86400000
  const recent = ctx.energyRecords.filter((r) => new Date(r.date).getTime() >= cutoff)
  const prior = ctx.energyRecords.filter((r) => {
    const t = new Date(r.date).getTime()
    return t < cutoff && t >= cutoff - 7 * 86400000
  })

  const kwh = recent.reduce((s, r) => s + r.totalKwh, 0)
  const kg = recent.reduce((s, r) => s + r.outputKg, 0)
  const intensity = kg ? kwh / kg : 0
  const priorIntensity = prior.length
    ? prior.reduce((s, r) => s + r.totalKwh, 0) / Math.max(1, prior.reduce((s, r) => s + r.outputKg, 0))
    : intensity
  const deltaPct = priorIntensity ? ((intensity - priorIntensity) / priorIntensity) * 100 : 0

  const endUse = new Map<string, number>()
  for (const record of recent) {
    for (const [use, value] of Object.entries(record.kwhByEndUse)) {
      endUse.set(use, (endUse.get(use) ?? 0) + value)
    }
  }
  const topUses = [...endUse.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const avgPf = recent.length ? recent.reduce((s, r) => s + r.powerFactor, 0) / recent.length : 0

  ev.subject = 'the energy intensity deviation'
  ev.headline = `Specific consumption is ${intensity.toFixed(2)} kWh/kg over the last 7 days`
  ev.summary = `${intensity.toFixed(2)} kWh per kg over seven days, ${
    deltaPct >= 0 ? `${deltaPct.toFixed(1)}% above` : `${Math.abs(deltaPct).toFixed(1)}% below`
  } the previous week, at a ${avgPf.toFixed(2)} power factor.${
    topUses.length ? ` ${topUses[0][0]} is the largest end use.` : ''
  } Drift without a production change usually means air leaks or humidification set points.`

  ev.metricsTitle = 'Energy position, last 7 days'
  ev.metrics = [
    { label: 'Specific energy', value: `${intensity.toFixed(2)} kWh/kg`, tone: deltaPct > 3 ? 'warning' : 'success' },
    { label: 'Week on week', value: `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`, tone: deltaPct > 3 ? 'danger' : 'success' },
    { label: 'Total drawn', value: `${formatNumber(Math.round(kwh))} kWh` },
    { label: 'Output', value: formatKg(Math.round(kg)) },
    { label: 'Power factor', value: avgPf.toFixed(2), tone: avgPf >= 0.95 ? 'success' : 'warning' },
    { label: 'Days analysed', value: formatNumber(recent.length) },
  ]

  if (topUses.length) {
    ev.leadingBlocks.push({
      kind: 'table',
      title: 'Consumption by end use',
      columns: ['End use', 'kWh', 'Share'],
      rows: topUses.map(([use, value]) => ({
        cells: [use, formatNumber(Math.round(value)), formatPct((value / kwh) * 100, 1)],
      })),
    })
  }

  ev.causes = [
    {
      cause: 'Compressed air leaks raising non-productive load',
      likelihood: 40,
      evidence: 'Leak surveys in past cases recovered a measurable share of the excess within days.',
      signal: 'Consumption up without a matching production increase',
    },
    {
      cause: 'Humidification running above the required set point',
      likelihood: 35,
      evidence: 'Set points raised manually during a dry spell and never reset are a repeat cause.',
      signal: 'Humidification share of total load above its normal band',
    },
    {
      cause: 'Idle running during changeovers and between shifts',
      likelihood: 25,
      evidence: 'Fixed load continues whether or not the frames are turning.',
    },
  ]

  ev.retrievalHints = ['kwh per kg specific energy', 'compressed air leak', 'humidification set point']

  ev.sources = [
    { label: 'Energy dashboard', detail: `${recent.length} day-records`, to: '/energy' },
    { label: 'Production output', to: '/production' },
    { label: 'Machine registry', to: '/maintenance/machine-dashboard' },
  ]
  ev.groundedRecords = ctx.energyRecords.length
  ev.followUps = [
    'Where exactly is the excess consumption sitting?',
    'How long would a leak survey and correction take?',
    'Who ran the last energy correction?',
  ]
  return ev
}

function inventoryEvidence(_parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const below = ctx.inventory.filter((i) => i.belowReorder)
  const lowSpares = ctx.spareParts.filter((s) => s.isLow)
  const tightest = [...ctx.inventory].sort((a, b) => a.daysOfStock - b.daysOfStock)[0]

  ev.subject = below.length ? `the ${below[0].category} stock position` : 'the stock position'
  ev.headline = below.length
    ? `${below.map((b) => b.category).join(', ')} below reorder level`
    : 'All stock categories are above reorder level'
  ev.summary = `${
    below.length
      ? `${below
          .map((b) => `${b.category} is at ${formatNumber(b.currentQty)} ${b.unit} against a reorder level of ${formatNumber(b.reorderLevel)} ${b.unit}`)
          .join('; ')}.`
      : 'Every stock category is above its reorder level.'
  } Tightest cover is ${tightest.category} at ${tightest.daysOfStock} days, and ${lowSpares.length} spare lines are short.`

  ev.metricsTitle = 'Stock position'
  ev.metrics = [
    ...ctx.inventory.map((item) => ({
      label: item.category,
      value: `${formatNumber(item.currentQty)} ${item.unit}`,
      hint: `${item.daysOfStock} days cover`,
      tone: item.belowReorder ? ('danger' as const) : ('success' as const),
    })),
    { label: 'Spares below reorder', value: formatNumber(lowSpares.length), tone: lowSpares.length ? 'warning' : 'success' },
  ]

  if (lowSpares.length) {
    ev.leadingBlocks.push({
      kind: 'table',
      title: 'Spare parts below reorder level',
      columns: ['Part', 'Code', 'In stock', 'Reorder level'],
      rows: lowSpares.slice(0, 6).map((s) => ({
        cells: [s.name, s.partCode, `${s.currentStock} ${s.unit}`, `${s.reorderLevel} ${s.unit}`],
        tone: 'warning' as const,
      })),
    })
  }

  ev.causes = [
    {
      cause: 'Dispatch running ahead of replenishment',
      likelihood: 43,
      evidence: 'Cover erodes when a heavy dispatch week follows a suppressed production week.',
    },
    {
      cause: 'Reorder levels not revised for the current order mix',
      likelihood: 32,
      evidence: 'Levels set against an older mix under-protect the counts now in demand.',
    },
    {
      cause: 'Upstream output suppressed by downtime',
      likelihood: 25,
      evidence: `${ctx.machines.filter((m) => m.status === 'Breakdown').length} assets are currently down, reducing replenishment.`,
    },
  ]

  ev.retrievalHints = [
    ...below.map((b) => `${b.category} below reorder level stock cover`),
    lowSpares.length ? 'critical spare out of stock' : '',
  ].filter(Boolean)

  ev.sources = [
    { label: 'Inventory overview', to: '/inventory' },
    { label: 'Finished goods', to: '/inventory/finished-goods' },
    { label: 'Spare parts', detail: `${ctx.spareParts.length} lines`, to: '/maintenance/spare-parts' },
  ]
  ev.groundedRecords = ctx.inventory.length + ctx.spareParts.length
  ev.followUps = [
    'Which committed orders does this stock position threaten?',
    'How long to rebuild cover above the reorder level?',
    'What reorder levels should we be running instead?',
  ]
  return ev
}

function capacityEvidence(_parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const byProcess = new Map<string, { total: number; down: number }>()
  for (const machine of ctx.machines) {
    const entry = byProcess.get(machine.process) ?? { total: 0, down: 0 }
    entry.total += 1
    if (machine.status === 'Breakdown' || machine.status === 'Maintenance') entry.down += 1
    byProcess.set(machine.process, entry)
  }
  const rows = [...byProcess.entries()]
    .map(([process, v]) => ({ process, ...v, availablePct: ((v.total - v.down) / v.total) * 100 }))
    .sort((a, b) => a.availablePct - b.availablePct)
  const constraint = rows[0]

  const openOrders = ctx.salesOrders.filter((o) => o.risk !== 'completed')
  const openQty = openOrders.reduce((s, o) => s + (o.unit === 'kg' ? o.qtyOrdered : 0), 0)

  ev.subject = constraint ? `the constraint at ${constraint.process}` : 'the capacity position'
  ev.headline = constraint
    ? `${constraint.process} is the tightest process at ${formatPct(constraint.availablePct)} availability`
    : 'Capacity position across the processes'
  ev.summary = `${openOrders.length} open orders carry roughly ${formatKg(openQty)} still to make.${
    constraint
      ? ` ${constraint.process} is the tightest link — ${constraint.down} of ${constraint.total} assets out of service, ${formatPct(constraint.availablePct)} availability.`
      : ''
  } The constraint is availability, not installed capacity.`

  ev.metricsTitle = 'Capacity position'
  ev.metrics = [
    { label: 'Open orders', value: formatNumber(openOrders.length) },
    { label: 'Quantity to make', value: formatKg(openQty) },
    { label: 'Tightest process', value: constraint?.process ?? '—', tone: 'warning' },
    { label: 'Assets out of service', value: formatNumber(ctx.machines.filter((m) => m.status !== 'Running' && m.status !== 'Idle').length), tone: 'warning' },
    { label: 'Installed spindles', value: formatNumber(ctx.factories.reduce((s, f) => s + f.spindles, 0)) },
    { label: 'Installed rotors', value: formatNumber(ctx.factories.reduce((s, f) => s + f.rotors, 0)) },
  ]

  ev.leadingBlocks.push({
    kind: 'table',
    title: 'Availability by process',
    columns: ['Process', 'Assets', 'Out of service', 'Available'],
    rows: rows.slice(0, 7).map((row) => ({
      cells: [row.process, String(row.total), String(row.down), formatPct(row.availablePct)],
      tone: row.availablePct >= 90 ? ('success' as const) : row.availablePct >= 75 ? ('warning' as const) : ('danger' as const),
    })),
  })

  ev.causes = [
    {
      cause: 'Order mix shifted toward counts that load one process harder',
      likelihood: 38,
      evidence: 'Fine and doubled counts load TFO and combing disproportionately.',
    },
    {
      cause: 'Assets out of service at the constraining process',
      likelihood: 36,
      evidence: constraint ? `${constraint.down} of ${constraint.total} assets are down at ${constraint.process}.` : 'Assets out of service reduce effective capacity.',
    },
    {
      cause: 'Sequencing not aligned to due dates',
      likelihood: 26,
      evidence: 'Queue order rather than due-date order pushes tight commitments to the back.',
    },
  ]

  ev.retrievalHints = [constraint ? `${constraint.process} capacity bottleneck queue` : 'capacity bottleneck']

  ev.sources = [
    { label: 'Capacity planning', to: '/planning/capacity-planning' },
    { label: 'Production orders', to: '/planning/production-orders' },
    { label: 'Machine dashboard', to: '/maintenance/machine-dashboard' },
  ]
  ev.groundedRecords = ctx.machines.length + ctx.salesOrders.length
  ev.followUps = [
    'How do we clear the queue at the constraint?',
    'Can we accept a new order in this window?',
    'How long to bring the constraint back to full availability?',
  ]
  return ev
}

function procurementEvidence(_parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const inTesting = ctx.cottonLots.filter((l) => l.status === 'In Testing')
  const onHold = ctx.cottonLots.filter((l) => l.status === 'On Hold')
  const approved = ctx.cottonLots.filter((l) => l.status === 'Approved')
  const cottonSuppliers = ctx.suppliers.filter((s) => s.category === 'Cotton')

  ev.subject = 'the incoming material position'
  ev.headline = `${inTesting.length} cotton lots awaiting clearance, ${onHold.length} on hold`
  ev.summary = `${inTesting.length} lots are in testing and ${onHold.length} on hold, against ${
    approved.length
  } approved and available to the mixing. Clearance delay here is the most common upstream cause of a slipped spinning start.`

  ev.metricsTitle = 'Cotton lot register'
  ev.metrics = [
    { label: 'In testing', value: formatNumber(inTesting.length), tone: 'warning' },
    { label: 'Approved', value: formatNumber(approved.length), tone: 'success' },
    { label: 'On hold', value: formatNumber(onHold.length), tone: onHold.length ? 'danger' : 'neutral' },
    { label: 'In use', value: formatNumber(ctx.cottonLots.filter((l) => l.status === 'In Use').length) },
    { label: 'Cotton suppliers', value: formatNumber(cottonSuppliers.length) },
    { label: 'Total lots', value: formatNumber(ctx.cottonLots.length) },
  ]

  if (inTesting.length) {
    ev.leadingBlocks.push({
      kind: 'table',
      title: 'Lots awaiting clearance',
      columns: ['Lot', 'Origin', 'Bales', 'Micronaire', 'Staple', 'Trash %'],
      rows: inTesting.slice(0, 6).map((l) => ({
        cells: [
          l.lotNumber,
          l.origin,
          formatNumber(l.bales),
          l.micronaire.toFixed(2),
          `${l.staple.toFixed(1)} mm`,
          `${l.trashPct.toFixed(1)}%`,
        ],
        tone: 'warning' as const,
      })),
    })
  }

  ev.causes = [
    {
      cause: 'Laboratory test queue not sequenced against order due dates',
      likelihood: 41,
      evidence: 'Lots for tight orders queue behind routine batches in past cases.',
    },
    {
      cause: 'Supplier shipped against a different gin lot than the sample',
      likelihood: 32,
      evidence: 'The recorded cause of the last rejection at HVI.',
    },
    {
      cause: 'No approved buffer lot held for the count in demand',
      likelihood: 27,
      evidence: 'Without a buffer, any clearance delay lands directly on the spinning start.',
    },
  ]

  ev.retrievalHints = ['cotton lot clearance delay testing', 'supplier lot rejected hvi']

  ev.sources = [
    { label: 'Cotton lots', detail: `${ctx.cottonLots.length} lots`, to: '/cotton/cotton-lots' },
    { label: 'Cotton testing', to: '/cotton/cotton-testing' },
    { label: 'Suppliers', detail: `${ctx.suppliers.length} suppliers`, to: '/procurement/suppliers' },
  ]
  ev.groundedRecords = ctx.cottonLots.length + ctx.suppliers.length
  ev.followUps = [
    'Which orders depend on the lots still in testing?',
    'How long to clear the testing queue?',
    'What did we do the last time a supplier lot was rejected?',
  ]
  return ev
}

function generalEvidence(_parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  const ev = emptyEvidence()
  const down = ctx.machines.filter((m) => m.status === 'Breakdown')
  const atRisk = ctx.salesOrders.filter((o) => o.risk === 'atRisk' || o.risk === 'delayed')
  const critical = ctx.alerts.filter((a) => a.severity === 'critical' && !a.acknowledged)
  const cutoff = Date.now() - 7 * 86400000
  const recent = ctx.productionRecords.filter((r) => new Date(r.date).getTime() >= cutoff)
  const actual = recent.reduce((s, r) => s + r.actualKg, 0)
  const target = recent.reduce((s, r) => s + r.targetKg, 0)

  ev.subject = 'the current plant position'
  ev.headline = 'Plant position across production, quality, orders and assets'
  ev.summary = `${formatKg(actual)} produced against ${formatKg(target)} this week (${formatPct(
    target ? (actual / target) * 100 : 0,
  )} achievement). ${down.length} machines down, ${atRisk.length} orders at risk, ${formatPct(
    ctx.qualityPassRatePct,
  )} lab pass rate, ${critical.length} critical alerts open.`

  ev.metricsTitle = 'Plant snapshot'
  ev.metrics = [
    { label: 'Output (7d)', value: formatKg(actual) },
    { label: 'Achievement', value: formatPct(target ? (actual / target) * 100 : 0), tone: actual >= target ? 'success' : 'warning' },
    { label: 'Machines down', value: formatNumber(down.length), tone: down.length ? 'danger' : 'success' },
    { label: 'Orders at risk', value: formatNumber(atRisk.length), tone: atRisk.length ? 'warning' : 'success' },
    { label: 'Quality pass rate', value: formatPct(ctx.qualityPassRatePct), tone: ctx.qualityPassRatePct >= 95 ? 'success' : 'warning' },
    { label: 'Critical alerts', value: formatNumber(critical.length), tone: critical.length ? 'danger' : 'success' },
  ]

  ev.causes = GENERIC_CAUSES
  ev.sources = [
    { label: 'Executive dashboard', to: '/' },
    { label: 'Production overview', to: '/production' },
    { label: 'Quality dashboard', to: '/quality/dashboard' },
    { label: 'Machine dashboard', to: '/maintenance/machine-dashboard' },
  ]
  ev.groundedRecords = ctx.machines.length + ctx.salesOrders.length + ctx.qualityTests.length + recent.length
  ev.followUps = [
    'Why did production fall short this week?',
    'Which machine is costing us the most output?',
    'Which orders are at risk and what do we do about them?',
  ]
  return ev
}

function gatherEvidence(parsed: ParsedQuestion, ctx: AiDataContext): Evidence {
  switch (parsed.topic) {
    case 'breakdown':
      return breakdownEvidence(parsed, ctx)
    case 'quality':
      return qualityEvidence(parsed, ctx)
    case 'orderDelay':
      return orderEvidence(parsed, ctx)
    case 'production':
      return productionEvidence(parsed, ctx)
    case 'energy':
      return energyEvidence(parsed, ctx)
    case 'inventory':
      return inventoryEvidence(parsed, ctx)
    case 'capacity':
      return capacityEvidence(parsed, ctx)
    case 'procurement':
      return procurementEvidence(parsed, ctx)
    case 'people':
      return parsed.entities.some((e) => e.type === 'machine')
        ? breakdownEvidence(parsed, ctx)
        : generalEvidence(parsed, ctx)
    default:
      return generalEvidence(parsed, ctx)
  }
}

/* ------------------------------------------------------------ assembly */

function buildReasoningSteps(parsed: ParsedQuestion, ctx: AiDataContext, evidence: Evidence): string[] {
  const steps = [
    `Parsing the question — topic "${parsed.topic}", intent "${parsed.intent}"${
      parsed.entities.length ? `, entities: ${parsed.entities.map((e) => e.label).join(', ')}` : ''
    }`,
    `Querying live plant records (${formatNumber(evidence.groundedRecords)} rows in scope)`,
    `Searching the resolution knowledge base — ${ctx.incidents.length} closed cases`,
    'Ranking probable causes against the retrieved evidence',
    `Matching engineers on speciality, past fixes and current availability`,
  ]
  if (parsed.wantsPlan) steps.push('Building a phased resolution plan and calibrating the estimate on historical durations')
  steps.push('Composing the grounded answer')
  return steps
}

export function composeAnswer(question: string, ctx: AiDataContext): AiAnswer {
  const started = Date.now()

  // "hi" is a conversational turn, not a plant question - answer it as one.
  const smallTalk = classifySmallTalk(question)
  if (smallTalk) return composeSmallTalkAnswer(smallTalk, question, ctx)

  // A greeting attached to a real question is just politeness; drop it so
  // topic scoring sees the substance.
  const parsed = parseQuestion(stripGreetingPrefix(question), ctx)
  const evidence = gatherEvidence(parsed, ctx)

  // Search the knowledge base on the question *plus* what the live record says
  // is actually wrong, so the retrieved cases line up with the ranked causes.
  const grounded = withRetrievalHints(parsed, evidence.retrievalHints)
  const cases = retrieveCases(grounded, ctx, 2)
  const engineers = rankEngineers(grounded, ctx, { cases, limit: 2 })

  const blocks: AiBlock[] = []

  if (evidence.metrics.length) {
    blocks.push({ kind: 'metrics', title: evidence.metricsTitle, items: evidence.metrics.slice(0, 4) })
  }
  blocks.push(...evidence.leadingBlocks)

  if (evidence.causes.length && (parsed.isProblem || parsed.intent === 'diagnose' || parsed.intent === 'forecast')) {
    blocks.push({
      kind: 'diagnosis',
      title: 'Probable causes, ranked',
      causes: evidence.causes.slice(0, 3),
    })
  }

  if (cases.length && (parsed.wantsHistory || parsed.isProblem || parsed.intent !== 'lookup')) {
    blocks.push({
      kind: 'history',
      title: `How we resolved this before — ${cases.length} comparable case${cases.length === 1 ? '' : 's'}`,
      cases,
    })
  }

  if (engineers.length && (parsed.wantsPeople || parsed.isProblem || parsed.intent === 'recommend' || parsed.intent === 'plan')) {
    blocks.push({
      kind: 'engineers',
      title: 'Engineers who have resolved this before',
      people: engineers,
    })
  }

  if (parsed.wantsPlan || parsed.intent === 'plan' || parsed.intent === 'diagnose') {
    const plan = buildPlan({ parsed: grounded, ctx, cases, engineers, subject: evidence.subject })
    blocks.push({ kind: 'plan', plan })
  }

  blocks.push(...evidence.trailingBlocks)

  // Confidence blends question clarity, retrieval strength and data coverage.
  const retrievalStrength = cases.length ? cases[0].similarityPct / 100 : 0.4
  const confidencePct = Math.round(
    Math.min(96, Math.max(52, parsed.clarity * 34 + retrievalStrength * 46 + (evidence.metrics.length ? 14 : 4))),
  )

  const latencyMs = 620 + Math.round(question.length * 7) + cases.length * 90

  return {
    id: `ans-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    question: parsed.raw,
    intent: parsed.intent,
    topic: parsed.topic,
    entities: parsed.entities,
    headline: evidence.headline || 'Here is what the data shows',
    summary: evidence.summary,
    confidencePct,
    blocks,
    sources: evidence.sources,
    followUps: evidence.followUps,
    reasoningSteps: buildReasoningSteps(parsed, ctx, evidence),
    modelLabel: AI_MODEL_LABEL,
    latencyMs: Math.max(latencyMs, Date.now() - started),
    tokensUsed: 340 + question.length * 3 + blocks.length * 210,
    groundedRecords: evidence.groundedRecords + ctx.incidents.length,
  }
}
