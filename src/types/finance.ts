export interface FinanceSummary {
  revenueInr: number
  purchaseCostInr: number
  productionCostInr: number
  energyCostInr: number
  maintenanceCostInr: number
  grossMarginPct: number
  receivablesInr: number
  payablesInr: number
}

export interface ProfitabilityRow {
  key: string
  label: string
  revenueInr: number
  costInr: number
  marginPct: number
}
