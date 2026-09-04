import type { Activity, ActivityType } from '@/types'
import { makeRng } from '@/lib/random'
import { salesOrders } from './orders'
import { suppliers } from './suppliers'

const rng = makeRng(1313)

function minutesAgoIso(mins: number) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - mins)
  return d.toISOString()
}

const types: ActivityType[] = [
  'SO Received', 'PO Started', 'Quality Test', 'Material Received', 'Invoice Generated', 'Dispatch Completed',
]
const actors = ['R. Anitha', 'S. Gopal', 'M. Devi', 'K. Rajesh', 'System', 'P. Saravanan']

function describe(type: ActivityType): { description: string; linkTo: string } {
  switch (type) {
    case 'SO Received': {
      const so = rng.pick(salesOrders)
      return { description: `New sales order ${so.orderNo} received from ${so.customerName}`, linkTo: '/sales/sales-orders' }
    }
    case 'PO Started': {
      const so = rng.pick(salesOrders)
      return { description: `Production started for order ${so.orderNo} — ${so.productName}`, linkTo: '/production' }
    }
    case 'Quality Test':
      return { description: 'Lab test completed for latest yarn batch', linkTo: '/quality/lab-tests' }
    case 'Material Received': {
      const s = rng.pick(suppliers)
      return { description: `GRN posted for cotton lot received from ${s.name}`, linkTo: '/cotton/cotton-lots' }
    }
    case 'Invoice Generated': {
      const so = rng.pick(salesOrders)
      return { description: `Invoice generated for order ${so.orderNo}`, linkTo: '/finance/receivables' }
    }
    case 'Dispatch Completed': {
      const so = rng.pick(salesOrders)
      return { description: `Dispatch completed for order ${so.orderNo} to ${so.customerName}`, linkTo: '/sales/dispatch' }
    }
  }
}

export const activities: Activity[] = Array.from({ length: 32 }, (_, i) => {
  const type = rng.pick(types)
  const { description, linkTo } = describe(type)
  return {
    id: `act-${String(i + 1).padStart(3, '0')}`,
    type,
    description,
    timestamp: minutesAgoIso(rng.int(2, 4000)),
    linkTo,
    actor: rng.pick(actors),
  }
}).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
