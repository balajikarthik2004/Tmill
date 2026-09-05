/**
 * Product catalogue, following the ranges published on tmills.com: ring spun
 * NE 16s–140s in single and double, and open end NE 6s–10s. Compact yarn is
 * spun on the Rieter ComforSpin K44 machines the company was among the first in
 * India to install; gassed yarn is a house specialty.
 */
import type { Product } from '@/types'

export const products: Product[] = [
  // Single yarn — NE 16s to 80s combed, for knitting & weaving
  { id: 'p-s16', code: 'S-16', name: '16s Single Combed', category: 'Yarn', type: 'Single', count: '16s', unit: 'kg', application: 'Weaving', description: 'Coarse combed single yarn, auto-coned & spliced' },
  { id: 'p-s30', code: 'S-30', name: '30s Single Combed', category: 'Yarn', type: 'Single', count: '30s', unit: 'kg', application: 'Hosiery', description: 'Medium count combed single yarn for hosiery' },
  { id: 'p-s40', code: 'S-40', name: '40s Single Combed', category: 'Yarn', type: 'Single', count: '40s', unit: 'kg', application: 'Weaving', description: 'Combed single weaving yarn, contamination cleared' },
  { id: 'p-s60', code: 'S-60', name: '60s Single Combed', category: 'Yarn', type: 'Single', count: '60s', unit: 'kg', application: 'Knitting', description: 'Fine count combed single yarn' },
  { id: 'p-s80', code: 'S-80', name: '80s Single Combed', category: 'Yarn', type: 'Single', count: '80s', unit: 'kg', application: 'Weaving', description: 'Fine count combed yarn for premium shirting' },

  // Double yarn — NE 2/20s to 2/140s, twisted on TFO
  { id: 'p-d2-20', code: 'D-2/20', name: '2/20s Double', category: 'Yarn', type: 'Double', count: '2/20s', unit: 'kg', application: 'Weaving', description: 'Two-fold yarn twisted on TFO' },
  { id: 'p-d2-60', code: 'D-2/60', name: '2/60s Double', category: 'Yarn', type: 'Double', count: '2/60s', unit: 'kg', application: 'Weaving', description: 'Two-fold combed yarn, TFO/DD twist without knots' },
  { id: 'p-d2-100', code: 'D-2/100', name: '2/100s Double', category: 'Yarn', type: 'Double', count: '2/100s', unit: 'kg', application: 'Weaving', description: 'Fine two-fold combed yarn' },
  { id: 'p-d2-140', code: 'D-2/140', name: '2/140s Double', category: 'Yarn', type: 'Double', count: '2/140s', unit: 'kg', application: 'Weaving', description: 'Superfine multifold yarn, TFO twisted' },

  // Open end — NE 6s to 12s on OE-Schlafhorst
  { id: 'p-oe6', code: 'OE-6', name: '6s Open End', category: 'Yarn', type: 'Open End', count: '6s', unit: 'kg', application: 'Weaving', description: 'Coarse OE yarn on Schlafhorst Autocoro' },
  { id: 'p-oe10', code: 'OE-10', name: '10s Open End', category: 'Yarn', type: 'Open End', count: '10s', unit: 'kg', application: 'Weaving', description: 'OE yarn, heavy doubling available' },
  { id: 'p-oe8', code: 'OE-8', name: '8s Open End', category: 'Yarn', type: 'Open End', count: '8s', unit: 'kg', application: 'Weaving', description: 'OE yarn on Schlafhorst machines' },

  // Compact — Rieter ComforSpin K44
  { id: 'p-c40', code: 'C-40', name: '40s Compact', category: 'Yarn', type: 'Compact', count: '40s', unit: 'kg', application: 'Weaving', description: 'Compact spun on Rieter ComforSpin K44, low hairiness' },
  { id: 'p-c80', code: 'C-80', name: '80s Compact', category: 'Yarn', type: 'Compact', count: '80s', unit: 'kg', application: 'Knitting', description: 'Fine compact yarn on ComforSpin K44' },
  { id: 'p-c120', code: 'C-120', name: '120s Compact', category: 'Yarn', type: 'Compact', count: '120s', unit: 'kg', application: 'Weaving', description: 'Superfine compact yarn for premium shirting' },

  // Gassed — house specialty
  { id: 'p-g60', code: 'G-60', name: '60s Gassed', category: 'Yarn', type: 'Gassed', count: '60s', unit: 'kg', application: 'Weaving', description: 'Singed gassed yarn — house specialty' },
  { id: 'p-g2-80', code: 'G-2/80', name: '2/80s Gassed', category: 'Yarn', type: 'Gassed', count: '2/80s', unit: 'kg', application: 'Weaving', description: 'Doubled and gassed specialty yarn' },

]

export const productById = new Map(products.map((p) => [p.id, p]))

export const productTypes = ['Single', 'Double', 'Open End', 'Compact', 'Gassed'] as const

/** Marketing categories as listed on tmills.com. */
export const productCategories = [
  'Fine Count Combed Cotton Yarn',
  'Hosiery Yarn',
  'Coarse Count Combed Cotton Yarn',
  'Compact Yarn',
] as const
