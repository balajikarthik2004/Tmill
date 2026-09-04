import type { CottonLot, CottonOrigin } from '@/types'
import { makeRng } from '@/lib/random'
import { suppliers } from './suppliers'

const rng = makeRng(303)
const cottonSuppliers = suppliers.filter((s) => s.category === 'Cotton')

const origins: CottonOrigin[] = ['Indian ELS', 'Suvin', 'Egyptian Giza', 'US Pima', 'Australian']
const statuses: CottonLot['status'][] = ['In Testing', 'Approved', 'In Use', 'Consumed', 'On Hold']

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export const cottonLots: CottonLot[] = Array.from({ length: 36 }, (_, i) => {
  const origin = rng.pick(origins)
  const supplier = rng.pick(cottonSuppliers)
  const bales = rng.int(80, 420)
  return {
    id: `lot-${String(i + 1).padStart(3, '0')}`,
    lotNumber: `CL-${2026}-${String(i + 1).padStart(4, '0')}`,
    origin,
    supplierId: supplier.id,
    supplierLotRef: `${supplier.name.slice(0, 3).toUpperCase()}-${rng.int(1000, 9999)}`,
    bales,
    weightKg: bales * 170,
    micronaire: rng.float(3.5, 4.8, 2),
    staple: rng.float(27, 36, 1),
    strength: rng.float(26, 34, 1),
    trashPct: rng.float(1.5, 4.5, 1),
    moisturePct: rng.float(6.5, 8.5, 1),
    receivedDate: daysAgoIso(rng.int(2, 90)),
    warehouseLocation: `Cotton Godown ${rng.pick(['A', 'B', 'C'])}-${rng.int(1, 12)}`,
    status: i < 4 ? 'In Testing' : rng.pick(statuses),
  }
})

export const cottonLotById = new Map(cottonLots.map((c) => [c.id, c]))
