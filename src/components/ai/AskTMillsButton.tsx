import { Sparkles } from 'lucide-react'

import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { AskTMillsPanel } from './AskTMillsPanel'

export function AskTMillsButton() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-linear-to-br from-forest-800 to-forest-950 px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:shadow-2xl"
        >
          <Sparkles className="h-4 w-4 text-copper-300" />
          Ask T-Mills
        </button>
      </SheetTrigger>
      <AskTMillsPanel />
    </Sheet>
  )
}
