/**
 * Supplier register. Cotton suppliers are sourced from the three growing regions
 * behind the cotton types published on tmills.com (Indian ELS, Egyptian, US Pima);
 * spares suppliers correspond to the published machinery makes. Company names
 * and contact details are illustrative.
 */
import type { Supplier } from '@/types'
import { makeRng } from '@/lib/random'

const rng = makeRng(202)

interface Seed {
  name: string
  category: Supplier['category']
  country: string
  city: string
  suppliesOrigins?: string[]
}

const seeds: Seed[] = [
  // Cotton — matched to the three published cotton types
  { name: 'Gujarat Cotton Ginners', category: 'Cotton', country: 'India', city: 'Ahmedabad', suppliesOrigins: ['Indian extra-long staple'] },
  { name: 'Maharashtra Kapas Traders', category: 'Cotton', country: 'India', city: 'Nagpur', suppliesOrigins: ['Indian extra-long staple'] },
  { name: 'Tamil Nadu Cotton Corporation', category: 'Cotton', country: 'India', city: 'Coimbatore', suppliesOrigins: ['Indian extra-long staple'] },
  { name: 'Alexandria Cotton Exports', category: 'Cotton', country: 'Egypt', city: 'Alexandria', suppliesOrigins: ['Egyptian Cotton'] },
  { name: 'Nile Delta Cotton Company', category: 'Cotton', country: 'Egypt', city: 'Cairo', suppliesOrigins: ['Egyptian Cotton'] },
  { name: 'Memphis Cotton Traders', category: 'Cotton', country: 'USA', city: 'Memphis', suppliesOrigins: ['US Pima'] },
  { name: 'San Joaquin Pima Growers', category: 'Cotton', country: 'USA', city: 'Fresno', suppliesOrigins: ['US Pima'] },

  // Spares — aligned to the published machinery makes
  { name: 'Rieter India Aftermarket', category: 'Spares', country: 'India', city: 'Bengaluru' },
  { name: 'Trutzschler India Service', category: 'Spares', country: 'India', city: 'Ahmedabad' },
  { name: 'Saurer Schlafhorst Spares', category: 'Spares', country: 'India', city: 'Mumbai' },
  { name: 'Savio India Spares', category: 'Spares', country: 'India', city: 'Coimbatore' },
  { name: 'Kappalur Engineering Works', category: 'Spares', country: 'India', city: 'Madurai' },

  // Packing & consumables
  { name: 'Madurai Packaging Solutions', category: 'Packing Material', country: 'India', city: 'Madurai' },
  { name: 'National Corrugated Boxes', category: 'Packing Material', country: 'India', city: 'Salem' },
  { name: 'Southern Industrial Consumables', category: 'Consumables', country: 'India', city: 'Erode' },
  { name: 'Anna Lab Supplies', category: 'Consumables', country: 'India', city: 'Chennai' },
]

export const suppliers: Supplier[] = seeds.map((s, i) => ({
  id: `sup-${String(i + 1).padStart(3, '0')}`,
  name: s.name,
  category: s.category,
  country: s.country,
  city: s.city,
  contactPerson: rng.pick(['R. Venkatesan', 'S. Priyanka', 'M. Suresh', 'A. Fathima', 'K. Bala', 'J. Anand']),
  email: `sales${i + 1}@${s.name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 14)}.com`,
  phone: `+${rng.int(1, 99)} ${rng.int(1000000000, 9999999999)}`,
  rating: rng.int(3, 5) as Supplier['rating'],
  activeSince: `${rng.int(2005, 2022)}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
  totalPOs: rng.int(6, 90),
  suppliesOrigins: s.suppliesOrigins,
}))

export const supplierById = new Map(suppliers.map((s) => [s.id, s]))
