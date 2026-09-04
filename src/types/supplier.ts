import type { ID } from './common'

/** Categories the mills actually buy — cotton, machinery spares, packing and consumables. */
export type SupplierCategory = 'Cotton' | 'Spares' | 'Packing Material' | 'Consumables'

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
  /** For cotton suppliers — which of the published cotton types they supply. */
  suppliesOrigins?: string[]
}
