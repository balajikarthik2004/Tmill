/**
 * Headline KPIs.
 * Yarn and fabric output are the daily figures published on tmills.com
 * (~25,000 kg yarn, ~60,000 m fabric). Export share (90%) and destination
 * count (23 countries) are also published. OEE and quality pass rate are
 * illustrative operational readings.
 */
import type { KpiCardData } from '@/types'
import { company } from './company'
import { qualityPassRatePct } from './quality'

const { infrastructure, exports } = company

export const kpiCards: KpiCardData[] = [
  {
    id: 'yarnProduction',
    label: 'Yarn Production',
    value: infrastructure.dailyYarnKg,
    displayValue: `${infrastructure.dailyYarnKg.toLocaleString('en-IN')} kg`,
    unit: 'kg',
    trend: { changePct: 4.2, direction: 'up' },
    linkTo: '/production/ring-spinning',
    footnote: 'per day',
  },
  {
    id: 'fabricProduction',
    label: 'Fabric Production',
    value: infrastructure.dailyFabricMetres,
    displayValue: `${infrastructure.dailyFabricMetres.toLocaleString('en-IN')} m`,
    unit: 'm',
    trend: { changePct: 2.8, direction: 'up' },
    linkTo: '/production/weaving',
    footnote: 'per day',
  },
  {
    id: 'oee',
    label: 'OEE',
    value: 84.2,
    displayValue: '84.2%',
    unit: '%',
    trend: { changePct: 1.8, direction: 'up' },
    linkTo: '/maintenance/machine-dashboard',
  },
  {
    id: 'qualityPassRate',
    label: 'Quality Pass Rate',
    value: qualityPassRatePct,
    displayValue: `${qualityPassRatePct}%`,
    unit: '%',
    trend: { changePct: 0.7, direction: 'up' },
    linkTo: '/quality/dashboard',
  },
  {
    id: 'ordersOnTime',
    label: 'Orders On-Time',
    value: 96,
    displayValue: '96%',
    unit: '%',
    trend: { changePct: 0.4, direction: 'up' },
    linkTo: '/sales/sales-orders',
  },
  {
    id: 'exportShare',
    label: 'Export Share',
    value: exports.exportSharePct,
    displayValue: `${exports.exportSharePct}%`,
    unit: '%',
    trend: { changePct: 0.6, direction: 'up' },
    linkTo: '/sales/export-orders',
    footnote: `${exports.countries} countries`,
  },
]
