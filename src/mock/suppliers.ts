import type { Supplier } from '@/types'
import { makeRng } from '@/lib/random'

const rng = makeRng(202)

interface Seed {
  name: string
  category: Supplier['category']
  country: string
  city: string
}

const seeds: Seed[] = [
  { name: 'Gujarat Cotton Ginners', category: 'Cotton', country: 'India', city: 'Ahmedabad' },
  { name: 'Maharashtra Kapas Traders', category: 'Cotton', country: 'India', city: 'Nagpur' },
  { name: 'Punjab Agro Cotton Co.', category: 'Cotton', country: 'India', city: 'Bathinda' },
  { name: 'Alexandria Cotton Exports', category: 'Cotton', country: 'Egypt', city: 'Alexandria' },
  { name: 'Memphis Cotton Traders', category: 'Cotton', country: 'USA', city: 'Memphis' },
  { name: 'Queensland Cotton Growers', category: 'Cotton', country: 'Australia', city: 'Brisbane' },
  { name: 'Kappalur Spares & Engineering', category: 'Spares', country: 'India', city: 'Madurai' },
  { name: 'Coimbatore Precision Tools', category: 'Spares', country: 'India', city: 'Coimbatore' },
  { name: 'Rieter Aftermarket India', category: 'Spares', country: 'India', city: 'Bengaluru' },
  { name: 'Southern Dyes & Chemicals', category: 'Dyes & Chemicals', country: 'India', city: 'Erode' },
  { name: 'Anna Chemical Industries', category: 'Dyes & Chemicals', country: 'India', city: 'Chennai' },
  { name: 'Madurai Packaging Solutions', category: 'Packing Material', country: 'India', city: 'Madurai' },
  { name: 'National Corrugated Boxes', category: 'Packing Material', country: 'India', city: 'Salem' },
  { name: 'TVS Logistics Services', category: 'Services', country: 'India', city: 'Chennai' },
  { name: 'Sundaram Industrial Services', category: 'Services', country: 'India', city: 'Madurai' },
]

export const suppliers: Supplier[] = seeds.map((s, i) => ({
  id: `sup-${String(i + 1).padStart(3, '0')}`,
  name: s.name,
  category: s.category,
  country: s.country,
  city: s.city,
  contactPerson: rng.pick(['R. Venkatesan', 'S. Priyanka', 'M. Suresh', 'A. Fathima', 'K. Bala']),
  email: `sales${i + 1}@${s.name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 12)}.com`,
  phone: `+${rng.int(1, 99)} ${rng.int(1000000000, 9999999999)}`,
  rating: rng.int(3, 5) as Supplier['rating'],
  activeSince: `${rng.int(2012, 2022)}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
  totalPOs: rng.int(6, 90),
}))

export const supplierById = new Map(suppliers.map((s) => [s.id, s]))
