import type { InventorySummary, StockMovement, StockMovementType } from '@/types'
import { makeRng } from '@/lib/random'
import { factories } from './factories'

const rng = makeRng(808)

export const inventorySummary: InventorySummary[] = [
  { category: 'Raw Cotton', currentQty: 3420, unit: 'MT', reorderLevel: 2800, daysOfStock: 24, belowReorder: false },
  { category: 'WIP', currentQty: 1250, unit: 'MT', reorderLevel: 900, daysOfStock: 9, belowReorder: false },
  { category: 'Finished Yarn', currentQty: 980, unit: 'MT', reorderLevel: 1100, daysOfStock: 7, belowReorder: true },
  { category: 'Fabric', currentQty: 1480000, unit: 'm', reorderLevel: 1200000, daysOfStock: 18, belowReorder: false },
]

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const movementTypes: StockMovementType[] = [
  'GRN', 'Issue', 'Transfer', 'Prod Consumption', 'Prod Receipt', 'Dispatch', 'Adjustment',
]
const itemsByCategory = {
  'Raw Cotton': ['Indian ELS Cotton', 'Suvin Cotton', 'Egyptian Giza Cotton', 'US Pima Cotton'],
  WIP: ['Carded Sliver', 'Combed Sliver', 'Roving Bobbins'],
  'Finished Yarn': ['20s Ring Spun', '40s Ring Spun Combed', '16s Open End'],
  Fabric: ['Poplin Grey Fabric', 'Twill Fabric', 'Denim Fabric'],
} as const

export const stockMovements: StockMovement[] = Array.from({ length: 60 }, (_, i) => {
  const category = rng.pick(Object.keys(itemsByCategory) as (keyof typeof itemsByCategory)[])
  const type = rng.pick(movementTypes)
  return {
    id: `sm-${String(i + 1).padStart(3, '0')}`,
    date: daysAgoIso(rng.int(0, 30)),
    type,
    category,
    itemName: rng.pick(itemsByCategory[category]),
    qty: rng.int(5, 500),
    unit: category === 'Fabric' ? 'm' : 'MT',
    factoryId: rng.pick(factories).id,
    referenceNo: `${type.slice(0, 3).toUpperCase()}-${rng.int(1000, 9999)}`,
  }
})
