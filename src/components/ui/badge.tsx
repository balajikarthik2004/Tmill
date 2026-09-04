import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5 transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-border/70 bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success: 'border-success-100 bg-success-50 text-success-700',
        warning: 'border-warning-100 bg-warning-50 text-warning-700',
        danger: 'border-danger-100 bg-danger-50 text-danger-700',
        info: 'border-info-100 bg-info-50 text-info-700',
        copper: 'border-copper-100 bg-copper-50 text-copper-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
