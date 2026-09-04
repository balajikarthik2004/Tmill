import { ChevronDown } from 'lucide-react'

import { useAppStore } from '@/store/appStore'
import { dateRangeLabels } from '@/lib/dateRange'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DateRangePreset } from '@/types'

const presets: DateRangePreset[] = ['today', '7d', '30d', 'thisMonth']

/** Compact per-card period selector — reads/writes the same shared date-range
 *  state as the header selector, so every card stays in sync. */
export function PeriodDropdown() {
  const { dateRangePreset, setDateRangePreset } = useAppStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {dateRangeLabels[dateRangePreset]}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {presets.map((preset) => (
          <DropdownMenuItem key={preset} onClick={() => setDateRangePreset(preset)}>
            {dateRangeLabels[preset]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
