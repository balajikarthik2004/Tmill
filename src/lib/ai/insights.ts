/**
 * Contextual insight generation.
 *
 * These are the short, proactive cards the copilot drops onto the main
 * dashboards - the "AI noticed something" surface. Each one is derived from a
 * live condition in the plant snapshot, carries an impact figure, and links
 * through to a full copilot answer via its `prompt`.
 */
import type { AiInsight, AiScope } from '@/types'
import { formatInrCompact, formatKg, formatNumber, formatPct } from '@/lib/format'
import type { AiDataContext } from './context'
import { factoryLabel } from './context'

const daysBetween = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 86400000)

export function buildInsights(ctx: AiDataContext): AiInsight[] {
  const insights: AiInsight[] = []
  let seq = 0
  const nextId = () => `ins-${String(++seq).padStart(3, '0')}`

  const down = ctx.machines.filter((m) => m.status === 'Breakdown')
  const atRisk = ctx.salesOrders.filter((o) => o.risk === 'atRisk')
  const delayed = ctx.salesOrders.filter((o) => o.risk === 'delayed')
  const lowSpares = ctx.spareParts.filter((s) => s.isLow)
  const overduePm = ctx.pmTasks.filter((t) => t.status === 'Overdue')
  const failedTests = ctx.qualityTests.filter((t) => t.result === 'Fail')
  const belowReorder = ctx.inventory.filter((i) => i.belowReorder)
  const inTesting = ctx.cottonLots.filter((l) => l.status === 'In Testing')

  const cutoff = Date.now() - 7 * 86400000
  const recent = ctx.productionRecords.filter((r) => new Date(r.date).getTime() >= cutoff)
  const actual = recent.reduce((s, r) => s + r.actualKg, 0)
  const target = recent.reduce((s, r) => s + r.targetKg, 0)
  const achievement = target ? (actual / target) * 100 : 100

  /* ------------------------------------------------------------ dashboard */

  if (delayed.length || atRisk.length) {
    const exposure = [...delayed, ...atRisk].reduce((s, o) => s + o.valueInr, 0)
    const soonest = [...delayed, ...atRisk].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )[0]
    insights.push({
      id: nextId(),
      scope: 'dashboard',
      kind: 'risk',
      title: `${delayed.length + atRisk.length} orders need intervention this week`,
      detail: `${delayed.length} are already past their committed date and ${atRisk.length} are at risk. ${soonest.orderNo} for ${soonest.customerName} is the most time-critical${
        soonest.riskReason ? ` — flagged as "${soonest.riskReason}"` : ''
      }.`,
      impact: `${formatInrCompact(exposure)} of order value exposed`,
      confidencePct: 91,
      severity: delayed.length ? 'critical' : 'high',
      prompt: `Why is ${soonest.orderNo} at risk and how do we recover it?`,
      linkTo: '/sales/sales-orders?risk=high',
      linkLabel: 'Open at-risk orders',
    })
  }

  if (down.length) {
    const first = down[0]
    const record = ctx.breakdowns.find((b) => b.machineId === first.id)
    insights.push({
      id: nextId(),
      scope: 'dashboard',
      kind: 'anomaly',
      title: `${down.length} machines are down — ${down.map((m) => m.code).join(', ')}`,
      detail: `${first.code} (${first.make}) in ${factoryLabel(ctx, first.factoryId)} is stopped${
        record ? ` on "${record.reason}"` : ''
      }. The knowledge base holds closed cases with the same signature and the engineers who fixed them.`,
      impact: `${down.length} assets at zero output`,
      confidencePct: 96,
      severity: 'critical',
      prompt: `${first.code} is down${record ? ` with ${record.reason.toLowerCase()}` : ''}. How do we resolve it and how long will it take?`,
      linkTo: '/maintenance/breakdown',
      linkLabel: 'Open breakdown register',
    })
  }

  if (achievement < 99) {
    insights.push({
      id: nextId(),
      scope: 'dashboard',
      kind: 'forecast',
      title: `Output is tracking ${formatPct(100 - achievement)} below target`,
      detail: `${formatKg(actual)} produced against ${formatKg(target)} over the last seven days. On the current run rate the gap widens rather than closes without an intervention on downtime and changeover losses.`,
      impact: `${formatKg(Math.max(0, target - actual))} shortfall this week`,
      confidencePct: 87,
      severity: achievement < 92 ? 'high' : 'medium',
      prompt: 'Why did production fall short this week and how do we recover it?',
      linkTo: '/production',
      linkLabel: 'Open production overview',
    })
  }

  /* ----------------------------------------------------------- production */

  const running = ctx.machines.filter((m) => m.status === 'Running')
  const worstOee = [...running].sort((a, b) => a.oeePct - b.oeePct)[0]
  if (worstOee) {
    insights.push({
      id: nextId(),
      scope: 'production',
      kind: 'opportunity',
      title: `${worstOee.code} is the weakest running asset at ${formatPct(worstOee.oeePct)} OEE`,
      detail: `A ${worstOee.make} on ${worstOee.process} in ${factoryLabel(ctx, worstOee.factoryId)}. Comparable cases recovered several OEE points by attacking micro-stoppages — end breaks and doffing waits — rather than any single fault.`,
      impact: 'Recoverable hours without capital spend',
      confidencePct: 82,
      severity: 'medium',
      prompt: `Why is OEE low on ${worstOee.code} and what do we do about it?`,
      linkTo: '/maintenance/machine-dashboard',
      linkLabel: 'Open machine dashboard',
    })
  }

  const idle = ctx.machines.filter((m) => m.status === 'Idle')
  if (idle.length) {
    insights.push({
      id: nextId(),
      scope: 'production',
      kind: 'recommendation',
      title: `${idle.length} assets are idle while orders sit in the queue`,
      detail: `Idle machines across ${[...new Set(idle.map((m) => m.process))].slice(0, 3).join(', ')} could absorb part of the open backlog if the plan is re-sequenced against due dates.`,
      impact: `${idle.length} assets available to load`,
      confidencePct: 78,
      severity: 'medium',
      prompt: 'Which idle machines can we load to recover the production shortfall?',
      linkTo: '/planning/capacity-planning',
      linkLabel: 'Open capacity planning',
    })
  }

  /* -------------------------------------------------------------- quality */

  if (failedTests.length) {
    const byInstrument = new Map<string, number>()
    for (const test of failedTests) byInstrument.set(test.instrument, (byInstrument.get(test.instrument) ?? 0) + 1)
    const worst = [...byInstrument.entries()].sort((a, b) => b[1] - a[1])[0]
    insights.push({
      id: nextId(),
      scope: 'quality',
      kind: 'anomaly',
      title: `${failedTests.length} failed tests, clustering on the ${worst[0]}`,
      detail: `${worst[1]} of the failures came off the same instrument, which points at a process or material cause rather than random variation. The case history separates mixing drift from drafting wear for exactly this pattern.`,
      impact: `Pass rate at ${formatPct(ctx.qualityPassRatePct)}`,
      confidencePct: 85,
      severity: 'high',
      prompt: `What is driving the quality deviations on the ${worst[0]}?`,
      linkTo: '/quality/lab-tests',
      linkLabel: 'Open lab tests',
    })
  }

  const openComplaints = ctx.complaints.filter((c) => c.status === 'Open' || c.status === 'Investigating')
  if (openComplaints.length) {
    insights.push({
      id: nextId(),
      scope: 'quality',
      kind: 'risk',
      title: `${openComplaints.length} customer complaints still open`,
      detail: `Oldest is ${openComplaints[0].complaintNo} from ${openComplaints[0].customerName} on ${openComplaints[0].category}. Complaints closed with a documented corrective action have not recurred at the same account.`,
      impact: 'Customer relationship exposure',
      confidencePct: 80,
      severity: 'medium',
      prompt: `How should we resolve complaint ${openComplaints[0].complaintNo} from ${openComplaints[0].customerName}?`,
      linkTo: '/quality/complaints',
      linkLabel: 'Open complaints',
    })
  }

  /* ---------------------------------------------------------- maintenance */

  if (overduePm.length) {
    insights.push({
      id: nextId(),
      scope: 'maintenance',
      kind: 'risk',
      title: `${overduePm.length} preventive tasks are overdue`,
      detail: `Overdue preventive work is the contributing factor recorded in most of the bearing and drive failures in the knowledge base. ${overduePm
        .slice(0, 3)
        .map((t) => t.machineCode)
        .join(', ')} are the oldest outstanding.`,
      impact: 'Raises the probability of an unplanned stoppage',
      confidencePct: 88,
      severity: 'high',
      prompt: 'Which overdue PM tasks carry the highest breakdown risk?',
      linkTo: '/maintenance/pm',
      linkLabel: 'Open PM schedule',
    })
  }

  if (lowSpares.length) {
    insights.push({
      id: nextId(),
      scope: 'maintenance',
      kind: 'risk',
      title: `${lowSpares.length} spare lines below reorder level`,
      detail: `${lowSpares
        .slice(0, 3)
        .map((s) => s.name)
        .join(', ')} are short. In the case history, a stockout during a live repair turned a four-hour job into a fourteen-hour one.`,
      impact: 'Extends any repair that needs these parts',
      confidencePct: 90,
      severity: 'medium',
      prompt: 'Which low spares put a current repair at risk?',
      linkTo: '/maintenance/spare-parts',
      linkLabel: 'Open spare parts',
    })
  }

  const criticalDue = ctx.machines
    .filter((m) => m.isCritical && daysBetween(m.nextPmDueDate) < 3)
    .slice(0, 1)
  if (criticalDue.length) {
    insights.push({
      id: nextId(),
      scope: 'maintenance',
      kind: 'forecast',
      title: `${criticalDue[0].code} is a critical asset with PM due`,
      detail: `${criticalDue[0].make} on ${criticalDue[0].process}, currently ${criticalDue[0].status.toLowerCase()} at ${formatPct(
        criticalDue[0].oeePct,
      )} OEE. Servicing it inside the window avoids the failure mode that has repeated on this asset class.`,
      impact: 'Prevents an unplanned stoppage on a critical asset',
      confidencePct: 79,
      severity: 'medium',
      prompt: `What is the risk on ${criticalDue[0].code} and when should we service it?`,
      linkTo: '/maintenance/pm',
      linkLabel: 'Open PM schedule',
    })
  }

  /* ---------------------------------------------------------------- sales */

  if (atRisk.length || delayed.length) {
    const worst = [...delayed, ...atRisk].sort((a, b) => b.valueInr - a.valueInr)[0]
    insights.push({
      id: nextId(),
      scope: 'sales',
      kind: 'risk',
      title: `${worst.orderNo} is the largest exposure at ${formatInrCompact(worst.valueInr)}`,
      detail: `${worst.customerName} (${worst.country}) — ${formatNumber(worst.qtyOrdered)} ${worst.unit} of ${worst.productName}, ${
        daysBetween(worst.dueDate) < 0
          ? `${Math.abs(daysBetween(worst.dueDate))} days overdue`
          : `due in ${daysBetween(worst.dueDate)} days`
      }, production at ${worst.productionPct}%.`,
      impact: `${formatInrCompact(worst.valueInr)} at risk`,
      confidencePct: 89,
      severity: worst.risk === 'delayed' ? 'critical' : 'high',
      prompt: `How do we recover ${worst.orderNo} for ${worst.customerName}?`,
      linkTo: '/sales/sales-orders?risk=high',
      linkLabel: 'Open at-risk orders',
    })
  }

  const exportOrders = ctx.salesOrders.filter((o) => o.isExport && o.risk !== 'completed')
  if (exportOrders.length) {
    insights.push({
      id: nextId(),
      scope: 'sales',
      kind: 'opportunity',
      title: `${exportOrders.length} open export orders across ${new Set(exportOrders.map((o) => o.country)).size} countries`,
      detail: `Export commitments dominate the open book. Booking container space at order confirmation rather than at goods-ready removed a repeat delay driver in the case history.`,
      impact: `${formatInrCompact(exportOrders.reduce((s, o) => s + o.valueInr, 0))} open export value`,
      confidencePct: 76,
      severity: 'info',
      prompt: 'How is our export order book performing and where is the risk?',
      linkTo: '/sales/export-orders',
      linkLabel: 'Open export orders',
    })
  }

  /* ------------------------------------------------------------ inventory */

  if (belowReorder.length) {
    const item = belowReorder[0]
    insights.push({
      id: nextId(),
      scope: 'inventory',
      kind: 'risk',
      title: `${item.category} is below reorder level`,
      detail: `${formatNumber(item.currentQty)} ${item.unit} against a reorder level of ${formatNumber(
        item.reorderLevel,
      )} ${item.unit} — ${item.daysOfStock} days of cover. Comparable cases rebuilt cover in about nine days by re-prioritising the short counts.`,
      impact: `${item.daysOfStock} days of cover remaining`,
      confidencePct: 92,
      severity: 'high',
      prompt: `${item.category} is below reorder level. Which orders does that threaten and how do we rebuild cover?`,
      linkTo: '/inventory/finished-goods',
      linkLabel: 'Open finished goods',
    })
  }

  if (inTesting.length) {
    insights.push({
      id: nextId(),
      scope: 'inventory',
      kind: 'forecast',
      title: `${inTesting.length} cotton lots still awaiting clearance`,
      detail: `Lots in testing are not yet available to the mixing. Clearance delay is the most common upstream cause of a slipped spinning start in the case history.`,
      impact: `${formatNumber(inTesting.reduce((s, l) => s + l.bales, 0))} bales held pending test`,
      confidencePct: 84,
      severity: 'medium',
      prompt: 'Which orders depend on the cotton lots still in testing?',
      linkTo: '/cotton/cotton-testing',
      linkLabel: 'Open cotton testing',
    })
  }

  /* --------------------------------------------------------------- energy */

  const energyCutoff = Date.now() - 7 * 86400000
  const recentEnergy = ctx.energyRecords.filter((r) => new Date(r.date).getTime() >= energyCutoff)
  const priorEnergy = ctx.energyRecords.filter((r) => {
    const t = new Date(r.date).getTime()
    return t < energyCutoff && t >= energyCutoff - 7 * 86400000
  })
  if (recentEnergy.length && priorEnergy.length) {
    const now = recentEnergy.reduce((s, r) => s + r.totalKwh, 0) / Math.max(1, recentEnergy.reduce((s, r) => s + r.outputKg, 0))
    const before = priorEnergy.reduce((s, r) => s + r.totalKwh, 0) / Math.max(1, priorEnergy.reduce((s, r) => s + r.outputKg, 0))
    const deltaPct = before ? ((now - before) / before) * 100 : 0
    insights.push({
      id: nextId(),
      scope: 'energy',
      kind: deltaPct > 2 ? 'anomaly' : 'opportunity',
      title:
        deltaPct > 2
          ? `Specific energy is up ${deltaPct.toFixed(1)}% week on week`
          : `Specific energy is holding at ${now.toFixed(2)} kWh/kg`,
      detail:
        deltaPct > 2
          ? `${now.toFixed(2)} kWh/kg against ${before.toFixed(2)} last week with no matching production change. Compressed air leaks and humidification set points are the two drivers that explain most of this pattern historically.`
          : `${now.toFixed(2)} kWh/kg against ${before.toFixed(2)} last week. A leak survey typically still finds recoverable load even at a stable intensity.`,
      impact: deltaPct > 2 ? 'Avoidable cost on the monthly bill' : 'Incremental saving available',
      confidencePct: 83,
      severity: deltaPct > 4 ? 'high' : 'medium',
      prompt: 'Why has our energy consumption per kg moved and where is the excess?',
      linkTo: '/energy',
      linkLabel: 'Open energy dashboard',
    })
  }

  const avgPf = recentEnergy.length
    ? recentEnergy.reduce((s, r) => s + r.powerFactor, 0) / recentEnergy.length
    : 1
  if (avgPf < 0.97) {
    insights.push({
      id: nextId(),
      scope: 'energy',
      kind: 'recommendation',
      title: `Power factor averaging ${avgPf.toFixed(2)}`,
      detail: `Below the threshold that attracts a penalty on the utility bill. Failed capacitor bank steps were the recorded cause the last time this happened.`,
      impact: 'Avoidable penalty on the monthly bill',
      confidencePct: 81,
      severity: 'low',
      prompt: 'Why is our power factor low and how do we correct it?',
      linkTo: '/energy',
      linkLabel: 'Open energy dashboard',
    })
  }

  return insights
}

export function insightsForScope(ctx: AiDataContext, scope: AiScope, limit = 3): AiInsight[] {
  const all = buildInsights(ctx)
  const severityRank: Record<AiInsight['severity'], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  }
  const scoped = all.filter((i) => i.scope === scope)
  const pool = scoped.length >= limit ? scoped : [...scoped, ...all.filter((i) => i.scope !== scope)]
  return pool
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.confidencePct - a.confidencePct)
    .slice(0, limit)
}
