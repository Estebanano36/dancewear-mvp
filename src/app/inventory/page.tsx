'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Search, FolderPlus, Plus, Upload, X, Loader2 } from 'lucide-react'
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
import { useSearchParams, useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponibles',
  borrowed: 'Prestados',
  washing: 'En lavado',
  repair: 'En arreglo',
  lost: 'Perdidos',
  reserved: 'Reservados',
}

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
  const router = useRouter()

  const [lists, setLists] = useState<InventoryList[]>([])
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<'lists' | 'costumes'>('lists')
  const [statusFilter, setStatusFilter] = useState<CostumeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCreateList, setShowCreateList] = useState(false)
  const [showCreateCostume, setShowCreateCostume] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const debouncedSearch = useDebounce(searchInput, 400)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // On mount: if ?status= is present, jump to costumes tab and set filter
  useEffect(() => {
    const s = searchParams.get('status') as CostumeStatus | null
    if (s && Object.keys(STATUS_LABELS).includes(s)) {
      setActiveTab('costumes')
      setStatusFilter(s)
    }
  }, [searchParams])

  // Load lists (lightweight, no pagination needed)
  const loadLists = useCallback(async () => {
    try {
      const data = await listService.getAll()
      setLists(data)
    } catch {
      toast.error('Error al cargar listas')
    }
  }, [])

  // Load first page of costumes (reset)
  const loadCostumes = useCallback(async (search: string, status: CostumeStatus | null) => {
    if (loadingRef.current) return
    loadingRef.current = true
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
      setPage(0)
      setHasMore(result.data.length === PAGE_SIZE && result.total > PAGE_SIZE)
    } catch {
      toast.error('Error al cargar el inventario')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  // Load next page for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingRef.current || loadingMore || !hasMore) return
    loadingRef.current = true
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await costumeService.getAllPaginated({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      setCostumes((prev) => {
        // Deduplicate
        const ids = new Set(prev.map((c) => c.id))
        const newItems = result.data.filter((c) => !ids.has(c.id))
        return [...prev, ...newItems]
      })
      setPage(nextPage)
      setHasMore(result.data.length === PAGE_SIZE)
    } catch {
      toast.error('Error al cargar más vestuarios')
    } finally {
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [loadingMore, hasMore, page, debouncedSearch, statusFilter])

  // Reload when search or status filter changes
  useEffect(() => {
    if (activeTab === 'costumes') {
      loadCostumes(debouncedSearch, statusFilter)
    }
  }, [debouncedSearch, statusFilter, activeTab, loadCostumes])

  // Load lists once on mount
  useEffect(() => {
    loadLists()
  }, [loadLists])

  // Switch to costumes tab: load if not loaded yet
  useEffect(() => {
    if (activeTab === 'costumes' && costumes.length === 0 && !loading) {
      loadCostumes(debouncedSearch, statusFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Intersection observer for infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMore])

  const clearStatusFilter = () => {
    setStatusFilter(null)
    router.replace('/inventory', { scroll: false })
  }

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
    (list.description || '').toLowerCase().includes(searchInput.trim().toLowerCase())
  )

  const handleTabChange = (tab: 'lists' | 'costumes') => {
    setActiveTab(tab)
    setSearchInput('')
    if (tab === 'costumes' && costumes.length === 0) {
      loadCostumes('', statusFilter)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : activeTab === 'lists'
              ? `${filteredLists.length} listas`
              : `${costumes.length} de ${total} vestuarios`}
          </p>
        </div>
        <div className="flex gap-2">
          {(user?.role === 'coordinator' || user?.role === 'admin') && (
            <>
              <Button onClick={() => setShowCreateCostume(true)} size="sm">
                <Plus className="w-4 h-4" />
                Nuevo vestuario
              </Button>
              <Button onClick={() => setShowBulkUpload(true)} size="sm" variant="outline">
                <Upload className="w-4 h-4" />
                Carga masiva (CSV)
              </Button>
              <Button onClick={() => setShowCreateList(true)} size="sm" variant="outline">
                <FolderPlus className="w-4 h-4" />
                Nueva lista
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-100 mb-6">
        <button
          onClick={() => handleTabChange('lists')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all duration-150 ${
            activeTab === 'lists'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Colecciones / Listas
        </button>
        <button
          onClick={() => handleTabChange('costumes')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all duration-150 ${
            activeTab === 'costumes'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Prendas individuales
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Input
            placeholder={activeTab === 'lists' ? "Buscar listas por nombre o descripción..." : "Buscar prendas por nombre, código, categoría o ubicación..."}
            leftIcon={<Search className="w-4 h-4" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          {/* Active status filter pill */}
          {activeTab === 'costumes' && statusFilter && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-sm font-medium flex-shrink-0">
              <StatusBadge status={statusFilter} />
              <button
                onClick={clearStatusFilter}
                className="ml-1 text-violet-400 hover:text-violet-700 transition-colors"
                title="Quitar filtro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="text-sm text-gray-500 flex-shrink-0">
            {activeTab === 'lists'
              ? `${filteredLists.length} ${filteredLists.length === 1 ? 'lista' : 'listas'}`
              : loading ? '...' : `${total} ${total === 1 ? 'prenda' : 'prendas'}`
            }
          </div>
        </div>
      </div>

      {activeTab === 'lists' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.length === 0 && !loading ? (
            <div className="col-span-full py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">No se encontraron listas</p>
            </div>
          ) : (
            filteredLists.map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`} className="block">
                <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow h-full">
                  <div className="font-semibold text-gray-900 text-lg">{list.name}</div>
                  <p className="text-sm text-gray-500 mt-2 truncate">{list.description || 'Sin descripción'}</p>
                  <div className="text-xs text-gray-400 mt-4">Creada el {formatDate(list.created_at)}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              [...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse h-24" />
              ))
            ) : costumes.length === 0 ? (
              <div className="col-span-full py-16 text-center text-gray-400">
                <p className="text-4xl mb-3">👗</p>
                <p className="font-medium">No se encontraron vestuarios</p>
              </div>
            ) : (
              costumes.map((costume) => (
                <Link key={costume.id} href={`/inventory/${costume.id}`} className="block">
                  <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-center hover:shadow-md transition-shadow h-full">
                    <div className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-100 flex items-center justify-center">
                      {costume.photos?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={costume.photos[0]}
                          alt={costume.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="text-2xl">👗</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate text-sm">{costume.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">{costume.code}</div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 font-semibold">
                          {costume.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-600 font-medium font-mono border border-gray-100">
                          Talla {costume.size}
                        </span>
                        <StatusBadge status={costume.status} className="text-[10px] px-1.5 py-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Infinite scroll sentinel */}
          {!loading && hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              {loadingMore && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando más...
                </div>
              )}
            </div>
          )}

          {/* End of results message */}
          {!loading && !hasMore && costumes.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-4">
              {costumes.length} de {total} prendas mostradas
            </p>
          )}
        </>
      )}

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
            loadCostumes(debouncedSearch, statusFilter)
          }}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={async () => {
            setShowBulkUpload(false)
            loadCostumes(debouncedSearch, statusFilter)
          }}
        />
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
