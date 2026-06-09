'use client'

import { Shirt, QrCode, User, Calendar, MapPin, Trash } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import type { Costume } from '@/types'
import { formatDate } from '@/utils'
import Link from 'next/link'
import { useUser } from '@/hooks/use-user'

interface CostumeCardProps {
  costume: Costume
  onQRClick?: (costume: Costume) => void
  onDelete?: (id: string) => void
}

export function CostumeCard({ costume, onQRClick, onDelete }: CostumeCardProps) {
  const { user } = useUser()

  const handleDelete = () => {
    onDelete?.(costume.id)
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Photo or placeholder */}
      <div className="h-40 bg-gradient-to-br from-violet-50 to-purple-50 relative overflow-hidden">
        {costume.photos?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={costume.photos[0]}
            alt={costume.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shirt className="w-12 h-12 text-violet-200" />
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <StatusBadge status={costume.status} />
        </div>
        {costume.size && (
          <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs font-semibold text-gray-700">
            {costume.size}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 truncate">{costume.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{costume.code} · {costume.category}</p>
        </div>

        {/* Details */}
        <div className="space-y-1.5 mb-4">
          {costume.current_holder && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User className="w-3 h-3 text-gray-400" />
              <span className="truncate">{costume.current_holder.full_name}</span>
            </div>
          )}
          {costume.current_event && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="truncate">{costume.current_event.name}</span>
            </div>
          )}
          {costume.location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="truncate">{costume.location}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/inventory/${costume.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
              Ver detalle
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onQRClick?.(costume)}
            title="Ver QR"
          >
            <QrCode className="w-4 h-4 text-gray-500" />
          </Button>
          {(user?.role === 'coordinator' || user?.role === 'admin') && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              title="Eliminar vestuario"
            >
              <Trash className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
