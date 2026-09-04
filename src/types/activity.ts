import type { ID, ISODate } from './common'

export type ActivityType =
  | 'SO Received'
  | 'PO Started'
  | 'Quality Test'
  | 'Material Received'
  | 'Invoice Generated'
  | 'Dispatch Completed'

export interface Activity {
  id: ID
  type: ActivityType
  description: string
  timestamp: ISODate
  linkTo: string
  actor: string
}
