'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, Filter, Grid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { CostumeCard } from '@/components/costumes/costume-card'
import { CreateCostumeModal } from '@/components/costumes/create-costume-modal'
import { QRModal } from '@/components/qr/qr-modal'
import { useCostumes } from '@/hooks/use-costumes'
import { useUser } from '@/hooks/use-user'
import { costumeService } from '@/lib/services/costume.service'
import { COSTUME_CATEGORIES } from '@/types'
import type { Costume, CostumeStatus } from '@/types'
import { formatDate } from '@/utils'
import Link from 'next/link'

const STATUSES: { value: CostumeStatus; label: string }[] = [
  { value: 'available', label: 'Disponibles' },
  { value: 'borrowed', label: 'Prestados' },
  { value: 'reserved', label: 'Reservados' },
  { value: 'washing', label: 'En lavado' },
  { value: 'repair', label: 'En arreglo' },
  { value: 'lost', label: 'Perdidos' },
]

function InventoryContent() {
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [qrCostume, setQrCostume] = useState<Costume | null>(null)
  const [searchInput, setSearchInput] = useState('')

  const { costumes, loading, filters, updateFilter, clearFilters, refetch, removeCostume } = useCostumes({
    status: searchParams.get('status') as CostumeStatus || undefined,
  })

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este vestuario? Esta acción no se puede deshacer.')) return
    try {
      await costumeService.delete(id)
      removeCostume(id)
      toast.success('Vestuario eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el vestuario')
    }
  }

  const handleSearch = (value: string) => {
    setSearchInput(value)
    updateFilter('search', value || undefined)
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : `${costumes.length} vestuarios`}
          </p>
        </div>
        {(user?.role === 'coordinator' || user?.role === 'admin') && (
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4" />
            Nuevo
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por nombre, código..."
            leftIcon={<Search className="w-4 h-4" />}
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1"
          />
          <Select
            value={filters.status || 'all'}
            onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.category || 'all'}
            onValueChange={(v) => updateFilter('category', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {COSTUME_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                Limpiar ({activeFiltersCount})
              </Button>
            )}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-violet-50 text-violet-600' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-violet-50 text-violet-600' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-40 bg-gray-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))
          ) : costumes.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">👗</p>
              <p className="font-medium">No se encontraron vestuarios</p>
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="text-violet-600 text-sm mt-1 hover:underline">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            costumes.map((costume) => (
              <CostumeCard
                key={costume.id}
                costume={costume}
                onQRClick={setQrCostume}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 font-semibold text-gray-600">Vestuario</th>
                  <th className="text-left p-4 font-semibold text-gray-600 hidden sm:table-cell">Categoría</th>
                  <th className="text-left p-4 font-semibold text-gray-600">Estado</th>
                  <th className="text-left p-4 font-semibold text-gray-600 hidden md:table-cell">Responsable</th>
                  <th className="text-left p-4 font-semibold text-gray-600 hidden lg:table-cell">Actualizado</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="p-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : costumes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">No hay vestuarios</td>
                  </tr>
                ) : (
                  costumes.map((costume) => (
                    <tr key={costume.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{costume.name}</div>
                        <div className="text-xs text-gray-400">{costume.code} · Talla {costume.size}</div>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-gray-600">{costume.category}</td>
                      <td className="p-4">
                        <StatusBadge status={costume.status} size="sm" />
                      </td>
                      <td className="p-4 hidden md:table-cell text-gray-600 text-sm">
                        {costume.current_holder?.full_name || '—'}
                      </td>
                      <td className="p-4 hidden lg:table-cell text-gray-400 text-xs">
                        {formatDate(costume.updated_at)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/inventory/${costume.id}`}>
                            <Button variant="ghost" size="sm" className="text-xs">Ver</Button>
                          </Link>
                          {(user?.role === 'coordinator' || user?.role === 'admin') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-600"
                              onClick={() => handleDelete(costume.id)}
                            >Eliminar</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateCostumeModal
          onSuccess={refetch}
          onClose={() => setShowCreate(false)}
        />
      )}
      {qrCostume && (
        <QRModal costume={qrCostume} onClose={() => setQrCostume(null)} />
      )}
    </div>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Cargando...</div>}>
      <InventoryContent />
    </Suspense>
  )
}
