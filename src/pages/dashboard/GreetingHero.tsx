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
        <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening at Thiagarajar Mills today.</p>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-xl bg-linear-to-r from-navy-800 via-success-600 to-info-600">
        <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-14 right-28 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute bottom-4 right-52 h-16 w-16 rounded-full bg-white/5" />
        <Sprout className="absolute -bottom-5 left-4 h-28 w-28 text-white/10" />
        <div className="relative flex h-full min-h-28 flex-col justify-between gap-2 p-5 text-right">
          <div className="text-xs font-medium text-white/80">{format(now, 'EEE, d MMM yyyy')}</div>
          <div className="leading-relaxed text-white">
            <div className="text-sm font-semibold uppercase tracking-wide">Setting Standards. Exceeding Excellence</div>
            <div className="text-xs text-white/80">
              100% Indian cotton yarn since 1936 · Kappalur, Madurai
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
