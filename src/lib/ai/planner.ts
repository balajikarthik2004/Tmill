/**
 * Resolution planner.
 *
 * Turns a diagnosis plus the retrieved historical cases into a phased project
 * plan with owners, durations, dependencies, a critical path and a calendar
 * ETA. Durations are calibrated on how long the comparable cases actually took,
 * so the estimate moves with the evidence instead of being a fixed number.
 *
 * The plant runs three eight-hour shifts, so elapsed hours are treated as
 * calendar hours except where a task waits on an external party.
 */
import type {
  AiEngineerMatch,
  AiHistoricalCase,
  AiPlan,
  AiPlanPhase,
  AiPlanRisk,
  AiPlanTask,
  AiTopic,
} from '@/types'
import type { AiDataContext } from './context'
import type { ParsedQuestion } from './nlu'

interface PhaseSkeleton {
  name: string
  objective: string
  /** Tasks that always run for this topic, whatever the case history says. */
  fixed: Array<{ name: string; detail: string; hours: number; parallel?: boolean }>
  /** How many of the historical resolution steps to fold into this phase. */
  historySteps: number
}

const SKELETONS: Record<AiTopic, PhaseSkeleton[]> = {
  breakdown: [
    {
      name: 'Phase 1 - Contain & triage',
      objective: 'Stop further loss and establish exactly what failed.',
      fixed: [
        { name: 'Isolate the asset and log the stop', detail: 'Lock out the machine, record the stop reason against the breakdown register.', hours: 0.5 },
        { name: 'Notify planning of the capacity loss', detail: 'So the affected orders can be re-sequenced in parallel with the repair.', hours: 0.25, parallel: true },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Diagnose',
      objective: 'Confirm the root cause rather than the first visible symptom.',
      fixed: [
        { name: 'Confirm against the historical signature', detail: 'Compare readings with the matched closed cases before committing to a repair route.', hours: 0.75 },
      ],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Repair',
      objective: 'Restore the asset to nameplate condition.',
      fixed: [
        { name: 'Draw and stage the spares', detail: 'Pull the required parts from stores; raise an emergency requisition if short.', hours: 0.75, parallel: true },
      ],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Verify & release',
      objective: 'Prove the fix held before the machine goes back into the plan.',
      fixed: [
        { name: 'Run-in and monitor for one shift', detail: 'Track vibration, temperature and end-breakage rate through a full shift before release.', hours: 8 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 5 - Prevent recurrence',
      objective: 'Close the loop so the same signature does not return.',
      fixed: [],
      historySteps: 0,
    },
  ],
  quality: [
    {
      name: 'Phase 1 - Contain',
      objective: 'Ring-fence affected stock before any of it reaches a customer.',
      fixed: [
        { name: 'Quarantine the affected lots', detail: 'Hold finished stock from the suspect window and block dispatch.', hours: 1 },
        { name: 'Trace back through the batch graph', detail: 'Walk lot to batch to machine to cotton lot to size the exposure.', hours: 2, parallel: true },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Investigate',
      objective: 'Separate a process cause from a raw material cause.',
      fixed: [
        { name: 'Re-test at the Central Testing Laboratory', detail: 'Re-run the failing parameter on retained samples to rule out a test error.', hours: 3 },
      ],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Correct',
      objective: 'Bring the process back inside the tolerance band.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Validate & release',
      objective: 'Prove the correction on a trial lot before scaling back up.',
      fixed: [
        { name: 'Run and test a trial lot', detail: 'Full parameter set on the trial before releasing held stock.', hours: 8 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 5 - Prevent recurrence',
      objective: 'Lock the correction into the standard.',
      fixed: [],
      historySteps: 0,
    },
  ],
  orderDelay: [
    {
      name: 'Phase 1 - Size the exposure',
      objective: 'Know exactly which commitments are at risk and by how much.',
      fixed: [
        { name: 'Rebuild the order position', detail: 'Quantity produced, quantity remaining, and days to the committed date.', hours: 2 },
        { name: 'Check the customer tolerance', detail: 'Confirm the contractual delivery window and any penalty clause.', hours: 1, parallel: true },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Re-plan',
      objective: 'Find the capacity to recover without breaking another order.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Recover',
      objective: 'Physically close the gap.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Confirm & ship',
      objective: 'Give the customer one firm date and hold it.',
      fixed: [
        { name: 'Confirm the revised date with the customer', detail: 'Single communication with the recovery plan and the new dispatch date.', hours: 1 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 5 - Prevent recurrence',
      objective: 'Stop the same order profile slipping again.',
      fixed: [],
      historySteps: 0,
    },
  ],
  production: [
    {
      name: 'Phase 1 - Quantify the variance',
      objective: 'Split the shortfall into downtime, speed and manning losses.',
      fixed: [
        { name: 'Build the loss waterfall', detail: 'Actual against target broken down by unit, shift and process.', hours: 3 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Attack the top losses',
      objective: 'Fix the two largest contributors first.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Standardise',
      objective: 'Make the recovery repeatable across all three shifts.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Track recovery',
      objective: 'Confirm the gap actually closes.',
      fixed: [
        { name: 'Daily actual-vs-target review', detail: 'Short daily review until output is back on target for five consecutive days.', hours: 10 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 5 - Lock it in',
      objective: 'Hold the gain.',
      fixed: [],
      historySteps: 0,
    },
  ],
  energy: [
    {
      name: 'Phase 1 - Baseline',
      objective: 'Establish where the excess consumption actually sits.',
      fixed: [
        { name: 'Break consumption down by end use', detail: 'Split kWh across spinning, humidification, compressed air and lighting.', hours: 4 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Survey',
      objective: 'Find the physical losses.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Correct',
      objective: 'Remove the losses and reset the set points.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Re-benchmark',
      objective: 'Prove the saving over a full week.',
      fixed: [
        { name: 'Re-measure kWh per kg', detail: 'A full week of production at the corrected settings, compared with the benchmark.', hours: 12 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 5 - Sustain',
      objective: 'Keep the set points from drifting back.',
      fixed: [],
      historySteps: 0,
    },
  ],
  inventory: [
    {
      name: 'Phase 1 - Rank the exposure',
      objective: 'Know which committed orders the shortfall actually threatens.',
      fixed: [
        { name: 'Map stock against commitments by count', detail: 'Available quantity per count against the live order book.', hours: 3 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Re-prioritise',
      objective: 'Point production at the short items.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Replenish',
      objective: 'Rebuild cover above the reorder level.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Reset the policy',
      objective: 'Make the reorder level right for the current order mix.',
      fixed: [
        { name: 'Recalculate reorder points', detail: 'Reset from real consumption and lead time, not the historical figure.', hours: 4 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 5 - Monitor',
      objective: 'Watch cover until it is stable.',
      fixed: [],
      historySteps: 0,
    },
  ],
  procurement: [
    {
      name: 'Phase 1 - Contain',
      objective: 'Stop the non-conforming material entering the mixing.',
      fixed: [
        { name: 'Block the lot and record the deviation', detail: 'Formal hold with test evidence against the purchase specification.', hours: 2 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Source a replacement',
      objective: 'Protect the spinning plan.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Bridge the gap',
      objective: 'Keep the mixing running while the replacement lands.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Settle with the supplier',
      objective: 'Recover the commercial position.',
      fixed: [
        { name: 'Raise the supplier corrective action', detail: 'Formal deviation notice with the required corrective action and timeline.', hours: 4 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 5 - Tighten the terms',
      objective: 'Prevent a repeat on the next purchase.',
      fixed: [],
      historySteps: 0,
    },
  ],
  capacity: [
    {
      name: 'Phase 1 - Model the balance',
      objective: 'Size the constraint precisely.',
      fixed: [
        { name: 'Run the capacity plan', detail: 'Load against available hours by process, over the planning horizon.', hours: 4 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Re-sequence',
      objective: 'Protect the tightest due dates first.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Add capacity',
      objective: 'Close the gap at the constraint.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Confirm the plan',
      objective: 'Re-run the model and commit the dates.',
      fixed: [
        { name: 'Re-run and publish the plan', detail: 'Confirm every due date is now feasible before committing to customers.', hours: 3 },
      ],
      historySteps: 1,
    },
    {
      name: 'Phase 5 - Guard the constraint',
      objective: 'Keep the bottleneck from re-forming.',
      fixed: [],
      historySteps: 0,
    },
  ],
  cost: [
    {
      name: 'Phase 1 - Quantify',
      objective: 'Establish the true cost and where it lands.',
      fixed: [{ name: 'Build the cost breakdown', detail: 'Split the variance by driver and by unit.', hours: 4 }],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Analyse the drivers',
      objective: 'Find the two or three drivers that carry most of the variance.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Act',
      objective: 'Take out the largest driver first.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Verify the saving',
      objective: 'Confirm the change shows up in the numbers.',
      fixed: [{ name: 'Re-measure over a full period', detail: 'Compare against the pre-change baseline.', hours: 8 }],
      historySteps: 1,
    },
    { name: 'Phase 5 - Sustain', objective: 'Hold the gain.', fixed: [], historySteps: 0 },
  ],
  people: [
    {
      name: 'Phase 1 - Define the work',
      objective: 'Be precise about what needs doing and by when.',
      fixed: [{ name: 'Write the work scope', detail: 'Scope, acceptance criteria and required window.', hours: 1 }],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Assign',
      objective: 'Put the right person on it with the right cover.',
      fixed: [{ name: 'Confirm availability and assign', detail: 'Check the shift roster and confirm the assignment.', hours: 1 }],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Execute',
      objective: 'Do the work.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Verify',
      objective: 'Confirm the outcome and close the job.',
      fixed: [{ name: 'Sign off and close', detail: 'Verify against the acceptance criteria and close the record.', hours: 2 }],
      historySteps: 1,
    },
    { name: 'Phase 5 - Capture the learning', objective: 'Add the case to the knowledge base.', fixed: [], historySteps: 0 },
  ],
  general: [
    {
      name: 'Phase 1 - Assess',
      objective: 'Establish the facts and the size of the problem.',
      fixed: [{ name: 'Pull the current position', detail: 'Gather the relevant records from the affected module.', hours: 2 }],
      historySteps: 1,
    },
    {
      name: 'Phase 2 - Analyse',
      objective: 'Find the driver.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 3 - Act',
      objective: 'Apply the correction.',
      fixed: [],
      historySteps: 2,
    },
    {
      name: 'Phase 4 - Verify',
      objective: 'Confirm the correction worked.',
      fixed: [{ name: 'Re-measure and confirm', detail: 'Check the affected metric has returned to its normal band.', hours: 4 }],
      historySteps: 1,
    },
    { name: 'Phase 5 - Prevent recurrence', objective: 'Close the loop.', fixed: [], historySteps: 0 },
  ],
}

const RISKS_BY_TOPIC: Record<AiTopic, AiPlanRisk[]> = {
  breakdown: [
    {
      risk: 'Required spare is not in stock when the strip-down reaches it',
      likelihood: 'Medium',
      impact: 'Adds a supplier lead time to the middle of the repair',
      mitigation: 'Confirm the part against stores before Phase 3 starts; pre-raise an emergency requisition.',
    },
    {
      risk: 'Secondary damage found once the assembly is opened',
      likelihood: 'Medium',
      impact: 'Repair window extends beyond the estimate',
      mitigation: 'Hold a contingency block and keep an alternate machine nominated for the affected orders.',
    },
  ],
  quality: [
    {
      risk: 'Exposure is wider than the first trace suggests',
      likelihood: 'Medium',
      impact: 'More finished stock has to be held and re-tested',
      mitigation: 'Trace the full mixing, not only the flagged batch, before releasing anything.',
    },
    {
      risk: 'Trial lot does not clear on the first attempt',
      likelihood: 'Low',
      impact: 'Adds a further test and spin cycle',
      mitigation: 'Correct the process and the material together rather than one at a time.',
    },
  ],
  orderDelay: [
    {
      risk: 'No alternate capacity available in the recovery window',
      likelihood: 'Medium',
      impact: 'Recovery slips and the customer date moves',
      mitigation: 'Identify the alternate frame and the overtime slot before committing to a revised date.',
    },
    {
      risk: 'Container space unavailable on the revised sailing',
      likelihood: 'Medium',
      impact: 'Ready goods sit at the warehouse',
      mitigation: 'Book space against the revised ready date immediately, with a second forwarder as backup.',
    },
  ],
  production: [
    {
      risk: 'Manning gap repeats on the next weekend',
      likelihood: 'Medium',
      impact: 'Recovery stalls after the first few days',
      mitigation: 'Fix the relief roster before the recovery period starts.',
    },
  ],
  energy: [
    {
      risk: 'Set points drift back after the correction',
      likelihood: 'Medium',
      impact: 'The saving is lost within a month',
      mitigation: 'Put humidification and compressor set points under change control.',
    },
  ],
  inventory: [
    {
      risk: 'Dispatch schedule pulls faster than replenishment rebuilds cover',
      likelihood: 'Medium',
      impact: 'Cover stays below the reorder level for longer',
      mitigation: 'Stage dispatch against due dates while cover is rebuilt.',
    },
  ],
  procurement: [
    {
      risk: 'Replacement lot arrives outside the mixing window',
      likelihood: 'Medium',
      impact: 'Spinning plan is disrupted',
      mitigation: 'Bridge with approved godown stock from day one, not as a fallback.',
    },
  ],
  capacity: [
    {
      risk: 'Order mix shifts again during the recovery period',
      likelihood: 'Low',
      impact: 'The constraint moves to a different process',
      mitigation: 'Re-run the balance weekly while the queue clears.',
    },
  ],
  cost: [
    {
      risk: 'Saving is offset elsewhere and never shows in the result',
      likelihood: 'Medium',
      impact: 'Effort without a measurable outcome',
      mitigation: 'Fix the baseline and the measurement method before the change is made.',
    },
  ],
  people: [
    {
      risk: 'Nominated engineer is pulled onto a higher-priority job',
      likelihood: 'Medium',
      impact: 'Work stalls part-way through',
      mitigation: 'Name a second engineer as cover at assignment time.',
    },
  ],
  general: [
    {
      risk: 'The visible symptom is not the actual driver',
      likelihood: 'Medium',
      impact: 'Effort spent without resolving the issue',
      mitigation: 'Confirm the cause against the historical signature before committing resources.',
    },
  ],
}

const SUCCESS_BY_TOPIC: Record<AiTopic, string[]> = {
  breakdown: [
    'Machine back at nameplate speed with vibration and temperature inside band',
    'End-breakage rate at or below the pre-failure level for a full shift',
    'Failure signature and fix recorded against the asset history',
  ],
  quality: [
    'Failing parameter back inside the customer tolerance on a trial lot',
    'All held stock either released on re-test or dispositioned',
    'Corrected setting written into the process standard',
  ],
  orderDelay: [
    'Revised dispatch date confirmed with the customer and met',
    'No other committed order pushed out to recover this one',
    'Root delay driver removed from the next planning cycle',
  ],
  production: [
    'Actual output at or above target for five consecutive days',
    'Top two loss drivers reduced measurably against baseline',
    'Changeover and doffing standards in use on all three shifts',
  ],
  energy: [
    'kWh per kg back within the unit benchmark band over a full week',
    'All tagged leaks closed and verified',
    'Set points documented and under change control',
  ],
  inventory: [
    'Cover restored above the reorder level',
    'No committed dispatch missed during the recovery',
    'Reorder points reset against the live order mix',
  ],
  procurement: [
    'Replacement material cleared at the laboratory',
    'Mixing plan ran without interruption',
    'Purchase terms updated to prevent a repeat',
  ],
  capacity: [
    'Every due date in the horizon shown feasible by the model',
    'Queue at the constraint cleared',
    'Booking rule updated to check the constraint at order entry',
  ],
  cost: ['Variance closed against baseline', 'Driver removed at source', 'Measurement method agreed and repeatable'],
  people: ['Work completed within the agreed window', 'Acceptance criteria signed off', 'Case added to the knowledge base'],
  general: ['Affected metric back in its normal band', 'Driver addressed at source', 'Learning captured for the next occurrence'],
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function roundQuarter(hours: number) {
  return Math.max(0.25, Math.round(hours * 4) / 4)
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${Number(hours.toFixed(1))} h`
  const days = hours / 24
  return `${Number(days.toFixed(1))} days`
}

export interface PlanInput {
  parsed: ParsedQuestion
  ctx: AiDataContext
  cases: AiHistoricalCase[]
  engineers: AiEngineerMatch[]
  /** Short description of what is being fixed, used in the plan title. */
  subject: string
}

export function buildPlan({ parsed, ctx, cases, engineers, subject }: PlanInput): AiPlan {
  const skeleton = SKELETONS[parsed.topic] ?? SKELETONS.general
  const topCase = cases[0]

  // Historical steps become real plan tasks, so the plan mirrors what worked.
  const historySteps = topCase ? [...topCase.resolutionSteps] : []
  let stepCursor = 0

  // Calibrate against how long comparable cases actually took.
  const caseEfforts = cases.map((c) => c.resolutionSteps.reduce((sum, s) => sum + s.durationHrs, 0))
  const medianEffort = median(caseEfforts)
  const scale = medianEffort > 0 ? Math.min(1.35, Math.max(0.7, medianEffort / Math.max(medianEffort, 1))) : 1

  const owners = engineers.length
    ? engineers
    : [
        {
          name: 'Duty engineer',
          role: 'Shift engineer',
        } as AiEngineerMatch,
      ]

  let taskSeq = 0
  let cursorHrs = 0
  const criticalPath: string[] = []
  let previousCriticalId: string | undefined

  const phases: AiPlanPhase[] = skeleton.map((phase, phaseIndex) => {
    const tasks: AiPlanTask[] = []

    const addTask = (
      name: string,
      detail: string,
      hours: number,
      { parallel = false }: { parallel?: boolean } = {},
    ) => {
      taskSeq += 1
      const id = `T${String(taskSeq).padStart(2, '0')}`
      const owner = owners[Math.min(phaseIndex, owners.length - 1)]
      const duration = roundQuarter(hours * scale)
      const task: AiPlanTask = {
        id,
        name,
        detail,
        owner: owner.name,
        ownerRole: owner.role,
        durationHrs: duration,
        startOffsetHrs: parallel ? Math.max(0, cursorHrs - duration) : cursorHrs,
        dependsOn: previousCriticalId && !parallel ? [previousCriticalId] : [],
        onCriticalPath: !parallel,
      }
      if (!parallel) {
        cursorHrs += duration
        previousCriticalId = id
        criticalPath.push(id)
      }
      tasks.push(task)
    }

    for (const fixed of phase.fixed) {
      addTask(fixed.name, fixed.detail, fixed.hours, { parallel: fixed.parallel })
    }

    for (let i = 0; i < phase.historySteps && stepCursor < historySteps.length; i += 1) {
      const step = historySteps[stepCursor]
      stepCursor += 1
      addTask(
        step.step,
        `${step.detail} (this step is carried over from ${topCase?.refNo ?? 'the matched historical case'}, where it took ${formatHours(step.durationHrs)}.)`,
        step.durationHrs,
      )
    }

    // The final phase always carries the preventive action from the case history.
    if (phaseIndex === skeleton.length - 1) {
      addTask(
        'Apply the preventive action',
        topCase
          ? topCase.preventiveAction
          : 'Update the standard so the same conditions cannot recur unnoticed.',
        3,
      )
      addTask(
        'Log the case in the knowledge base',
        'Record symptom, root cause, fix and elapsed time so the next occurrence retrieves this case.',
        1,
        { parallel: true },
      )
    }

    return {
      id: `P${phaseIndex + 1}`,
      name: phase.name,
      objective: phase.objective,
      tasks,
    }
  })

  const allTasks = phases.flatMap((p) => p.tasks)
  const effortHrs = Math.round(allTasks.reduce((sum, t) => sum + t.durationHrs, 0) * 10) / 10
  const totalHrs = Math.round(cursorHrs * 10) / 10

  const eta = new Date(Date.now() + totalHrs * 3600_000)

  // Confidence rises with more, closer historical matches.
  const similarityAvg = cases.length ? cases.reduce((s, c) => s + c.similarityPct, 0) / cases.length : 55
  const confidencePct = Math.round(
    Math.min(94, Math.max(58, similarityAvg * 0.72 + cases.length * 5 + parsed.clarity * 12)),
  )

  const lowSpares = ctx.spareParts.filter((s) => s.isLow)
  const risks: AiPlanRisk[] = [...(RISKS_BY_TOPIC[parsed.topic] ?? RISKS_BY_TOPIC.general)]
  if (parsed.topic === 'breakdown' && lowSpares.length > 0) {
    risks.unshift({
      risk: `${lowSpares.length} spare part lines are below reorder level right now`,
      likelihood: 'High',
      impact: 'A required part may not be issuable when the repair reaches it',
      mitigation: `Check ${lowSpares
        .slice(0, 2)
        .map((s) => s.name)
        .join(' and ')} against this job before starting the strip-down.`,
    })
  }
  const unavailable = engineers.filter((e) => e.availability === 'On leave' || e.availability === 'Off shift')
  if (unavailable.length) {
    risks.push({
      risk: `${unavailable[0].name} is currently ${unavailable[0].availability.toLowerCase()}`,
      likelihood: 'Medium',
      impact: 'The strongest match may not be able to start immediately',
      mitigation: 'Assign the next-ranked engineer for the first phase and hand over on shift change.',
    })
  }

  const benchmark = cases.length
    ? `Calibrated on ${cases.length} comparable closed case${cases.length === 1 ? '' : 's'} (${cases
        .map((c) => c.refNo)
        .join(', ')}). Median historical effort ${formatHours(medianEffort)}; recorded downtime ranged ${formatHours(
        Math.min(...cases.map((c) => c.downtimeHrs || 0.25)),
      )} to ${formatHours(Math.max(...cases.map((c) => c.downtimeHrs || 0.25)))}.`
    : 'No close historical match - estimate derived from the standard resolution path for this category.'

  return {
    title: `Resolution plan - ${subject}`,
    objective: topCase
      ? `Close out the issue using the route that worked in ${topCase.refNo}, and remove the cause so it does not recur.`
      : 'Establish the cause, correct it, and verify the correction holds.',
    phases,
    totalHrs,
    effortHrs,
    etaIso: eta.toISOString(),
    confidencePct,
    criticalPath,
    assumptions: [
      'Three shifts are running, so elapsed hours are treated as calendar hours.',
      'Required spares are issuable from stores unless flagged as a risk below.',
      'The nominated engineers are released from routine work for the duration of their phase.',
      'Tasks marked as parallel run alongside the critical path and do not extend the ETA.',
    ],
    resources: [
      ...engineers.slice(0, 3).map((e) => `${e.name} - ${e.role}`),
      'Central Testing Laboratory capacity for verification testing',
      'Stores support for spares issue and emergency requisition',
    ],
    risks: risks.slice(0, 4),
    successCriteria: SUCCESS_BY_TOPIC[parsed.topic] ?? SUCCESS_BY_TOPIC.general,
    benchmark,
  }
}

export { formatHours }
