import React from 'react'
import Link from 'next/link'
import { listService } from '@/lib/services/list.service'
import { Button } from '@/components/ui/button'
import { Layers, ArrowRight, Shirt } from 'lucide-react'
import { formatDate } from '@/utils'

export default async function ListsPage() {
  const lists = await listService.getAll()

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Colecciones y Listas de Show
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Agrupaciones de vestuarios preparadas para eventos, coreografías o temáticas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory">
            <Button variant="outline" className="rounded-xl border-gray-200 hover:bg-violet-50 hover:border-violet-200">
              <Shirt className="w-4 h-4 mr-1.5 text-violet-600" />
              Ver Inventario Completo
            </Button>
          </Link>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-8 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-3 text-3xl">
            📋
          </div>
          <h3 className="font-bold text-gray-900 text-lg">No hay listas creadas</h3>
          <p className="text-sm text-gray-500 mt-1">
            Puedes crear listas desde el inventario para agrupar prendas de un show.
          </p>
          <Link href="/inventory" className="inline-block mt-4">
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white">
              Ir al Inventario
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((l) => (
            <Link key={l.id} href={`/lists/${l.id}`} className="block group">
              <div className="bg-white rounded-2xl border border-gray-100/90 p-5 hover:shadow-xl transition-all duration-200 h-full flex flex-col justify-between group-hover:-translate-y-0.5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-100 to-purple-100 text-violet-700 flex items-center justify-center font-bold shadow-sm">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-gray-400">
                      {formatDate(l.created_at)}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-violet-700 transition-colors">
                    {l.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                    {l.description || 'Sin descripción adicional'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-violet-700">
                  <span>Abrir lista & código QR</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
