import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-violet-100 text-violet-700',
        secondary: 'border-transparent bg-gray-100 text-gray-700',
        destructive: 'border-transparent bg-red-100 text-red-700',
        outline: 'border-gray-200 text-gray-600',
        available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        borrowed: 'border-amber-200 bg-amber-50 text-amber-700',
        reserved: 'border-blue-200 bg-blue-50 text-blue-700',
        washing: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        repair: 'border-orange-200 bg-orange-50 text-orange-700',
        lost: 'border-red-200 bg-red-50 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
