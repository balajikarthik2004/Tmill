import type { Product } from '@/types'

export const products: Product[] = [
  { id: 'p-01', code: 'RS-20', name: '20s Ring Spun Carded', category: 'Yarn', type: 'Ring Spun', count: '20s', unit: 'kg', description: 'Carded cotton yarn for knitting' },
  { id: 'p-02', code: 'RS-30', name: '30s Ring Spun Combed', category: 'Yarn', type: 'Ring Spun', count: '30s', unit: 'kg', description: 'Combed cotton yarn, hosiery grade' },
  { id: 'p-03', code: 'RS-40', name: '40s Ring Spun Combed', category: 'Yarn', type: 'Ring Spun', count: '40s', unit: 'kg', description: 'Combed cotton yarn, weaving grade' },
  { id: 'p-04', code: 'RS-60', name: '60s Ring Spun Combed', category: 'Yarn', type: 'Ring Spun', count: '60s', unit: 'kg', description: 'Fine combed yarn for premium shirting' },
  { id: 'p-05', code: 'RS-80', name: '80s Ring Spun Combed', category: 'Yarn', type: 'Ring Spun', count: '80s', unit: 'kg', description: 'Super-fine yarn, export shirting' },
  { id: 'p-06', code: 'OE-10', name: '10s Open End', category: 'Yarn', type: 'Open End', count: '10s', unit: 'kg', description: 'Coarse open-end yarn for denim' },
  { id: 'p-07', code: 'OE-16', name: '16s Open End', category: 'Yarn', type: 'Open End', count: '16s', unit: 'kg', description: 'Open-end yarn for towelling' },
  { id: 'p-08', code: 'OE-20', name: '20s Open End', category: 'Yarn', type: 'Open End', count: '20s', unit: 'kg', description: 'Open-end yarn for home textiles' },
  { id: 'p-09', code: 'DB-2/40', name: '2/40s Doubled', category: 'Yarn', type: 'Doubled', count: '2/40s', unit: 'kg', description: 'Two-ply doubled yarn for sewing thread' },
  { id: 'p-10', code: 'DB-2/60', name: '2/60s Doubled', category: 'Yarn', type: 'Doubled', count: '2/60s', unit: 'kg', description: 'Two-ply doubled yarn, fine gauge' },
  { id: 'p-11', code: 'SP-COMP40', name: '40s Compact Specialty', category: 'Yarn', type: 'Specialty', count: '40s', unit: 'kg', description: 'Compact-spun yarn, low-hairiness' },
  { id: 'p-12', code: 'SP-SLUB', name: 'Slub Fancy Yarn', category: 'Yarn', type: 'Specialty', unit: 'kg', description: 'Slub effect fashion yarn' },
  { id: 'p-13', code: 'SP-MEL', name: 'Melange Blend Yarn', category: 'Yarn', type: 'Specialty', unit: 'kg', description: 'Cotton-viscose melange blend' },
  { id: 'p-14', code: 'FB-POP', name: 'Poplin Grey Fabric', category: 'Fabric', type: 'Fabric', unit: 'm', description: 'Plain weave poplin, greige' },
  { id: 'p-15', code: 'FB-TWL', name: 'Twill Fabric', category: 'Fabric', type: 'Fabric', unit: 'm', description: '3/1 twill weave fabric' },
  { id: 'p-16', code: 'FB-OXF', name: 'Oxford Shirting', category: 'Fabric', type: 'Fabric', unit: 'm', description: 'Basketweave oxford shirting fabric' },
  { id: 'p-17', code: 'FB-DEN', name: 'Denim Fabric', category: 'Fabric', type: 'Fabric', unit: 'm', description: '11 oz indigo denim' },
]

export const productById = new Map(products.map((p) => [p.id, p]))
export const productTypes = ['Ring Spun', 'Open End', 'Doubled', 'Specialty', 'Fabric'] as const
