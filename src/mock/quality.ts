/**
 * Central Testing Laboratory records. Instruments and measured parameters match
 * the lab equipment published on tmills.com (USTER UT5/UTR4/UTJ4/CMT5/Tensojet,
 * Zweigle hairiness, TPI & CSP testers, USTER HVI and AFIS PRO-2 for cotton).
 * Individual readings are illustrative.
 */
import type { CustomerComplaint, LabInstrument, QualityStage, QualityTest, Rejection } from '@/types'
import { cottonInstruments, yarnInstruments } from '@/types'
import { makeRng } from '@/lib/random'
import { customers } from './customers'
import { cottonLots } from './cotton'
import { machines } from './machines'
import { factories } from './factories'
import { products } from './products'

const rng = makeRng(707)

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const testers = ['R. Anitha', 'S. Gopal', 'M. Devi', 'K. Rajesh', 'P. Saravanan']
const yarnProducts = products.filter((p) => p.category === 'Yarn')
const fabricInstruments: LabInstrument[] = ['USTER Eva Tester', 'USTER Strength Tester']

function yarnParameters() {
  const product = rng.pick(yarnProducts)
  return {
    product,
    parameters: {
      count: product.count,
      strength: rng.float(16, 24, 1),
      csp: rng.int(2100, 3400),
      uster: rng.float(8, 13, 1),
      hairiness: rng.float(3.2, 6.4, 1),
      tpi: rng.float(14, 24, 1),
      imperfections: rng.int(18, 90),
    },
  }
}

export const qualityTests: QualityTest[] = Array.from({ length: 64 }, (_, i) => {
  const stage: QualityStage = i % 3 === 0 ? 'Cotton' : 'Yarn'
  const result = rng.bool(0.86) ? 'Pass' : rng.bool(0.65) ? 'Rework' : 'Fail'

  if (stage === 'Cotton') {
    const lot = rng.pick(cottonLots)
    return {
      id: `qt-${String(i + 1).padStart(3, '0')}`,
      testNo: `QT-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      stage,
      instrument: rng.pick(cottonInstruments),
      cottonLotId: lot.id,
      testedDate: daysAgoIso(rng.int(0, 30)),
      parameters: {
        micronaire: lot.micronaire,
        staple: lot.staple,
        strength: lot.strength,
        trashPct: lot.trashPct,
        moisturePct: lot.moisturePct,
        nepsPerGram: rng.int(120, 320),
      },
      result,
      remarks: result !== 'Pass' ? 'Parameter outside tolerance band' : undefined,
      testedBy: rng.pick(testers),
    }
  }

  const { product, parameters } = yarnParameters()
  return {
    id: `qt-${String(i + 1).padStart(3, '0')}`,
    testNo: `QT-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    stage,
    instrument: rng.pick(yarnInstruments),
    machineId: rng.pick(machines.filter((m) => m.process === 'Ring Spinning' || m.process === 'Open End')).id,
    productId: product.id,
    testedDate: daysAgoIso(rng.int(0, 30)),
    parameters,
    result,
    remarks: result !== 'Pass' ? 'Parameter outside tolerance band' : undefined,
    testedBy: rng.pick(testers),
  }
})

export const qualityTestById = new Map(qualityTests.map((q) => [q.id, q]))

const rejectionReasons = [
  'Count variation',
  'Contamination detected',
  'Yarn breaks — weak place',
  'High imperfections (IPI)',
  'Hairiness out of band',
]

export const rejections: Rejection[] = Array.from({ length: 26 }, (_, i) => ({
  id: `rj-${String(i + 1).padStart(3, '0')}`,
  date: daysAgoIso(rng.int(0, 30)),
  stage: rng.pick(['Cotton', 'Yarn'] as QualityStage[]),
  reason: rng.pick(rejectionReasons),
  qtyKg: rng.int(20, 400),
  factoryId: rng.pick(factories).id,
}))

const complaintCategories = ['Count variation', 'Contamination', 'Packing damage', 'Short shipment', 'Strength failure', 'Hairiness']

export const complaints: CustomerComplaint[] = Array.from({ length: 16 }, (_, i) => {
  const customer = rng.pick(customers)
  const category = rng.pick(complaintCategories)
  return {
    id: `cc-${String(i + 1).padStart(3, '0')}`,
    complaintNo: `CMP-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    date: daysAgoIso(rng.int(0, 45)),
    category,
    description: `${category} reported on a recent shipment`,
    status: rng.pick(['Open', 'Investigating', 'Resolved', 'Closed']),
  }
})

export const qualityPassRatePct =
  Math.round((qualityTests.filter((t) => t.result === 'Pass').length / qualityTests.length) * 1000) / 10
