import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Leaf } from 'lucide-react'

import { navTree } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

function isSectionActive(childPaths: string[], pathname: string) {
  return childPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function Sidebar() {
  const location = useLocation()
  const activeSectionLabel = useMemo(() => {
    for (const section of navTree) {
      if (section.children && isSectionActive(section.children.map((c) => c.path), location.pathname)) {
        return section.label
      }
    }
    return null
  }, [location.pathname])

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(activeSectionLabel ? [activeSectionLabel] : []),
  )

  function toggleSection(label: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-navy-900 text-navy-100">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success-500 text-white">
          <Leaf className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-bold tracking-wide text-white">THIAGARAJAR MILLS</div>
          <div className="text-[10px] font-medium text-navy-300">Setting Standards. Exceeding Excellence.</div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 p-2.5">
          {navTree.map((section) => {
            const Icon = section.icon
            if (!section.children) {
              return (
                <NavLink
                  key={section.label}
                  to={section.path!}
                  end={section.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-navy-200 transition-colors hover:bg-white/5 hover:text-white',
                      isActive && 'bg-brand-500 text-white shadow-sm hover:bg-brand-500',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{section.label}</span>
                </NavLink>
              )
            }

            const isOpen = openSections.has(section.label)
            const sectionIsActive = isSectionActive(section.children.map((c) => c.path), location.pathname)

            return (
              <div key={section.label}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-navy-200 transition-colors hover:bg-white/5 hover:text-white',
                    sectionIsActive && !isOpen && 'text-brand-500',
                  )}
                  aria-expanded={isOpen}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{section.label}</span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')}
                  />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3.5">
                    {section.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          cn(
                            'rounded-md px-3 py-1.5 text-[12.5px] font-medium text-navy-300 transition-colors hover:bg-white/5 hover:text-white',
                            isActive && 'bg-brand-500 text-white',
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3.5">
        <Leaf className="h-6 w-6 shrink-0 text-success-500" />
        <div className="leading-tight">
          <div className="text-[12px] font-semibold text-white">Threading together</div>
          <div className="text-[11px] text-navy-300">Tradition &amp; Technology</div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-2 text-center text-[10.5px] text-navy-400">
        © {new Date().getFullYear()} Thiagarajar Mills (P) Ltd.
      </div>
    </aside>
  )
}
