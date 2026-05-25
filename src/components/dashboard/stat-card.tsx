import { cn } from '@/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  subtitle?: string
  loading?: boolean
  onClick?: () => void
}

export function StatCard({ title, value, icon, color, bgColor, borderColor, subtitle, loading, onClick }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-white p-5 shadow-sm text-left w-full transition-all duration-200',
        onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default',
        borderColor
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bgColor)}>
          <span className={color}>{icon}</span>
        </div>
      </div>
      <p className={cn('text-3xl font-bold', color)}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </button>
  )
}
