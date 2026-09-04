import type { Dispatch } from '@/types'
import { makeRng } from '@/lib/random'
import { salesOrders } from './orders'

const rng = makeRng(1616)

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const dispatchable = salesOrders.filter((o) => o.stage === 'Dispatch' || o.stage === 'Completed').slice(0, 60)

export const dispatches: Dispatch[] = dispatchable.map((so, i) => ({
  id: `dsp-${String(i + 1).padStart(3, '0')}`,
  dispatchNo: `DSP-2026-${String(i + 1).padStart(4, '0')}`,
  salesOrderId: so.id,
  salesOrderNo: so.orderNo,
  customerName: so.customerName,
  dispatchDate: daysAgoIso(rng.int(0, 20)),
  qty: so.qtyOrdered,
  unit: so.unit,
  vehicleNo: so.isExport ? undefined : `TN-${rng.int(10, 99)}-${rng.pick(['AB', 'CD', 'EF'])}-${rng.int(1000, 9999)}`,
  containerNo: so.isExport ? `MSCU${rng.int(1000000, 9999999)}` : undefined,
  status: so.stage === 'Completed' ? 'Delivered' : rng.pick(['Pending', 'Dispatched', 'In Transit']),
}))
