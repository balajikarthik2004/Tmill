import type { DateRangePreset, FactoryId } from '@/types'
import { energyRecords, energySummary, factories } from '@/mock'
import { resolveDateRange } from '@/lib/dateRange'
import { simulateDelay } from './delay'

export async function getEnergySummary() {
  return simulateDelay(energySummary)
}

export async function getEnergyTrend(preset: DateRangePreset, factoryId: FactoryId) {
  const { from, to } = resolveDateRange(preset)
  const records = energyRecords.filter(
    (r) => r.date >= from && r.date <= to && (factoryId === 'all' || r.factoryId === factoryId),
  )
  const byDate = new Map<string, { totalKwh: number; renewableKwh: number; gridKwh: number; kwhPerKgSum: number; count: number }>()
  for (const r of records) {
    const day = r.date.slice(0, 10)
    const entry = byDate.get(day) ?? { totalKwh: 0, renewableKwh: 0, gridKwh: 0, kwhPerKgSum: 0, count: 0 }
    entry.totalKwh += r.totalKwh
    entry.renewableKwh += r.renewableKwh
    entry.gridKwh += r.gridKwh
    entry.kwhPerKgSum += r.kwhPerKg
    entry.count += 1
    byDate.set(day, entry)
  }
  const points = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      totalKwh: v.totalKwh,
      renewableKwh: v.renewableKwh,
      gridKwh: v.gridKwh,
      kwhPerKg: Math.round((v.kwhPerKgSum / v.count) * 100) / 100,
    }))
  return simulateDelay(points)
}

export async function getEnergyFactoryBreakdown(preset: DateRangePreset) {
  const { from, to } = resolveDateRange(preset)
  const totals = new Map<string, number>()
  for (const r of energyRecords) {
    if (r.date < from || r.date > to) continue
    totals.set(r.factoryId, (totals.get(r.factoryId) ?? 0) + r.totalKwh)
  }
  const result = factories.map((f) => ({ name: f.shortName, kwh: Math.round(totals.get(f.id) ?? 0) }))
  return simulateDelay(result)
}
