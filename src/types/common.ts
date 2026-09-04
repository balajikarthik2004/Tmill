/** Shared primitives used across the domain model. All dates are ISO 8601 strings (UTC). */

export type ID = string
export type ISODate = string

export type TrendDirection = 'up' | 'down' | 'flat'

export interface Trend {
  /** Percentage change vs. the prior comparable period, e.g. 4.2 means +4.2% */
  changePct: number
  direction: TrendDirection
}

/** A single point in a time series, used by sparklines and trend charts. */
export interface SeriesPoint {
  date: ISODate
  value: number
}

export type DateRangePreset = 'today' | '7d' | '30d' | 'thisMonth'

export interface DateRange {
  preset: DateRangePreset
  from: ISODate
  to: ISODate
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type RiskLevel = 'onSchedule' | 'atRisk' | 'delayed' | 'completed'

/** Convenience wrapper mirroring a future REST/GraphQL response envelope. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
