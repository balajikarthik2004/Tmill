import { Sprout } from 'lucide-react'
import { format } from 'date-fns'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function GreetingHero({ firstName }: { firstName: string }) {
  const now = new Date()
  const greeting = greetingForHour(now.getHours())

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="flex flex-col justify-center gap-1 lg:w-2/5">
        <div className="section-label text-copper-600">Executive Command Center</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground lg:text-[1.75rem]">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening at Thiagarajar Mills today.
        </p>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-2xl bg-linear-to-br from-forest-950 via-forest-800 to-forest-900 shadow-lg ring-1 ring-forest-700/50">
        <div className="weave pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-copper-400/15 blur-2xl" />
        <Sprout className="pointer-events-none absolute -bottom-4 left-5 h-28 w-28 text-white/8" />

        <div className="relative flex h-full min-h-32 flex-col justify-between gap-3 p-5 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-copper-400" />
            <span className="text-xs font-medium text-forest-200">{format(now, 'EEE, d MMM yyyy')}</span>
          </div>
          <div className="leading-relaxed">
            <div className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-white">
              Setting Standards. Exceeding Excellence
            </div>
            <div className="mt-1 text-xs text-forest-200">
              100% Indian cotton yarn since 1936 · Kappalur, Madurai
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
