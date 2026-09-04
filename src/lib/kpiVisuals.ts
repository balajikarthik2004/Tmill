import { Award, Gauge, Globe2, Layers, Package, Truck, type LucideIcon } from 'lucide-react'
import type { KpiId } from '@/types'

export interface KpiVisual {
  icon: LucideIcon
  iconBg: string
  iconRing: string
  iconColor: string
  compareLabel: string
}

/** One hue per KPI, drawn from the Forest & Cream ramp so the six cards read
 *  as a set rather than six unrelated accents. */
export const kpiVisuals: Record<KpiId, KpiVisual> = {
  yarnProduction: {
    icon: Package,
    iconBg: 'bg-brand-50',
    iconRing: 'ring-brand-100',
    iconColor: 'text-brand-600',
    compareLabel: 'vs yesterday',
  },
  inventoryStock: {
    icon: Layers,
    iconBg: 'bg-copper-50',
    iconRing: 'ring-copper-100',
    iconColor: 'text-copper-600',
    compareLabel: 'vs yesterday',
  },
  oee: {
    icon: Gauge,
    iconBg: 'bg-warning-50',
    iconRing: 'ring-warning-100',
    iconColor: 'text-warning-600',
    compareLabel: 'vs last week',
  },
  qualityPassRate: {
    icon: Award,
    iconBg: 'bg-info-50',
    iconRing: 'ring-info-100',
    iconColor: 'text-info-600',
    compareLabel: 'vs last week',
  },
  ordersOnTime: {
    icon: Truck,
    iconBg: 'bg-forest-50',
    iconRing: 'ring-forest-100',
    iconColor: 'text-forest-600',
    compareLabel: '',
  },
  exportShare: {
    icon: Globe2,
    iconBg: 'bg-success-50',
    iconRing: 'ring-success-100',
    iconColor: 'text-success-600',
    compareLabel: 'of production',
  },
}
