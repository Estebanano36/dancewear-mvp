'use client'

import { Shirt, User, Calendar, MapPin, Trash, Search, Folder, FolderX, ArrowRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import type { Costume } from '@/types'
import Link from 'next/link'
import { useUser } from '@/hooks/use-user'
import { useState } from 'react'
import { ImageZoom } from '@/components/image-zoom'

interface CostumeCardProps {
  costume: Costume
  onDelete?: (id: string) => void
}

export function CostumeCard({ costume, onDelete }: CostumeCardProps) {
  const { user } = useUser()
  const [zoomOpen, setZoomOpen] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(costume.id)
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100/90 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group hover:-translate-y-1">
        {/* Photo Container with 4:5 vertical proportion */}
        <div className="h-52 sm:h-56 bg-gradient-to-br from-violet-50 via-purple-50/50 to-indigo-50 relative overflow-hidden flex-shrink-0">
          {costume.photos?.[0] ? (
            <button
              className="w-full h-full block relative group/img focus:outline-none"
              onClick={() => setZoomOpen(true)}
              aria-label="Abrir imagen"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={costume.photos[0]}
                alt={costume.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-black/60 text-white rounded-full p-2 backdrop-blur-md transform scale-90 group-hover/img:scale-100 transition-transform">
                  <Search className="w-4 h-4" />
                </span>
              </div>
            </button>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-violet-300 gap-1">
              <Shirt className="w-12 h-12 stroke-1" />
              <span className="text-[11px] font-medium text-gray-400">Sin foto</span>
            </div>
          )}

          {/* Floating Glassmorphism Badges */}
          <div className="absolute top-2.5 right-2.5 shadow-sm">
            <StatusBadge status={costume.status} />
          </div>

          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            {costume.size && (
              <span className="bg-white/95 backdrop-blur-md shadow-sm border border-black/5 rounded-lg px-2 py-0.5 text-xs font-bold text-gray-800">
                {costume.size}
              </span>
            )}
            {costume.category && (
              <span className="bg-black/60 backdrop-blur-md shadow-sm text-white rounded-lg px-2 py-0.5 text-[11px] font-medium">
                {costume.category}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="mb-2">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-violet-700 transition-colors">
                {costume.name}
              </h3>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                {costume.code}
              </p>
            </div>

            {/* Assigned Collection / List */}
            <div className="mb-3">
              {costume.list_items && costume.list_items.length > 0 ? (
                <div
                  className="inline-flex items-center gap-1.5 bg-violet-50/80 text-violet-800 border border-violet-200/70 px-2.5 py-1 rounded-lg font-medium text-[11px] max-w-full"
                  title={costume.list_items.map((i) => i.list?.name).filter(Boolean).join(', ')}
                >
                  <Folder className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                  <span className="truncate">
                    {costume.list_items.map((i) => i.list?.name).filter(Boolean).join(', ') || 'Lista asignada'}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-slate-50 text-gray-400 border border-gray-100 px-2.5 py-1 rounded-lg font-medium text-[11px]">
                  <FolderX className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  <span>Sin lista asignada</span>
                </div>
              )}
            </div>

            {/* Context details: Holder, Event, Location */}
            <div className="space-y-1.5 mb-4">
              {costume.current_holder && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium bg-amber-50/60 rounded-md px-2 py-1">
                  <User className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="truncate">{costume.current_holder.full_name}</span>
                </div>
              )}
              {costume.current_event && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-medium bg-indigo-50/60 rounded-md px-2 py-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span className="truncate">{costume.current_event.name}</span>
                </div>
              )}
              {costume.location && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 px-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{costume.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Link href={`/inventory/${costume.id}`} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold rounded-xl border-gray-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-colors justify-center"
              >
                Ver Detalle
                <ArrowRight className="w-3 h-3 ml-1 text-gray-400 group-hover:text-violet-600" />
              </Button>
            </Link>

            {(user?.role === 'coordinator' || user?.role === 'admin') && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                className="rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                title="Eliminar vestuario"
              >
                <Trash className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {zoomOpen && costume.photos?.[0] && (
        <ImageZoom src={costume.photos[0]} alt={costume.name} onClose={() => setZoomOpen(false)} />
      )}
    </>
  )
}
