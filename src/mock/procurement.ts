/**
 * Procurement documents (PR → PO → GRN). Item categories reflect what the mills
 * actually consume per tmills.com — cotton (Indian ELS, Egyptian, US Pima),
 * spares for the published machinery, packing material and consumables.
 */
import type { Grn, PurchaseOrder, PurchaseRequisition } from '@/types'
import { makeRng } from '@/lib/random'
import { suppliers } from './suppliers'
import { factories } from './factories'
import { cottonLots } from './cotton'

const rng = makeRng(1717)

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
function daysFromNowIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const itemsByCategory = {
  Cotton: ['Indian ELS Cotton', 'Egyptian Cotton', 'US Pima Cotton'],
  Spares: ['Ring Traveller', 'Spindle Tape', 'Cot & Apron Set', 'Drafting Roller', 'FR 900 Clearer Module', 'Loom Shuttle Spares'],
  'Packing Material': ['Cone Cartons', 'Pallets', 'HDPE Bags', 'Stretch Film'],
  Consumables: ['Spinning Oil', 'Cleaning Solvent', 'Lab Reagents'],
} as const

type Category = keyof typeof itemsByCategory
const categories = Object.keys(itemsByCategory) as Category[]
const requesters = ['V. Karthik', 'S. Murugan', 'R. Bala', 'A. Suresh', 'P. Lakshmi']

export const purchaseRequisitions: PurchaseRequisition[] = Array.from({ length: 34 }, (_, i) => {
  const category = rng.pick(categories)
  return {
    id: `pr-${String(i + 1).padStart(3, '0')}`,
    prNo: `PR-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    raisedDate: daysAgoIso(rng.int(1, 60)),
    requiredBy: daysFromNowIso(rng.int(2, 40)),
    itemName: rng.pick(itemsByCategory[category]),
    category,
    qty: category === 'Cotton' ? rng.int(20, 200) : rng.int(10, 500),
    unit: category === 'Cotton' ? 'MT' : 'pcs',
    factoryId: rng.pick(factories).id,
    raisedBy: rng.pick(requesters),
    status: rng.pick(['Draft', 'Submitted', 'Approved', 'Approved', 'Converted', 'Rejected']),
  }
})

const approvedPrs = purchaseRequisitions.filter((p) => p.status === 'Approved' || p.status === 'Converted')

export const purchaseOrders: PurchaseOrder[] = Array.from({ length: 42 }, (_, i) => {
  const pr = i < approvedPrs.length ? approvedPrs[i] : undefined
  const category = pr?.category ?? rng.pick(categories)
  const matchingSuppliers = suppliers.filter((s) => s.category === category)
  const supplier = rng.pick(matchingSuppliers.length ? matchingSuppliers : suppliers)
  const qty = pr?.qty ?? (category === 'Cotton' ? rng.int(20, 200) : rng.int(10, 500))
  const status = rng.pick<PurchaseOrder['status']>([
    'Open', 'Open', 'Partially Received', 'Received', 'Received', 'Closed', 'Cancelled',
  ])
  const receivedQty =
    status === 'Received' || status === 'Closed' ? qty : status === 'Partially Received' ? Math.round(qty * rng.float(0.3, 0.8, 2)) : 0
  const ratePerUnit = category === 'Cotton' ? rng.int(180, 320) * 100 : rng.int(120, 4200)

  return {
    id: `po-proc-${String(i + 1).padStart(3, '0')}`,
    poNo: `PO-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    prId: pr?.id,
    supplierId: supplier.id,
    supplierName: supplier.name,
    orderDate: daysAgoIso(rng.int(1, 50)),
    expectedDate: daysFromNowIso(rng.int(-10, 30)),
    itemName: pr?.itemName ?? rng.pick(itemsByCategory[category]),
    category,
    qty,
    receivedQty,
    unit: category === 'Cotton' ? 'MT' : 'pcs',
    ratePerUnit,
    valueInr: qty * ratePerUnit,
    status,
  }
})

const receivedPos = purchaseOrders.filter((p) => p.receivedQty > 0)

export const grns: Grn[] = receivedPos.map((po, i) => {
  const qtyReceived = po.receivedQty
  const status = rng.pick<Grn['status']>(['Accepted', 'Accepted', 'Accepted', 'Pending QC', 'Partially Accepted', 'Rejected'])
  const qtyAccepted =
    status === 'Accepted' ? qtyReceived : status === 'Rejected' ? 0 : Math.round(qtyReceived * rng.float(0.6, 0.95, 2))

  return {
    id: `grn-${String(i + 1).padStart(3, '0')}`,
    grnNo: `GRN-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    poId: po.id,
    poNo: po.poNo,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    receivedDate: daysAgoIso(rng.int(0, 30)),
    itemName: po.itemName,
    qtyReceived,
    qtyAccepted,
    unit: po.unit,
    cottonLotId: po.category === 'Cotton' ? rng.pick(cottonLots).id : undefined,
    status,
    inspectedBy: rng.pick(requesters),
  }
})
