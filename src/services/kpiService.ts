import type { KpiCardData } from '@/types'
import { kpiCards } from '@/mock'
import { simulateDelay } from './delay'

export async function getKpiCards(): Promise<KpiCardData[]> {
  return simulateDelay(kpiCards)
}
