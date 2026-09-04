import type { FinanceSummary, ProfitabilityRow } from '@/types'
import { makeRng } from '@/lib/random'
import { customers } from './customers'
import { productTypes } from './products'
import { factories } from './factories'

const rng = makeRng(1111)

export const financeSummary: FinanceSummary = {
  revenueInr: 428_600_000,
  purchaseCostInr: 186_400_000,
  productionCostInr: 94_200_000,
  energyCostInr: 21_800_000,
  maintenanceCostInr: 9_600_000,
  grossMarginPct: 27.8,
  receivablesInr: 112_400_000,
  payablesInr: 68_900_000,
}

export const profitabilityByCustomer: ProfitabilityRow[] = customers.slice(0, 10).map((c) => {
  const revenueInr = rng.int(8, 42) * 1_000_000
  const marginPct = rng.float(14, 34, 1)
  return { key: c.id, label: c.name, revenueInr, costInr: Math.round(revenueInr * (1 - marginPct / 100)), marginPct }
})

export const profitabilityByProduct: ProfitabilityRow[] = productTypes.map((t) => {
  const revenueInr = rng.int(20, 90) * 1_000_000
  const marginPct = rng.float(15, 32, 1)
  return { key: t, label: t, revenueInr, costInr: Math.round(revenueInr * (1 - marginPct / 100)), marginPct }
})

export const profitabilityByFactory: ProfitabilityRow[] = factories.map((f) => {
  const revenueInr = rng.int(60, 150) * 1_000_000
  const marginPct = rng.float(18, 30, 1)
  return { key: f.id, label: f.name, revenueInr, costInr: Math.round(revenueInr * (1 - marginPct / 100)), marginPct }
})
