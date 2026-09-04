import type { KpiCardData, SeriesPoint } from '@/types'
import { makeRng } from '@/lib/random'

const rng = makeRng(1414)

function sparkline(base: number, spread: number, points = 14): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({ date: d.toISOString(), value: Math.round((base + rng.float(-spread, spread, 2)) * 10) / 10 })
  }
  return out
}

/**
 * Headline KPI cards. Values are pinned to the figures called out in the product
 * spec so the executive dashboard always reads consistently; sparkline history
 * is generated for visual trend context only.
 */
export const kpiCards: KpiCardData[] = [
  {
    id: 'yarnProduction',
    label: 'Yarn Production',
    value: 28450,
    displayValue: '28,450 kg',
    unit: 'kg',
    trend: { changePct: 4.2, direction: 'up' },
    sparkline: sparkline(28000, 1400),
    linkTo: '/production/ring-spinning',
  },
  {
    id: 'fabricProduction',
    label: 'Fabric Production',
    value: 66800,
    displayValue: '66,800 m',
    unit: 'm',
    trend: { changePct: 2.8, direction: 'up' },
    sparkline: sparkline(66000, 3200),
    linkTo: '/production/weaving',
  },
  {
    id: 'oee',
    label: 'OEE',
    value: 84.2,
    displayValue: '84.2%',
    unit: '%',
    trend: { changePct: 1.8, direction: 'up' },
    sparkline: sparkline(83.5, 2.5),
    linkTo: '/maintenance/machine-dashboard',
  },
  {
    id: 'qualityPassRate',
    label: 'Quality Pass Rate',
    value: 98.4,
    displayValue: '98.4%',
    unit: '%',
    trend: { changePct: 0.7, direction: 'up' },
    sparkline: sparkline(98, 0.8),
    linkTo: '/quality/dashboard',
  },
  {
    id: 'ordersOnTime',
    label: 'Orders On-Time',
    value: 96,
    displayValue: '96%',
    unit: '%',
    trend: { changePct: 0.4, direction: 'up' },
    sparkline: sparkline(95, 1.6),
    linkTo: '/sales/sales-orders',
    footnote: '142 total',
  },
  {
    id: 'renewableEnergy',
    label: 'Renewable Energy',
    value: 64,
    displayValue: '64%',
    unit: '%',
    trend: { changePct: 1.1, direction: 'up' },
    sparkline: sparkline(63, 3),
    linkTo: '/energy/renewable',
  },
]
