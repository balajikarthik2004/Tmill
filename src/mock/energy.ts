import type { EnergyRecord, EnergySummary, FactoryId } from '@/types'
import { makeRng } from '@/lib/random'

const rng = makeRng(1010)
const HISTORY_DAYS = 30

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(6, 0, 0, 0)
  return d.toISOString()
}

const factoryIds: Exclude<FactoryId, 'all'>[] = ['spinning-1', 'spinning-2', 'spinning-3', 'weaving-1']
const baseKwh: Record<Exclude<FactoryId, 'all'>, number> = {
  'spinning-1': 15200,
  'spinning-2': 16800,
  'spinning-3': 12600,
  'weaving-1': 6800,
}

export const energyRecords: EnergyRecord[] = []
for (let dayOffset = HISTORY_DAYS - 1; dayOffset >= 0; dayOffset--) {
  const date = isoDaysAgo(dayOffset)
  factoryIds.forEach((factoryId) => {
    const totalKwh = Math.round(baseKwh[factoryId] * rng.float(0.92, 1.08, 3))
    const renewablePct = rng.float(0.55, 0.72, 3)
    const renewableKwh = Math.round(totalKwh * renewablePct)
    energyRecords.push({
      date,
      factoryId,
      totalKwh,
      renewableKwh,
      gridKwh: totalKwh - renewableKwh,
      kwhPerKg: rng.float(6.9, 8.2, 2),
    })
  })
}

export const energySummary: EnergySummary = {
  totalKwh: 182400,
  renewablePct: 64,
  gridPct: 36,
  kwhPerKg: 7.62,
  targetKwhPerKg: 7.5,
}
