'use client'

import { useState, useEffect, Suspense } from 'react'
import { Search } from 'lucide-react'
import { FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useUser } from '@/hooks/use-user'
import { listService } from '@/lib/services/list.service'
import type { List as InventoryList } from '@/types'
import { formatDate } from '@/utils'
import Link from 'next/link'
import CreateListModal from '@/components/lists/create-list-modal'


function InventoryContent() {
  const { user } = useUser()
  const [lists, setLists] = useState<InventoryList[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateList, setShowCreateList] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const loadLists = async () => {
      try {
        setLoading(true)
        const data = await listService.getAll()
        setLists(data)
      } catch {
        toast.error('Error al cargar las listas')
      } finally {
        setLoading(false)
      }
    }
    loadLists()
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
  }

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
    (list.description || '').toLowerCase().includes(searchInput.trim().toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : `${filteredLists.length} listas`}
          </p>
        </div>
        <div className="flex gap-2">
          {(user?.role === 'coordinator' || user?.role === 'admin') && (
            <Button onClick={() => setShowCreateList(true)} size="sm" variant="outline">
              <FolderPlus className="w-4 h-4" />
              Nueva lista
            </Button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Input
            placeholder="Buscar listas por nombre o descripción..."
            leftIcon={<Search className="w-4 h-4" />}
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1"
          />
          <div className="text-sm text-gray-500">
            {filteredLists.length} {filteredLists.length === 1 ? 'lista' : 'listas'}
          </div>
        </div>
      </div>

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

      {showCreateList && (
        <CreateListModal
          onClose={() => setShowCreateList(false)}
          onCreated={(id) => { setShowCreateList(false); window.location.href = `/lists/${id}` }}
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
