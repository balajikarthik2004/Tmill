/**
 * Cotton lot register. Origins are the three cotton types published on
 * tmills.com (Indian ELS, Egyptian, US Pima). Lot numbers and test readings
 * are illustrative; HVI/AFIS parameters mirror the lab's published instruments.
 */
import type { CottonLot, CottonOrigin } from '@/types'
import { makeRng } from '@/lib/random'
import { suppliers } from './suppliers'

const rng = makeRng(303)
const cottonSuppliers = suppliers.filter((s) => s.category === 'Cotton')

const origins: CottonOrigin[] = ['Indian extra-long staple', 'Egyptian Cotton', 'US Pima']
const statuses: CottonLot['status'][] = ['In Testing', 'Approved', 'In Use', 'Consumed', 'On Hold']

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/** Staple length and micronaire bands appropriate to each cotton type. */
const originSpecs: Record<CottonOrigin, { staple: [number, number]; mic: [number, number]; strength: [number, number] }> = {
  'Indian extra-long staple': { staple: [30, 34], mic: [3.6, 4.4], strength: [28, 32] },
  'Egyptian Cotton': { staple: [33, 38], mic: [3.4, 4.2], strength: [30, 36] },
  'US Pima': { staple: [34, 40], mic: [3.7, 4.5], strength: [32, 38] },
}

export const cottonLots: CottonLot[] = Array.from({ length: 42 }, (_, i) => {
  const origin = rng.pick(origins)
  const spec = originSpecs[origin]
  const supplier = rng.pick(cottonSuppliers)
  const bales = rng.int(80, 420)
  return {
    id: `lot-${String(i + 1).padStart(3, '0')}`,
    lotNumber: `CL-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    origin,
    supplierId: supplier.id,
    supplierLotRef: `${supplier.name.slice(0, 3).toUpperCase()}-${rng.int(1000, 9999)}`,
    bales,
    weightKg: bales * 170,
    micronaire: rng.float(spec.mic[0], spec.mic[1], 2),
    staple: rng.float(spec.staple[0], spec.staple[1], 1),
    strength: rng.float(spec.strength[0], spec.strength[1], 1),
    trashPct: rng.float(1.2, 3.8, 1),
    moisturePct: rng.float(6.5, 8.5, 1),
    receivedDate: daysAgoIso(rng.int(2, 90)),
    warehouseLocation: `Cotton Godown ${rng.pick(['A', 'B', 'C'])}-${rng.int(1, 12)}`,
    status: i < 4 ? 'In Testing' : rng.pick(statuses),
  }
})

export const cottonLotById = new Map(cottonLots.map((c) => [c.id, c]))
