import type { Customer } from '@/types'
import { makeRng } from '@/lib/random'

const rng = makeRng(101)

interface Seed {
  name: string
  country: string
  city: string
  segment: 'Domestic' | 'Export'
  currency: 'INR' | 'USD' | 'EUR'
}

const seeds: Seed[] = [
  { name: 'Sundaram Textiles Pvt Ltd', country: 'India', city: 'Coimbatore', segment: 'Domestic', currency: 'INR' },
  { name: 'Lakshmi Garments & Exports', country: 'India', city: 'Tiruppur', segment: 'Domestic', currency: 'INR' },
  { name: 'Chennai Silks Retail', country: 'India', city: 'Chennai', segment: 'Domestic', currency: 'INR' },
  { name: 'Bombay Weaving Co.', country: 'India', city: 'Mumbai', segment: 'Domestic', currency: 'INR' },
  { name: 'Nandan Fabrics', country: 'India', city: 'Surat', segment: 'Domestic', currency: 'INR' },
  { name: 'Kavya Hosiery Mills', country: 'India', city: 'Tiruppur', segment: 'Domestic', currency: 'INR' },
  { name: 'Vardhman Trading House', country: 'India', city: 'Ludhiana', segment: 'Domestic', currency: 'INR' },
  { name: 'Meridian Textilien GmbH', country: 'Germany', city: 'Hamburg', segment: 'Export', currency: 'EUR' },
  { name: 'Alpenwoll Strick AG', country: 'Germany', city: 'Munich', segment: 'Export', currency: 'EUR' },
  { name: 'Tessuti Milano S.p.A.', country: 'Italy', city: 'Milan', segment: 'Export', currency: 'EUR' },
  { name: 'Filati Veneto Srl', country: 'Italy', city: 'Vicenza', segment: 'Export', currency: 'EUR' },
  { name: 'Dhaka Knit Composite Ltd', country: 'Bangladesh', city: 'Dhaka', segment: 'Export', currency: 'USD' },
  { name: 'Chattogram Apparel Group', country: 'Bangladesh', city: 'Chattogram', segment: 'Export', currency: 'USD' },
  { name: 'Anadolu Tekstil A.S.', country: 'Turkey', city: 'Istanbul', segment: 'Export', currency: 'USD' },
  { name: 'Bursa Yarn Trading', country: 'Turkey', city: 'Bursa', segment: 'Export', currency: 'USD' },
  { name: 'Carolina Mills Inc.', country: 'USA', city: 'Charlotte', segment: 'Export', currency: 'USD' },
  { name: 'Pacific Coast Textiles LLC', country: 'USA', city: 'Los Angeles', segment: 'Export', currency: 'USD' },
  { name: 'Osaka Orimono K.K.', country: 'Japan', city: 'Osaka', segment: 'Export', currency: 'USD' },
  { name: 'Nagoya Textile Trading', country: 'Japan', city: 'Nagoya', segment: 'Export', currency: 'USD' },
  { name: 'Global Fibre Sourcing Ltd', country: 'India', city: 'New Delhi', segment: 'Domestic', currency: 'INR' },
]

const firstNames = ['Arun', 'Priya', 'Karthik', 'Meena', 'Hans', 'Giulia', 'Farhan', 'Elif', 'Robert', 'Yuki']
const lastNames = ['Rajan', 'Iyer', 'Muller', 'Rossi', 'Ahmed', 'Kaya', 'Smith', 'Tanaka', 'Nair', 'Weber']

export const customers: Customer[] = seeds.map((s, i) => ({
  id: `cust-${String(i + 1).padStart(3, '0')}`,
  name: s.name,
  country: s.country,
  segment: s.segment,
  city: s.city,
  contactPerson: `${rng.pick(firstNames)} ${rng.pick(lastNames)}`,
  email: `contact${i + 1}@${s.name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 10)}.com`,
  phone: `+${rng.int(1, 99)} ${rng.int(1000000000, 9999999999)}`,
  creditLimit: rng.int(5, 80) * 100000,
  currency: s.currency,
  activeSince: `${rng.int(2015, 2023)}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
  totalOrders: rng.int(4, 60),
  rating: rng.int(3, 5) as Customer['rating'],
}))

export const customerById = new Map(customers.map((c) => [c.id, c]))
