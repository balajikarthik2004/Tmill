import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { CopilotLauncher } from '@/components/ai/CopilotLauncher'

export function Shell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  /**
   * The copilot runs full-bleed: no header bar, no breadcrumbs, no page
   * chrome — the conversation is the page. Every other route keeps the
   * standard shell.
   */
  const isCopilot = location.pathname === '/ai'

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 border-none p-0 sm:max-w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {isCopilot ? (
          // Small screens still need a way into the navigation.
          <div className="flex h-12 shrink-0 items-center border-b border-border bg-card px-2 lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Header onMenuClick={() => setMobileNavOpen(true)} />
        )}

        <main className="scrollbar-thin relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {!isCopilot && <Breadcrumbs />}
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {!isCopilot && <CopilotLauncher />}
    </div>
  )
}
