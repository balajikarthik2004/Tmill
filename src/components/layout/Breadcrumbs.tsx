import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

import { flatNavEntries } from '@/lib/navigation'

export function Breadcrumbs() {
  const location = useLocation()

  if (location.pathname === '/') return null

  // Exact match wins. Sections with both an overview leaf and children under it
  // (/ai, /procurement, /inventory) would otherwise resolve every child to the
  // overview, because the overview path is a prefix of all of them.
  const entry =
    flatNavEntries.find((e) => e.path === location.pathname) ??
    flatNavEntries.find((e) => location.pathname.startsWith(`${e.path}/`))

  return (
    <div className="flex items-center gap-1.5 px-4 pt-4 text-xs text-muted-foreground lg:px-6">
      <Link
        to="/"
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        Dashboard
      </Link>
      {entry && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          <span>{entry.sectionLabel}</span>
          {entry.sectionLabel !== entry.label && (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="font-semibold text-foreground">{entry.label}</span>
            </>
          )}
        </>
      )}
    </div>
  )
}
