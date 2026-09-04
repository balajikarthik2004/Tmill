/**
 * Activity feed derived from the mock transaction records — sales orders,
 * production orders, lab tests, GRNs and dispatches.
 */
import type { Activity, ActivityType } from '@/types'
import { makeRng } from '@/lib/random'
import { salesOrders } from './orders'
import { productionOrders } from './production'
import { qualityTests } from './quality'
import { grns } from './procurement'
import { dispatches } from './dispatch'

const rng = makeRng(1313)

function minutesAgoIso(mins: number) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - mins)
  return d.toISOString()
}

const actors = ['R. Anitha', 'S. Gopal', 'M. Devi', 'K. Rajesh', 'P. Saravanan', 'System']

interface Draft {
  type: ActivityType
  description: string
  linkTo: string
}

const drafts: Draft[] = [
  ...rng.shuffle(salesOrders).slice(0, 7).map((so) => ({
    type: 'SO Received' as ActivityType,
    description: `Sales order ${so.orderNo} received from ${so.customerName} (${so.country})`,
    linkTo: '/sales/sales-orders',
  })),
  ...rng.shuffle(productionOrders).slice(0, 7).map((po) => ({
    type: 'PO Started' as ActivityType,
    description: `Production order ${po.orderNo} started — ${po.productName} at ${po.process}`,
    linkTo: '/planning/production-orders',
  })),
  ...rng.shuffle(qualityTests).slice(0, 7).map((qt) => ({
    type: 'Quality Test' as ActivityType,
    description: `${qt.stage} test ${qt.testNo} completed on ${qt.instrument} — ${qt.result}`,
    linkTo: '/quality/lab-tests',
  })),
  ...rng.shuffle(grns).slice(0, 6).map((grn) => ({
    type: 'Material Received' as ActivityType,
    description: `${grn.grnNo} posted — ${grn.qtyReceived} ${grn.unit} ${grn.itemName} from ${grn.supplierName}`,
    linkTo: '/procurement/grn',
  })),
  ...rng.shuffle(dispatches).slice(0, 6).map((d) => ({
    type: 'Dispatch Completed' as ActivityType,
    description: `${d.dispatchNo} dispatched for ${d.salesOrderNo} to ${d.customerName}`,
    linkTo: '/sales/dispatch',
  })),
]

export const activities: Activity[] = rng
  .shuffle(drafts)
  .map((draft, i) => ({
    id: `act-${String(i + 1).padStart(3, '0')}`,
    type: draft.type,
    description: draft.description,
    timestamp: minutesAgoIso(rng.int(5, 2600)),
    linkTo: draft.linkTo,
    actor: rng.pick(actors),
  }))
  .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
