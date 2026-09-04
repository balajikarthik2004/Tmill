/** Product types as published on tmills.com. */
export type ProductType = 'Single' | 'Double' | 'Open End' | 'Compact' | 'Gassed' 

export type ProductCategory = 'Yarn' | 'Fabric'

export type YarnApplication = 'Knitting' | 'Weaving' | 'Hosiery'

export interface Product {
  id: string
  code: string
  name: string
  category: ProductCategory
  type: ProductType
  count?: string
  unit: 'kg' | 'm'
  application: YarnApplication
  description: string
}
