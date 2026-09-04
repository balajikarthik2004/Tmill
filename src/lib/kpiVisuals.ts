import { Award, Gauge, Globe2, Layers, Package, Truck, type LucideIcon } from 'lucide-react'
import type { KpiId } from '@/types'

export interface KpiVisual {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  compareLabel: string
}

export const kpiVisuals: Record<KpiId, KpiVisual> = {
  yarnProduction: { icon: Package, iconBg: 'bg-info-50', iconColor: 'text-info-600', compareLabel: 'vs yesterday' },
  inventoryStock: { icon: Layers, iconBg: 'bg-violet-100', iconColor: 'text-violet-600', compareLabel: 'vs yesterday' },
  oee: { icon: Gauge, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', compareLabel: 'vs last week' },
  qualityPassRate: { icon: Award, iconBg: 'bg-teal-100', iconColor: 'text-teal-600', compareLabel: 'vs last week' },
  ordersOnTime: { icon: Truck, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', compareLabel: '' },
  exportShare: { icon: Globe2, iconBg: 'bg-success-50', iconColor: 'text-success-600', compareLabel: 'of production' },
}
