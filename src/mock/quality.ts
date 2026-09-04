import type { CustomerComplaint, QualityStage, QualityTest, Rejection } from '@/types'
import { makeRng } from '@/lib/random'
import { customers } from './customers'
import { cottonLots } from './cotton'
import { machines } from './machines'
import { factories } from './factories'

const rng = makeRng(707)

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const stages: QualityStage[] = ['Cotton', 'Yarn', 'Fabric']
const testers = ['R. Anitha', 'S. Gopal', 'M. Devi', 'K. Rajesh', 'P. Saravanan']

export const qualityTests: QualityTest[] = Array.from({ length: 52 }, (_, i) => {
  const stage = rng.pick(stages)
  const result = rng.bool(0.85) ? 'Pass' : rng.bool(0.6) ? 'Rework' : 'Fail'
  const params =
    stage === 'Cotton'
      ? { moisturePct: rng.float(6.5, 8.5, 1) }
      : stage === 'Yarn'
        ? {
            count: rng.pick(['20s', '30s', '40s', '60s']),
            strength: rng.float(18, 24, 1),
            csp: rng.int(2000, 3200),
            uster: rng.float(8, 13, 1),
            hairiness: rng.float(3.5, 6.5, 1),
            tpi: rng.float(14, 22, 1),
            imperfections: rng.int(20, 90),
          }
        : {
            evenness: rng.float(92, 99, 1),
            moisturePct: rng.float(5, 7, 1),
          }
  return {
    id: `qt-${String(i + 1).padStart(3, '0')}`,
    testNo: `QT-${2026}-${String(i + 1).padStart(4, '0')}`,
    stage,
    cottonLotId: stage === 'Cotton' ? rng.pick(cottonLots).id : undefined,
    machineId: stage !== 'Cotton' ? rng.pick(machines).id : undefined,
    testedDate: daysAgoIso(rng.int(0, 30)),
    parameters: params,
    result,
    remarks: result !== 'Pass' ? 'Parameter out of tolerance band' : undefined,
    testedBy: rng.pick(testers),
  }
})

const rejectionReasons = ['Count variation', 'Contamination', 'Weak yarn breaks', 'Shade mismatch', 'Weft defects']

export const rejections: Rejection[] = Array.from({ length: 24 }, (_, i) => ({
  id: `rj-${String(i + 1).padStart(3, '0')}`,
  date: daysAgoIso(rng.int(0, 30)),
  stage: rng.pick(stages),
  reason: rng.pick(rejectionReasons),
  qtyKg: rng.int(20, 400),
  factoryId: rng.pick(factories).id,
}))

const complaintCategories = ['Count variation', 'Shade issue', 'Packing damage', 'Short shipment', 'Strength failure']

export const complaints: CustomerComplaint[] = Array.from({ length: 14 }, (_, i) => {
  const customer = rng.pick(customers)
  return {
    id: `cc-${String(i + 1).padStart(3, '0')}`,
    complaintNo: `CMP-${2026}-${String(i + 1).padStart(3, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    date: daysAgoIso(rng.int(0, 45)),
    category: rng.pick(complaintCategories),
    description: `${rng.pick(complaintCategories)} reported on recent shipment`,
    status: rng.pick(['Open', 'Investigating', 'Resolved', 'Closed']),
  }
})

export const qualityPassRatePct = Math.round(
  (qualityTests.filter((t) => t.result === 'Pass').length / qualityTests.length) * 1000,
) / 10
