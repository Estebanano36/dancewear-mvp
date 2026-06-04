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
        'glass-card p-5 text-left w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-24px_rgba(124,58,237,0.45)]',
        onClick ? 'cursor-pointer' : 'cursor-default',
        borderColor
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-semibold text-gray-500">{title}</span>
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center soft-ring', bgColor)}>
          <span className={cn('text-lg', color)}>{icon}</span>
        </div>
      </div>
      <p className={cn('text-3xl font-black tracking-tight', color)}>{value}</p>
      {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : <p className="text-xs text-transparent mt-1">.</p>}
    </button>
  )
}
