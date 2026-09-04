import type { ID } from './common'

export type CustomerSegment = 'Domestic' | 'Export'

/** Export regions published on tmills.com. */
export type ExportRegion = 'America' | 'Australia' | 'Europe' | 'South Asia'

export interface Customer {
  id: ID
  name: string
  country: string
  segment: CustomerSegment
  region?: ExportRegion
  city: string
  contactPerson: string
  email: string
  phone: string
  creditLimit: number
  currency: 'INR' | 'USD' | 'EUR'
  activeSince: string
  totalOrders: number
  rating: 1 | 2 | 3 | 4 | 5
}
