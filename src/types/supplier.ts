import type { ID } from './common'

export type SupplierCategory = 'Cotton' | 'Spares' | 'Dyes & Chemicals' | 'Packing Material' | 'Services'

export interface Supplier {
  id: ID
  name: string
  category: SupplierCategory
  country: string
  city: string
  contactPerson: string
  email: string
  phone: string
  rating: 1 | 2 | 3 | 4 | 5
  activeSince: string
  totalPOs: number
}
