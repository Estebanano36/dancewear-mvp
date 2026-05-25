import { CostumeStatus, STATUS_CONFIG } from '@/types'
import { cn } from '@/utils'

interface StatusBadgeProps {
  status: CostumeStatus
  className?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.bg,
        config.color,
        config.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span className="text-[10px]">{config.icon}</span>
      {config.label}
    </span>
  )
}
