import { endOfDay, startOfDay, startOfMonth, subDays } from 'date-fns'
import type { DateRange, DateRangePreset } from '@/types'

export function resolveDateRange(preset: DateRangePreset, anchor = new Date()): DateRange {
  const to = endOfDay(anchor).toISOString()
  let from: Date
  switch (preset) {
    case 'today':
      from = startOfDay(anchor)
      break
    case '7d':
      from = startOfDay(subDays(anchor, 6))
      break
    case '30d':
      from = startOfDay(subDays(anchor, 29))
      break
    case 'thisMonth':
      from = startOfMonth(anchor)
      break
  }
  return { preset, from: from.toISOString(), to }
}

export const dateRangeLabels: Record<DateRangePreset, string> = {
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  thisMonth: 'This Month',
}
