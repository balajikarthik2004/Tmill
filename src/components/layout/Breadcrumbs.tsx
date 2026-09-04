import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

import { flatNavEntries } from '@/lib/navigation'

export function Breadcrumbs() {
  const location = useLocation()

  if (location.pathname === '/') return null

  const entry = flatNavEntries.find(
    (e) => e.path === location.pathname || location.pathname.startsWith(`${e.path}/`),
  )

  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-background px-4 py-2.5 text-xs text-muted-foreground lg:px-6">
      <Link to="/" className="flex items-center gap-1 hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
        Dashboard
      </Link>
      {entry && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="text-muted-foreground">{entry.sectionLabel}</span>
          {entry.sectionLabel !== entry.label && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">{entry.label}</span>
            </>
          )}
        </>
      )}
    </div>
  )
}
