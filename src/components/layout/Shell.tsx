import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AskTMillsButton } from '@/components/ai/AskTMillsButton'

export function Shell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 border-none p-0 sm:max-w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col relative">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <Breadcrumbs />
        <main className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AskTMillsButton />
    </div>
  )
}

