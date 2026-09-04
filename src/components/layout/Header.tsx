import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Menu, Search } from 'lucide-react'

import { useAppStore } from '@/store/appStore'
import { useAsync } from '@/hooks/useAsync'
import { getAlerts } from '@/services'
import { flatNavEntries } from '@/lib/navigation'
import { factories } from '@/mock'
import { formatRelative } from '@/lib/format'
import { dateRangeLabels } from '@/lib/dateRange'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { userRoleTitles, type DateRangePreset, type FactoryId } from '@/types'

const dateRangePresets: DateRangePreset[] = ['today', '7d', '30d', 'thisMonth']

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate()
  const { factoryId, setFactoryId, dateRangePreset, setDateRangePreset, userRole } = useAppStore()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const { data: alerts } = useAsync(getAlerts, [])
  const unackCount = alerts?.filter((a) => !a.acknowledged).length ?? 0

  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return flatNavEntries.filter((e) => e.label.toLowerCase().includes(q)).slice(0, 8)
  }, [query])

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-xl lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSearchOpen(true)
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
          placeholder="Search orders, products, machines, suppliers…"
          className="rounded-full bg-muted/70 pl-9 shadow-none focus-visible:bg-card"
        />
        {searchOpen && matches.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg">
            {matches.map((m) => (
              <button
                key={m.path}
                type="button"
                className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                onMouseDown={() => {
                  navigate(m.path)
                  setQuery('')
                  setSearchOpen(false)
                }}
              >
                <span className="font-medium text-foreground">{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.sectionLabel}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Select value={factoryId} onValueChange={(v) => setFactoryId(v as FactoryId)}>
          <SelectTrigger className="hidden w-44 bg-card sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {factories.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRangePreset} onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}>
          <SelectTrigger className="hidden w-36 bg-card md:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRangePresets.map((preset) => (
              <SelectItem key={preset} value={preset}>
                {dateRangeLabels[preset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
              <Bell className="h-4.5 w-4.5" />
              {unackCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white ring-2 ring-card">
                  {unackCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
              <span className="font-display text-sm font-semibold">Notifications</span>
              <Badge variant="danger">{unackCount} new</Badge>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {(alerts ?? []).slice(0, 6).map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => navigate(alert.linkTo)}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-accent"
                >
                  <div className="flex w-full items-center gap-2">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        alert.severity === 'critical' && 'bg-danger-500',
                        alert.severity === 'high' && 'bg-warning-500',
                        (alert.severity === 'medium' || alert.severity === 'low' || alert.severity === 'info') &&
                          'bg-info-500',
                      )}
                    />
                    <span className="flex-1 truncate text-xs font-medium text-foreground">{alert.title}</span>
                  </div>
                  <span className="pl-3.5 text-[11px] text-muted-foreground">{formatRelative(alert.timestamp)}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/')}>
                View all on dashboard
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-accent"
            >
              <Avatar className="h-8 w-8 ring-1 ring-border">
                <AvatarFallback>HT</AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <div className="text-xs font-semibold text-foreground">Hari Thiagarajan</div>
                <div className="text-[11px] text-muted-foreground">{userRoleTitles[userRole]}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2 pb-2 text-xs text-muted-foreground">hari.thiagarajan@gmail.com</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin')}>Account settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/admin')}>Administration</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
