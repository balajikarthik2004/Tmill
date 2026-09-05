import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Leaf } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { AI_SECTION_LABEL, navTree } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import logo from "../../assets/image.png"

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
    <aside className="relative z-20 flex h-full w-64 shrink-0 flex-col bg-linear-to-b from-forest-950 via-forest-900 to-forest-950 text-forest-100">
      {/* Brand */}
      <div className="relative flex h-16 items-center gap-3 border-b border-white/8 px-5">
        <div className="weave pointer-events-none absolute inset-0 opacity-60" />
        <div className="">
          <img src={logo} alt="Logo" className="h-10 w-11" />
        </div>
        <div className="relative leading-tight">
          <div className="font-display text-[13px] font-semibold tracking-wide text-white">
            THIAGARAJAR MILLS
          </div>
          <div className="text-[10px] font-medium text-copper-300">Setting Standards. Exceeding Excellence.</div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 p-3">
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
                      'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-forest-200 transition-colors',
                      'hover:bg-white/6 hover:text-white',
                      isActive && 'bg-white/10 font-semibold text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-copper-400" />
                      )}
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive ? 'text-copper-300' : 'text-forest-300 group-hover:text-forest-100',
                        )}
                      />
                      <span className="truncate">{section.label}</span>
                    </>
                  )}
                </NavLink>
              )
            }

            const isOpen = openSections.has(section.label)
            const sectionIsActive = isSectionActive(section.children.map((c) => c.path), location.pathname)
            // The AI module is the flagship surface, so it is lifted out of the
            // flat nav treatment with its own emerald panel and badge.
            const isAi = section.label === AI_SECTION_LABEL

            return (
              <div
                key={section.label}
                className={cn(
                  'flex flex-col',
                  isAi &&
                    'ai-glow ai-sheen relative my-1.5 overflow-hidden rounded-xl bg-linear-to-br from-brand-500/25 via-brand-600/12 to-transparent p-1',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className={cn(
                    'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-forest-200 transition-colors',
                    'hover:bg-white/6 hover:text-white',
                    sectionIsActive && 'text-white',
                    isAi && 'font-semibold text-white',
                  )}
                  aria-expanded={isOpen}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      sectionIsActive ? 'text-copper-300' : 'text-forest-300 group-hover:text-forest-100',
                      isAi && !sectionIsActive && 'text-brand-300',
                    )}
                  />
                  <span className="flex-1 truncate">{section.label}</span>
                  {isAi && (
                    <span className="shrink-0 rounded-full bg-copper-400/90 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wider text-forest-950">
                      AI
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-forest-400 transition-transform duration-300',
                      isOpen && 'rotate-180 text-forest-200',
                    )}
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
                      <div className="mb-1 ml-[1.65rem] mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                        {section.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              cn(
                                'relative rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-forest-300 transition-colors',
                                'hover:bg-white/6 hover:text-white',
                                isActive && 'bg-brand-500/25 font-semibold text-white',
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                {isActive && (
                                  <span className="absolute -left-3 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-copper-400" />
                                )}
                                {child.label}
                              </>
                            )}
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

      {/* Footer */}
      <div className="border-t border-white/8 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8 text-copper-300">
            <Leaf className="h-3.5 w-3.5" />
          </span>
          <div className="leading-tight">
            <div className="text-[12px] font-semibold text-white">Threading together</div>
            <div className="text-[11px] text-forest-300">Tradition &amp; Technology</div>
          </div>
        </div>
        <div className="mt-3 text-[10.5px] text-forest-400">
          © {new Date().getFullYear()} Thiagarajar Mills (P) Ltd.
        </div>
      </div>
    </aside>
  )
}
