import { useNavigate } from 'react-router-dom'
import { Maximize2, Sparkles } from 'lucide-react'

import { useAiStore } from '@/store/aiStore'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { AiChat } from './AiChat'

/**
 * The always-available copilot. Docks on the right over whatever page the user
 * is on; the same conversation continues on the full AI module page.
 */
export function CopilotLauncher() {
  const navigate = useNavigate()
  const { panelOpen, setPanelOpen, isThinking } = useAiStore()

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-linear-to-br from-forest-800 to-forest-950 px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:shadow-2xl"
        >
          <span className="relative flex h-4 w-4 items-center justify-center">
            <Sparkles className="h-4 w-4 text-copper-300" />
            {isThinking && (
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 animate-ping rounded-full bg-copper-300" />
            )}
          </span>
          Ask T-Mills AI
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl [&>button]:top-5 [&>button]:text-white/70 [&>button]:hover:text-white"
      >
        <div className="relative flex shrink-0 items-center gap-3 overflow-hidden border-b border-border bg-linear-to-br from-forest-950 to-forest-800 py-4 pl-5 pr-16 text-white">
          <span className="weave pointer-events-none absolute inset-0 opacity-50" />
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <Sparkles className="h-4.5 w-4.5 text-copper-300" />
          </span>
          <div className="relative min-w-0 flex-1">
            <SheetTitle className="font-display text-[14px] font-semibold leading-tight text-white">
              T-Mills Copilot
            </SheetTitle>
            <SheetDescription className="truncate text-[11px] text-forest-200">
              Grounded in live production, quality, order and asset data
            </SheetDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="relative shrink-0 text-forest-100 hover:bg-white/10 hover:text-white"
            onClick={() => {
              setPanelOpen(false)
              navigate('/ai')
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Open
          </Button>
        </div>

        <AiChat compact />
      </SheetContent>
    </Sheet>
  )
}
