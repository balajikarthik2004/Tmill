import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface Props {
  title: string
  description?: string
  icon?: LucideIcon
}

/** Branded placeholder for modules still being built out. Carries forward any query
 *  params it was navigated with so a dashboard click still lands somewhere meaningful. */
export function ComingSoonPage({ title, description, icon: Icon = Construction }: Props) {
  const [searchParams] = useSearchParams()
  const filters = [...searchParams.entries()]

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
          <Icon className="h-7 w-7 text-success-600" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <div className="mt-2 flex justify-center">
          <Badge variant="info">In development</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {description ?? 'This module is being built out for the T-Mills ERP prototype.'}
        </p>
        {filters.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Carried over from your last action
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {filters.map(([key, value]) => (
                <Badge key={key} variant="secondary">
                  {key}: {value}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
