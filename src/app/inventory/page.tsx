'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Search, FolderPlus, Plus, Upload, X, Loader2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useUser } from '@/hooks/use-user'
import { listService } from '@/lib/services/list.service'
import { costumeService } from '@/lib/services/costume.service'
import type { List as InventoryList, Costume, CostumeStatus } from '@/types'
import { formatDate } from '@/utils'
import Link from 'next/link'
import CreateListModal from '@/components/lists/create-list-modal'
import { CreateCostumeModal } from '@/components/costumes/create-costume-modal'
import { BulkUploadModal } from '@/components/costumes/bulk-upload-modal'
import { useSearchParams } from 'next/navigation'
import { CostumeCard } from '@/components/costumes/costume-card'

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponibles',
  borrowed: 'Prestados',
  washing: 'En lavado',
  repair: 'En arreglo',
  lost: 'Perdidos',
  reserved: 'Reservados',
}

const FILTER_CHIPS = [
  { id: 'all', label: '✨ Todos', type: 'all' },
  { id: 'available', label: '🟢 Disponibles', type: 'status', value: 'available' },
  { id: 'borrowed', label: '🟡 Prestados', type: 'status', value: 'borrowed' },
  { id: 'washing', label: '🧼 En lavado', type: 'status', value: 'washing' },
  { id: 'repair', label: '🪡 En arreglo', type: 'status', value: 'repair' },
  { id: 'vestido', label: '👗 Vestidos', type: 'search', value: 'vestido' },
  { id: 'tocado', label: '🎩 Tocados', type: 'search', value: 'tocado' },
  { id: 'calzado', label: '👠 Calzado', type: 'search', value: 'calzado' },
  { id: 'accesorio', label: '🪄 Accesorios', type: 'search', value: 'accesorio' },
  { id: 'traje', label: '✨ Trajes', type: 'search', value: 'traje' },
]

const PAGE_SIZE = 60

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function InventoryContent() {
  const { user } = useUser()
  const searchParams = useSearchParams()

  const [lists, setLists] = useState<InventoryList[]>([])
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [total, setTotal] = useState(0)
  const [activeTab, setActiveTab] = useState<'costumes' | 'lists'>('costumes')
  const [statusFilter, setStatusFilter] = useState<CostumeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCreateList, setShowCreateList] = useState(false)
  const [showCreateCostume, setShowCreateCostume] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [activeChip, setActiveChip] = useState('all')

  const debouncedSearch = useDebounce(searchInput, 400)

  // Refs that always hold the latest values — safe to read inside IntersectionObserver
  const pageRef = useRef(0)
  const hasMoreRef = useRef(false)
  const isFetchingRef = useRef(false)
  const searchRef = useRef('')
  const statusRef = useRef<CostumeStatus | null>(null)

  // Keep search/status refs in sync
  useEffect(() => { searchRef.current = debouncedSearch }, [debouncedSearch])
  useEffect(() => { statusRef.current = statusFilter }, [statusFilter])

  // On mount: if ?status= is present, set filter
  useEffect(() => {
    const s = searchParams.get('status') as CostumeStatus | null
    if (s && Object.keys(STATUS_LABELS).includes(s)) {
      setActiveTab('costumes')
      setStatusFilter(s)
      setActiveChip(s)
    }
  }, [searchParams])

  // Load lists
  const loadLists = useCallback(async () => {
    try {
      const data = await listService.getAll()
      setLists(data)
    } catch {
      toast.error('Error al cargar listas')
    }
  }, [])

  // Reset and load page 0 of costumes
  const resetAndLoad = useCallback(async (search: string, status: CostumeStatus | null) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setLoading(true)
    try {
      const result = await costumeService.getAllPaginated({
        search: search || undefined,
        status: status || undefined,
        page: 0,
        pageSize: PAGE_SIZE,
      })
      setCostumes(result.data)
      setTotal(result.total)
      pageRef.current = 0
      hasMoreRef.current = result.data.length >= PAGE_SIZE && result.total > PAGE_SIZE
    } catch {
      toast.error('Error al cargar el inventario')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // Load next page
  const loadNextPage = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return
    isFetchingRef.current = true
    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    try {
      const result = await costumeService.getAllPaginated({
        search: searchRef.current || undefined,
        status: statusRef.current || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      if (result.data.length > 0) {
        setCostumes((prev) => {
          const ids = new Set(prev.map((c) => c.id))
          const newItems = result.data.filter((c) => !ids.has(c.id))
          return [...prev, ...newItems]
        })
        pageRef.current = nextPage
      }
      hasMoreRef.current = result.data.length >= PAGE_SIZE
    } catch {
      toast.error('Error al cargar más vestuarios')
    } finally {
      setLoadingMore(false)
      isFetchingRef.current = false
    }
  }, [])

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage()
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadNextPage])

  useEffect(() => {
    if (activeTab === 'costumes') {
      resetAndLoad(debouncedSearch, statusFilter)
    }
  }, [debouncedSearch, statusFilter, activeTab, resetAndLoad])

  useEffect(() => {
    loadLists()
  }, [loadLists])

  const handleChipClick = (chip: typeof FILTER_CHIPS[number]) => {
    setActiveChip(chip.id)
    if (chip.type === 'all') {
      setStatusFilter(null)
      setSearchInput('')
    } else if (chip.type === 'status') {
      setStatusFilter(chip.value as CostumeStatus)
    } else if (chip.type === 'search') {
      setStatusFilter(null)
      setSearchInput(chip.value!)
    }
  }

  const handleDeleteCostume = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este vestuario?')) return
    try {
      await costumeService.delete(id)
      setCostumes((prev) => prev.filter((c) => c.id !== id))
      setTotal((prev) => Math.max(0, prev - 1))
      toast.success('Vestuario eliminado')
    } catch {
      toast.error('Error al eliminar vestuario')
    }
  }

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
    (list.description || '').toLowerCase().includes(searchInput.trim().toLowerCase())
  )

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Inventario de Vestuarios
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando prendas...' : activeTab === 'costumes'
              ? `${total} prendas registradas con fotos de catálogo`
              : `${filteredLists.length} colecciones y listas creadas`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(user?.role === 'coordinator' || user?.role === 'admin') && (
            <>
              <Button
                onClick={() => setShowCreateCostume(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md shadow-violet-200 font-semibold"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nueva Prenda
              </Button>
              <Button
                onClick={() => setShowCreateList(true)}
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200 hover:bg-violet-50 hover:border-violet-200"
              >
                <FolderPlus className="w-4 h-4 mr-1.5" />
                Nueva Lista
              </Button>
              <Button
                onClick={() => setShowBulkUpload(true)}
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Carga Masiva
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs (Prendas vs Listas) */}
      <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-2xl w-fit border border-gray-200/60">
        <button
          onClick={() => { setActiveTab('costumes'); setSearchInput(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
            activeTab === 'costumes'
              ? 'bg-white text-violet-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>👗</span>
          Prendas Individuales
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-violet-100 text-violet-700">
            {total}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('lists'); setSearchInput(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
            activeTab === 'lists'
              ? 'bg-white text-violet-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>📋</span>
          Colecciones / Listas
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-700">
            {lists.length}
          </span>
        </button>
      </div>

      {/* Search and Quick Filter Chips */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 sm:p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Input
            placeholder={
              activeTab === 'costumes'
                ? "Buscar por nombre, código (ej. VEST-01), categoría o ubicación..."
                : "Buscar listas por nombre o show..."
            }
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              if (activeChip !== 'all') setActiveChip('all')
            }}
            className="h-11 rounded-xl bg-slate-50/70 border-gray-200 focus:bg-white text-sm"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Filter Chips (For Costumes) */}
        {activeTab === 'costumes' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            {FILTER_CHIPS.map((chip) => {
              const isSelected = activeChip === chip.id
              return (
                <button
                  key={chip.id}
                  onClick={() => handleChipClick(chip)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-medium transition-all duration-150 border ${
                    isSelected
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200 font-semibold'
                      : 'bg-white text-gray-700 border-gray-200/80 hover:bg-violet-50/50 hover:border-violet-200'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content Rendering */}
      {activeTab === 'lists' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLists.length === 0 && !loading ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center mx-auto mb-3 text-3xl">
                📋
              </div>
              <h3 className="font-bold text-gray-900 text-base">No se encontraron listas</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Crea una lista para agrupar vestuarios por show o presentación.
              </p>
              {(user?.role === 'coordinator' || user?.role === 'admin') && (
                <Button
                  onClick={() => setShowCreateList(true)}
                  className="mt-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs"
                >
                  Crear primera lista
                </Button>
              )}
            </div>
          ) : (
            filteredLists.map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`} className="block group">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 h-full flex flex-col justify-between group-hover:-translate-y-0.5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-mono text-gray-400">
                        {formatDate(list.created_at)}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base group-hover:text-violet-700 transition-colors">
                      {list.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                      {list.description || 'Sin descripción adicional'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-violet-600">
                    <span>Ver vestuarios incluidos</span>
                    <span>→</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Rich Grid of Costume Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse h-80 flex flex-col"
                >
                  <div className="h-52 bg-gray-100" />
                  <div className="p-4 space-y-2 flex-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : costumes.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 text-3xl">
                  ✨
                </div>
                <h3 className="font-bold text-gray-900 text-base">No hay prendas que coincidan</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Prueba cambiando los filtros o la búsqueda para encontrar el vestuario deseado.
                </p>
                <Button
                  onClick={() => {
                    setActiveChip('all')
                    setStatusFilter(null)
                    setSearchInput('')
                  }}
                  variant="outline"
                  className="mt-4 rounded-xl text-xs"
                >
                  Restablecer filtros
                </Button>
              </div>
            ) : (
              costumes.map((costume) => (
                <CostumeCard
                  key={costume.id}
                  costume={costume}
                  onDelete={handleDeleteCostume}
                />
              ))
            )}
          </div>

          {/* Infinite scroll sentinel */}
          {!loading && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 bg-violet-50 px-4 py-2 rounded-full border border-violet-200">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cargando más vestuarios...
                </div>
              ) : costumes.length > 0 && costumes.length >= total ? (
                <p className="text-xs text-gray-400">
                  Has visualizado las {total} prendas del inventario 🎉
                </p>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateList && (
        <CreateListModal
          onClose={() => setShowCreateList(false)}
          onCreated={(id) => { setShowCreateList(false); window.location.href = `/lists/${id}` }}
        />
      )}

      {showCreateCostume && (
        <CreateCostumeModal
          onClose={() => setShowCreateCostume(false)}
          onSuccess={async () => {
            setShowCreateCostume(false)
            resetAndLoad(debouncedSearch, statusFilter)
          }}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={async () => {
            setShowBulkUpload(false)
            resetAndLoad(debouncedSearch, statusFilter)
          }}
        />
      )}
    </div>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Cargando catálogo...</div>}>
      <InventoryContent />
    </Suspense>
  )
}
