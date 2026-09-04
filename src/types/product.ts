export type ProductType = 'Ring Spun' | 'Open End' | 'Doubled' | 'Specialty' | 'Fabric'

export type ProductCategory = 'Yarn' | 'Fabric'

export interface Product {
  id: string
  code: string
  name: string
  category: ProductCategory
  type: ProductType
  count?: string // e.g. "40s", "60s Combed"
  unit: 'kg' | 'm'
  description: string
}
