import { Sparkles } from 'lucide-react'

import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { AskTMillsPanel } from './AskTMillsPanel'

export function AskTMillsButton() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-navy-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-navy-800"
        >
          <Sparkles className="h-4 w-4 text-brand-500" />
          Ask T-Mills
        </button>
      </SheetTrigger>
      <AskTMillsPanel />
    </Sheet>
  )
}
