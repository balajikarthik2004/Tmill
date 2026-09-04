/**
 * Customer register. tmills.com publishes that ~90% of production is exported to
 * roughly 23 countries across America, Australia, Europe and South Asia, with
 * annual sales over US$45 million. Countries below sit inside those four regions;
 * company names and contacts are illustrative.
 */
import type { Customer, ExportRegion } from '@/types'
import { makeRng } from '@/lib/random'

const rng = makeRng(101)

interface Seed {
  name: string
  country: string
  city: string
  region: ExportRegion | 'Domestic'
  currency: 'INR' | 'USD' | 'EUR'
}

/** 23 export destinations across the four published regions, plus domestic buyers. */
const seeds: Seed[] = [
  // Europe
  { name: 'Meridian Textilien GmbH', country: 'Germany', city: 'Hamburg', region: 'Europe', currency: 'EUR' },
  { name: 'Tessuti Milano S.p.A.', country: 'Italy', city: 'Milan', region: 'Europe', currency: 'EUR' },
  { name: 'Filatures du Nord SAS', country: 'France', city: 'Lille', region: 'Europe', currency: 'EUR' },
  { name: 'Iberia Hilos S.L.', country: 'Spain', city: 'Barcelona', region: 'Europe', currency: 'EUR' },
  { name: 'Porto Têxtil Lda', country: 'Portugal', city: 'Porto', region: 'Europe', currency: 'EUR' },
  { name: 'Albion Yarn Traders Ltd', country: 'United Kingdom', city: 'Manchester', region: 'Europe', currency: 'USD' },
  { name: 'Helvetia Fabrics AG', country: 'Switzerland', city: 'Zurich', region: 'Europe', currency: 'EUR' },
  { name: 'Benelux Weefsels BV', country: 'Belgium', city: 'Ghent', region: 'Europe', currency: 'EUR' },
  { name: 'Anadolu Tekstil A.S.', country: 'Turkey', city: 'Istanbul', region: 'Europe', currency: 'USD' },
  { name: 'Hellas Textiles SA', country: 'Greece', city: 'Thessaloniki', region: 'Europe', currency: 'EUR' },
  { name: 'Polska Przedza Sp. z o.o.', country: 'Poland', city: 'Lodz', region: 'Europe', currency: 'EUR' },
  // America
  { name: 'Carolina Mills Inc.', country: 'USA', city: 'Charlotte', region: 'America', currency: 'USD' },
  { name: 'Pacific Coast Textiles LLC', country: 'USA', city: 'Los Angeles', region: 'America', currency: 'USD' },
  { name: 'Maple Yarn Imports Ltd', country: 'Canada', city: 'Toronto', region: 'America', currency: 'USD' },
  { name: 'Textil Guadalajara SA', country: 'Mexico', city: 'Guadalajara', region: 'America', currency: 'USD' },
  { name: 'Tecidos Brasil Ltda', country: 'Brazil', city: 'São Paulo', region: 'America', currency: 'USD' },
  { name: 'Andina Textiles SA', country: 'Colombia', city: 'Medellín', region: 'America', currency: 'USD' },
  // Australia
  { name: 'Southern Cross Textiles Pty', country: 'Australia', city: 'Melbourne', region: 'Australia', currency: 'USD' },
  { name: 'Harbour Yarn Trading Pty', country: 'Australia', city: 'Sydney', region: 'Australia', currency: 'USD' },
  { name: 'Kiwi Knit Ltd', country: 'New Zealand', city: 'Auckland', region: 'Australia', currency: 'USD' },
  // South Asia
  { name: 'Dhaka Knit Composite Ltd', country: 'Bangladesh', city: 'Dhaka', region: 'South Asia', currency: 'USD' },
  { name: 'Chattogram Apparel Group', country: 'Bangladesh', city: 'Chattogram', region: 'South Asia', currency: 'USD' },
  { name: 'Lanka Fabrics (Pvt) Ltd', country: 'Sri Lanka', city: 'Colombo', region: 'South Asia', currency: 'USD' },
  { name: 'Kathmandu Textile Traders', country: 'Nepal', city: 'Kathmandu', region: 'South Asia', currency: 'USD' },
  // Domestic (~10% of production)
  { name: 'Sundaram Textiles Pvt Ltd', country: 'India', city: 'Coimbatore', region: 'Domestic', currency: 'INR' },
  { name: 'Lakshmi Garments & Exports', country: 'India', city: 'Tiruppur', region: 'Domestic', currency: 'INR' },
  { name: 'Kavya Hosiery Mills', country: 'India', city: 'Tiruppur', region: 'Domestic', currency: 'INR' },
  { name: 'Bombay Weaving Co.', country: 'India', city: 'Mumbai', region: 'Domestic', currency: 'INR' },
]

const firstNames = ['Arun', 'Priya', 'Karthik', 'Meena', 'Hans', 'Giulia', 'Farhan', 'Elif', 'Robert', 'Yuki', 'Sofia', 'Daniel']
const lastNames = ['Rajan', 'Iyer', 'Müller', 'Rossi', 'Ahmed', 'Kaya', 'Smith', 'Tanaka', 'Nair', 'Weber', 'Silva', 'Fernandes']

export const customers: Customer[] = seeds.map((s, i) => ({
  id: `cust-${String(i + 1).padStart(3, '0')}`,
  name: s.name,
  country: s.country,
  segment: s.region === 'Domestic' ? 'Domestic' : 'Export',
  region: s.region === 'Domestic' ? undefined : s.region,
  city: s.city,
  contactPerson: `${rng.pick(firstNames)} ${rng.pick(lastNames)}`,
  email: `contact${i + 1}@${s.name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 12)}.com`,
  phone: `+${rng.int(1, 99)} ${rng.int(1000000000, 9999999999)}`,
  creditLimit: rng.int(5, 80) * 100000,
  currency: s.currency,
  activeSince: `${rng.int(2005, 2023)}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
  totalOrders: rng.int(4, 60),
  rating: rng.int(3, 5) as Customer['rating'],
}))

export const customerById = new Map(customers.map((c) => [c.id, c]))

/** Distinct export destination count — tmills.com publishes ~23 countries. */
export const exportCountries = [
  ...new Set(customers.filter((c) => c.segment === 'Export').map((c) => c.country)),
]
