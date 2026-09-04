import { Link } from 'react-router-dom'
import { Leaf, Wind } from 'lucide-react'

export function SustainabilityBanner() {
  return (
    <Link
      to="/energy/renewable"
      className="group relative block h-full min-h-44 overflow-hidden rounded-lg bg-linear-to-br from-navy-800 via-navy-600 to-info-600 transition-transform hover:-translate-y-0.5"
    >
      <Wind className="absolute -bottom-8 -right-8 h-40 w-40 text-white/10 transition-transform group-hover:rotate-12" />
      <Wind className="absolute -top-6 right-16 h-16 w-16 text-white/10" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <p className="max-w-[16rem] text-lg font-semibold leading-snug text-white">
          Over 60% of our energy comes from wind and solar.
        </p>
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
          <Leaf className="h-3.5 w-3.5" />
          Sustainable Growth. Lasting Impact.
        </div>
      </div>
    </Link>
  )
}
