import type { SeriesPoint, Trend } from './common'

export type KpiId =
  | 'yarnProduction'
  | 'fabricProduction'
  | 'oee'
  | 'qualityPassRate'
  | 'ordersOnTime'
  | 'renewableEnergy'

export interface KpiCardData {
  id: KpiId
  label: string
  value: number
  displayValue: string
  unit: string
  trend: Trend
  sparkline: SeriesPoint[]
  linkTo: string
  /** Extra context shown under the value, e.g. "142 total" */
  footnote?: string
}

export interface OrderStatusTiles {
  onSchedule: number
  atRisk: number
  delayed: number
  completed: number
}
