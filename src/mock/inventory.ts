/**
 * Stock position and movements across raw cotton, work-in-progress and finished
 * yarn. The company spins; it does not weave, so there is no fabric stage.
 * Quantities are illustrative, sized to a daily output of roughly 26 tonnes.
 */
import type {
  InventoryCategory,
  InventorySummary,
  StockMovement,
  StockMovementType,
} from '@/types'
import { makeRng } from '@/lib/random'
import { factories } from './factories'

const rng = makeRng(808)

export const inventorySummary: InventorySummary[] = [
  { category: 'Raw Cotton', currentQty: 3420, unit: 'MT', reorderLevel: 2800, daysOfStock: 24, belowReorder: false },
  { category: 'WIP', currentQty: 1250, unit: 'MT', reorderLevel: 900, daysOfStock: 9, belowReorder: false },
  { category: 'Finished Yarn', currentQty: 980, unit: 'MT', reorderLevel: 1100, daysOfStock: 7, belowReorder: true },
]

/**
 * Standard rates used to value stock, in INR.
 *
 * Cotton is carried at landed cost, WIP at cotton cost plus the conversion
 * spent to that stage, finished yarn at full works cost, and greige fabric per
 * metre. Rates are illustrative but sit in the right band for combed cotton
 * yarn: raw cotton around a candy price of Rs 62,000 for 355 kg, and yarn at a
 * realistic works cost for the fine-count mix this plant runs.
 */
export const standardRateInr: Record<InventoryCategory, { rate: number; basis: string }> = {
  'Raw Cotton': { rate: 175, basis: 'per kg landed, blended across Indian ELS, Giza and Supima' },
  WIP: { rate: 214, basis: 'per kg — cotton cost plus conversion to the sliver and roving stages' },
  'Finished Yarn': { rate: 302, basis: 'per kg works cost, weighted across the count mix' },
}

/** Godown capacity per unit, in tonnes. */
export const godownCapacityMt: Record<string, number> = {
  'mill-1': 1650,
  'mill-2': 2100,
  'mill-3': 1850,
  'oe-unit': 1250,
}

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const movementTypes: StockMovementType[] = [
  'GRN', 'Issue', 'Transfer', 'Prod Consumption', 'Prod Receipt', 'Dispatch', 'Adjustment',
]

const itemsByCategory = {
  'Raw Cotton': ['Indian ELS Cotton', 'Egyptian Cotton', 'US Pima Cotton'],
  WIP: ['Carded Sliver', 'Combed Sliver', 'Roving Bobbins', 'Grey Cones (pre-winding)'],
  'Finished Yarn': ['40s Single Combed', '2/60s Double', '10s Open End', '80s Compact', '60s Gassed'],
} as const

export const stockMovements: StockMovement[] = Array.from({ length: 80 }, (_, i) => {
  const category = rng.pick(Object.keys(itemsByCategory) as (keyof typeof itemsByCategory)[])
  const type = rng.pick(movementTypes)
  return {
    id: `sm-${String(i + 1).padStart(3, '0')}`,
    date: daysAgoIso(rng.int(0, 30)),
    type,
    category,
    itemName: rng.pick(itemsByCategory[category]),
    qty: rng.int(5, 500),
    unit: 'MT' as const,
    factoryId: rng.pick(factories).id,
    referenceNo: `${type.slice(0, 3).toUpperCase()}-${rng.int(1000, 9999)}`,
  }
})
