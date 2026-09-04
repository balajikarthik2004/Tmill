import type { ID } from './common'

export type CustomerSegment = 'Domestic' | 'Export'

export interface Customer {
  id: ID
  name: string
  country: string
  segment: CustomerSegment
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
