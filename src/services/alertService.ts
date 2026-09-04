import { alerts } from '@/mock'
import { simulateDelay } from './delay'

export async function getAlerts() {
  return simulateDelay(alerts)
}
