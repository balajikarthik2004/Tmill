import { factories } from '@/mock'
import { simulateDelay } from './delay'

export async function getFactories() {
  return simulateDelay(factories)
}
