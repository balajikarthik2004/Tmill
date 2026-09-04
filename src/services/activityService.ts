import { activities } from '@/mock'
import { simulateDelay } from './delay'

export async function getActivities() {
  return simulateDelay(activities)
}
