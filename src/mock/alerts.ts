import type { Alert } from '@/types'
import { makeRng } from '@/lib/random'

const rng = makeRng(1212)

function minutesAgoIso(mins: number) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - mins)
  return d.toISOString()
}

/** The five headline alerts called out in the product spec — always present, in this order. */
const featuredAlerts: Alert[] = [
  {
    id: 'al-featured-01',
    severity: 'critical',
    category: 'Maintenance',
    title: 'Machine RF-021 down — Spinning Unit 2',
    detail: 'Ring Spinning Frame RF-021 has been in breakdown for over 2 hours. Spindle bearing failure suspected.',
    timestamp: minutesAgoIso(46),
    linkTo: '/maintenance/breakdown',
    acknowledged: false,
  },
  {
    id: 'al-featured-02',
    severity: 'high',
    category: 'Orders',
    title: 'Order SO-291 at risk — 3 days',
    detail: 'Export order SO-291 is at risk of missing its due date due to a machine breakdown on the assigned line.',
    timestamp: minutesAgoIso(80),
    linkTo: '/sales/sales-orders?risk=high',
    acknowledged: false,
  },
  {
    id: 'al-featured-03',
    severity: 'high',
    category: 'Inventory',
    title: 'Cotton stock below reorder',
    detail: 'Finished Yarn inventory has dropped below its reorder level of 1,100 MT — currently at 980 MT (7 days of stock).',
    timestamp: minutesAgoIso(130),
    linkTo: '/inventory/finished-goods',
    acknowledged: false,
  },
  {
    id: 'al-featured-04',
    severity: 'medium',
    category: 'Quality',
    title: 'Quality deviation — 60s yarn',
    detail: 'CSP for 60s Ring Spun Combed batch tested below the acceptable band on the latest lab test.',
    timestamp: minutesAgoIso(210),
    linkTo: '/quality/yarn-quality',
    acknowledged: false,
  },
  {
    id: 'al-featured-05',
    severity: 'medium',
    category: 'Maintenance',
    title: 'PM due — 12 machines',
    detail: '12 machines across all factories have preventive maintenance due within the next 10 days.',
    timestamp: minutesAgoIso(300),
    linkTo: '/maintenance/pm',
    acknowledged: false,
  },
]

const extraTitles: Array<[Alert['category'], Alert['severity'], string, string]> = [
  ['Production', 'medium', 'Shift output below target', 'Spinning Unit 3, Shift B trailing target by 8% today.'],
  ['Energy', 'low', 'Energy per kg trending up', 'kWh/kg has drifted above the 7.50 target for 3 consecutive days.'],
  ['Quality', 'low', 'Uster% marginal on Carding line', 'Evenness reading close to tolerance limit, recommend re-test.'],
  ['Inventory', 'medium', 'Fabric stock nearing reorder', 'Fabric inventory days-of-stock down to 18 days.'],
  ['Orders', 'low', 'New export enquiry received', 'Enquiry from Osaka Orimono K.K. awaiting quotation.'],
  ['Maintenance', 'low', 'Spare part low — Ring Traveller', 'Stock below reorder level in Spinning Unit 1 stores.'],
]

export const alerts: Alert[] = [
  ...featuredAlerts,
  ...extraTitles.map(([category, severity, title, detail], i) => ({
    id: `al-${String(i + 1).padStart(3, '0')}`,
    severity,
    category,
    title,
    detail,
    timestamp: minutesAgoIso(rng.int(320, 2800)),
    linkTo: '/',
    acknowledged: rng.bool(0.3),
  })),
  ...Array.from({ length: 19 }, (_, i) => {
    const [category, severity, title, detail] = rng.pick(extraTitles)
    return {
      id: `al-gen-${String(i + 1).padStart(3, '0')}`,
      severity,
      category,
      title,
      detail,
      timestamp: minutesAgoIso(rng.int(400, 4200)),
      linkTo: '/',
      acknowledged: rng.bool(0.5),
    }
  }),
]
