import type { ID, ISODate, Severity } from './common'

export type AlertCategory =
  | 'Maintenance'
  | 'Orders'
  | 'Inventory'
  | 'Quality'
  | 'Production'
  | 'Energy'

export interface Alert {
  id: ID
  severity: Severity
  category: AlertCategory
  title: string
  detail: string
  timestamp: ISODate
  linkTo: string
  acknowledged: boolean
}
