/**
 * Operational alerts derived from the live mock state — breakdowns from the
 * machine registry, at-risk orders from the order book, stock below reorder,
 * failed lab tests and overdue PM.
 */
import type { Alert } from '@/types'
import { breakdowns, pmTasks, spareParts } from './maintenance'
import { salesOrders } from './orders'
import { inventorySummary } from './inventory'
import { qualityTests } from './quality'
import { machineById } from './machines'
import { factoryById } from './factories'
import { productById } from './products'

function minutesAgoIso(mins: number) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - mins)
  return d.toISOString()
}

const alerts: Alert[] = []
let seq = 0
const nextId = () => `al-${String(++seq).padStart(3, '0')}`

// Machine breakdowns
breakdowns.forEach((bd, i) => {
  const machine = machineById.get(bd.machineId)
  const factory = factoryById.get(bd.factoryId as never)
  alerts.push({
    id: nextId(),
    severity: 'critical',
    category: 'Maintenance',
    title: `Machine ${bd.machineCode} down — ${factory?.name ?? 'Unit'}`,
    detail: `${machine?.make ?? 'Machine'} in breakdown. Reported cause: ${bd.reason}.`,
    timestamp: minutesAgoIso(35 + i * 22),
    linkTo: '/maintenance/breakdown',
    acknowledged: false,
  })
})

// At-risk and delayed orders
salesOrders
  .filter((o) => o.risk === 'atRisk' || o.risk === 'delayed')
  .slice(0, 6)
  .forEach((order, i) => {
    const daysToDue = Math.round((new Date(order.dueDate).getTime() - Date.now()) / 86400000)
    alerts.push({
      id: nextId(),
      severity: order.risk === 'delayed' ? 'critical' : 'high',
      category: 'Orders',
      title:
        order.risk === 'delayed'
          ? `Order ${order.orderNo} delayed — ${Math.abs(daysToDue)} days overdue`
          : `Order ${order.orderNo} at risk — ${daysToDue} days`,
      detail: `${order.customerName} (${order.country}) · ${order.productName}. ${order.riskReason ?? ''}`.trim(),
      timestamp: minutesAgoIso(70 + i * 40),
      linkTo: '/sales/sales-orders?risk=high',
      acknowledged: false,
    })
  })

// Stock below reorder level
inventorySummary
  .filter((item) => item.belowReorder)
  .forEach((item, i) => {
    alerts.push({
      id: nextId(),
      severity: 'high',
      category: 'Inventory',
      title: `${item.category} below reorder level`,
      detail: `At ${item.currentQty.toLocaleString('en-IN')} ${item.unit} against a reorder level of ${item.reorderLevel.toLocaleString('en-IN')} ${item.unit} — ${item.daysOfStock} days of cover.`,
      timestamp: minutesAgoIso(120 + i * 30),
      linkTo: '/inventory/finished-goods',
      acknowledged: false,
    })
  })

// Failed lab tests
qualityTests
  .filter((t) => t.result === 'Fail')
  .slice(0, 4)
  .forEach((test, i) => {
    const product = test.productId ? productById.get(test.productId) : undefined
    alerts.push({
      id: nextId(),
      severity: 'medium',
      category: 'Quality',
      title: `Quality deviation — ${product?.name ?? test.stage} (${test.testNo})`,
      detail: `${test.instrument} reading outside tolerance on ${test.stage.toLowerCase()} test.`,
      timestamp: minutesAgoIso(180 + i * 45),
      linkTo: '/quality/lab-tests',
      acknowledged: false,
    })
  })

// PM due
const pmDue = pmTasks.filter((t) => t.status === 'Due' || t.status === 'Overdue')
if (pmDue.length > 0) {
  alerts.push({
    id: nextId(),
    severity: 'medium',
    category: 'Maintenance',
    title: `PM due — ${pmDue.length} machines`,
    detail: `${pmDue.filter((t) => t.status === 'Overdue').length} overdue. Preventive maintenance scheduled across the units.`,
    timestamp: minutesAgoIso(300),
    linkTo: '/maintenance/pm',
    acknowledged: false,
  })
}

// Low spares
const lowSpares = spareParts.filter((s) => s.isLow)
if (lowSpares.length > 0) {
  alerts.push({
    id: nextId(),
    severity: 'low',
    category: 'Maintenance',
    title: `Spare parts low — ${lowSpares.length} items`,
    detail: `Below reorder level: ${lowSpares.slice(0, 3).map((s) => s.name).join(', ')}${lowSpares.length > 3 ? '…' : ''}`,
    timestamp: minutesAgoIso(420),
    linkTo: '/maintenance/spare-parts',
    acknowledged: true,
  })
}

const severityRank: Record<Alert['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (a.timestamp < b.timestamp ? 1 : -1))

export { alerts }
