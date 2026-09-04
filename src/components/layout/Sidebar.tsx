import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Leaf } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
    <aside className="flex h-full w-64 shrink-0 flex-col bg-gradient-to-b from-[#011142] via-[#011C6B] to-[#011142] text-brand-50 shadow-[4px_0_24px_rgba(1,17,66,0.2)] z-20 border-r border-[#01258F]/30">
      <div className="flex h-16 items-center gap-2.5 border-b border-[#01258F]/30 px-5 bg-[#011142]/40 backdrop-blur-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#023BE6] text-white shadow-sm ring-1 ring-white/20">
          <Leaf className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-bold tracking-wide text-white">THIAGARAJAR MILLS</div>
          <div className="text-[10px] font-medium text-brand-200">Setting Standards. Exceeding Excellence.</div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
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
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-brand-100/80 transition-all hover:bg-[#01258F]/40 hover:text-white',
                      isActive && 'bg-[#0231BD] text-white shadow-md ring-1 ring-white/10',
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
              <div key={section.label} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-brand-100/80 transition-all hover:bg-[#01258F]/40 hover:text-white',
                    sectionIsActive && !isOpen && 'text-white font-semibold',
                  )}
                  aria-expanded={isOpen}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{section.label}</span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-300', isOpen && 'rotate-180')}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-[#01258F]/50 pl-3.5 mb-1">
                        {section.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              cn(
                                'rounded-md px-3 py-1.5 text-[12.5px] font-medium text-brand-200/70 transition-all hover:bg-[#01258F]/40 hover:text-white',
                                isActive && 'bg-[#0231BD] text-white shadow-sm ring-1 ring-white/10',
                              )
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="flex items-center gap-2.5 border-t border-[#01258F]/30 px-4 py-3.5 bg-[#011142]/60 backdrop-blur-md">
        <Leaf className="h-6 w-6 shrink-0 text-[#023BE6]" />
        <div className="leading-tight">
          <div className="text-[12px] font-semibold text-white">Threading together</div>
          <div className="text-[11px] text-brand-200">Tradition &amp; Technology</div>
        </div>
      </div>
      <div className="px-4 py-3 text-center text-[10.5px] text-brand-300/80 bg-[#011142]">
        © {new Date().getFullYear()} Thiagarajar Mills (P) Ltd.
      </div>
    </aside>
  )
}

