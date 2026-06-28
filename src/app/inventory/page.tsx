'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { Search, FolderPlus, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useUser } from '@/hooks/use-user'
import { listService } from '@/lib/services/list.service'
import { costumeService } from '@/lib/services/costume.service'
import type { List as InventoryList, Costume } from '@/types'
import { formatDate } from '@/utils'
import Link from 'next/link'
import CreateListModal from '@/components/lists/create-list-modal'
import { CreateCostumeModal } from '@/components/costumes/create-costume-modal'
import { BulkUploadModal } from '@/components/costumes/bulk-upload-modal'



function InventoryContent() {
  const { user } = useUser()
  const [lists, setLists] = useState<InventoryList[]>([])
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [activeTab, setActiveTab] = useState<'lists' | 'costumes'>('lists')
  const [loading, setLoading] = useState(true)
  const [showCreateList, setShowCreateList] = useState(false)
  const [showCreateCostume, setShowCreateCostume] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [listsData, costumesData] = await Promise.all([
        listService.getAll(),
        costumeService.getAll()
      ])
      setLists(listsData)
      // Deduplicate to prevent duplicate keys in case of concurrent writes/pagination shifts
      const uniqueCostumes = costumesData.filter(
        (c, idx, self) => self.findIndex((t) => t.id === c.id) === idx
      )
      setCostumes(uniqueCostumes)
    } catch {
      toast.error('Error al cargar el inventario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
  }

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
    (list.description || '').toLowerCase().includes(searchInput.trim().toLowerCase())
  )

  const filteredCostumes = costumes.filter((c) =>
    c.name.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
    c.code.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
    c.category.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
    (c.location || '').toLowerCase().includes(searchInput.trim().toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : activeTab === 'lists' ? `${filteredLists.length} listas` : `${filteredCostumes.length} vestuarios`}
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
          onClick={() => { setActiveTab('lists'); setSearchInput('') }}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all duration-150 ${
            activeTab === 'lists'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Colecciones / Listas
        </button>
        <button
          onClick={() => { setActiveTab('costumes'); setSearchInput('') }}
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
            placeholder={activeTab === 'lists' ? "Buscar listas por nombre o descripción..." : "Buscar prendas por nombre, código o categoría..."}
            leftIcon={<Search className="w-4 h-4" />}
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1"
          />
          <div className="text-sm text-gray-500">
            {activeTab === 'lists' 
              ? `${filteredLists.length} ${filteredLists.length === 1 ? 'lista' : 'listas'}`
              : `${filteredCostumes.length} ${filteredCostumes.length === 1 ? 'prenda' : 'prendas'}`
            }
          </div>
        </div>
      </div>

      {activeTab === 'lists' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse h-40" />
            ))
          ) : filteredLists.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse h-24" />
            ))
          ) : filteredCostumes.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">👗</p>
              <p className="font-medium">No se encontraron vestuarios</p>
            </div>
          ) : (
            filteredCostumes.map((costume) => (
              <Link key={costume.id} href={`/inventory/${costume.id}`} className="block">
                <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-center hover:shadow-md transition-shadow h-full">
                  <div className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-100 flex items-center justify-center">
                    {costume.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={costume.photos[0]} alt={costume.name} className="w-full h-full object-cover" />
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
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
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
            loadData()
          }}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={async () => {
            setShowBulkUpload(false)
            loadData()
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
