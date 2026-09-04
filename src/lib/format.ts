import { format, formatDistanceToNow } from 'date-fns'

const numberFormatter = new Intl.NumberFormat('en-IN')
const inrCompactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  notation: 'compact',
})
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatKg(value: number): string {
  return `${numberFormatter.format(value)} kg`
}

export function formatMeters(value: number): string {
  return `${numberFormatter.format(value)} m`
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatInr(value: number): string {
  return inrFormatter.format(value)
}

export function formatInrCompact(value: number): string {
  return inrCompactFormatter.format(value)
}

export function formatDate(iso: string, pattern = 'dd MMM yyyy'): string {
  return format(new Date(iso), pattern)
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy, h:mm a')
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

/** Compact relative time ("5m ago", "3h ago", "2d ago") for dense list rows. */
export function formatRelativeShort(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}
