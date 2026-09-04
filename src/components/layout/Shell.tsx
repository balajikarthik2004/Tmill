import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AskTMillsButton } from '@/components/ai/AskTMillsButton'

export function Shell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <Breadcrumbs />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <AskTMillsButton />
    </div>
  )
}
