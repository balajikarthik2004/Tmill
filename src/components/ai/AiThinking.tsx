import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Database, FileSearch, GitBranch, Loader2, Sparkles, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

const STAGES = [
  { icon: FileSearch, label: 'Reading the question and pulling out entities' },
  { icon: Database, label: 'Querying live plant records' },
  { icon: GitBranch, label: 'Searching closed cases in the knowledge base' },
  { icon: Users, label: 'Matching engineers on past resolutions' },
  { icon: Sparkles, label: 'Composing a grounded answer' },
]

/**
 * The retrieval trace shown while the copilot works. Stages advance on a timer
 * rather than on real progress, but they name what the engine is genuinely
 * doing at each step, so the wait reads as work rather than a spinner.
 */
export function AiThinking({ question }: { question?: string | null }) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    setStage(0)
    const timer = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s))
    }, 150)
    return () => clearInterval(timer)
  }, [question])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-forest-800 text-white shadow-sm">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 rounded-xl rounded-tl-none border border-border bg-card p-3.5 shadow-sm">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
          Working through the plant record
        </div>
        <div className="mt-2.5 space-y-1.5">
          {STAGES.map((item, index) => {
            const Icon = item.icon
            const done = index < stage
            const active = index === stage
            if (index > stage) return null
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-2 text-[11.5px]',
                  done ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-success-50 text-success-600' : 'bg-brand-50 text-brand-600',
                  )}
                >
                  {done ? <Check className="h-2.5 w-2.5" /> : <Icon className="h-2.5 w-2.5" />}
                </span>
                <span className={cn(active && 'font-medium')}>{item.label}</span>
                {active && (
                  <motion.span
                    className="flex gap-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        className="h-1 w-1 rounded-full bg-brand-400"
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ repeat: Infinity, duration: 1.1, delay: dot * 0.18 }}
                      />
                    ))}
                  </motion.span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
