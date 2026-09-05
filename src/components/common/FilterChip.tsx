import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * The one filter control used across the app. Selected chips are a solid fill
 * with a halo so the current filter is readable at a glance from across a desk;
 * unselected chips keep full-strength text (not muted) so the options a planner
 * can switch to stay legible too.
 */
type ChipTone = 'brand' | 'copper'
type ChipSize = 'sm' | 'md'

/** Written out in full so Tailwind keeps these classes — never interpolated. */
const activeByTone: Record<ChipTone, string> = {
  brand: 'border-brand-600 bg-brand-600 text-white shadow-sm ring-2 ring-brand-500/25',
  copper: 'border-copper-600 bg-copper-600 text-white shadow-sm ring-2 ring-copper-500/25',
}

const idleByTone: Record<ChipTone, string> = {
  brand:
    'border-border bg-card text-foreground shadow-xs hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800',
  copper:
    'border-border bg-card text-foreground shadow-xs hover:border-copper-300 hover:bg-copper-50 hover:text-copper-800',
}

const sizeClasses: Record<ChipSize, string> = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3.5 py-1.5 text-xs',
}

export interface FilterChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  active: boolean
  tone?: ChipTone
  size?: ChipSize
}

export function FilterChip({
  active,
  tone = 'brand',
  size = 'sm',
  className,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'rounded-full border font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        sizeClasses[size],
        active ? activeByTone[tone] : idleByTone[tone],
        className,
      )}
      {...props}
    />
  )
}

/** Keeps the spacing of a chip row identical wherever filters appear. */
export function FilterChipGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center gap-1.5', className)} {...props} />
}
