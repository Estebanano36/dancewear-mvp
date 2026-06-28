'use client'

import { useState, useEffect } from 'react'
import { listService } from '@/lib/services/list.service'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { List } from '@/types'
import { FolderPlus, Search, Check } from 'lucide-react'

interface AddToListModalProps {
  costumeId: string
  costumeName: string
  onClose: () => void
}

export function AddToListModal({ costumeId, costumeName, onClose }: AddToListModalProps) {
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [stock, setStock] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listService.getAll().then((data) => {
      setLists(data)
      setLoading(false)
    }).catch(() => {
      toast.error('Error al cargar las listas')
      setLoading(false)
    })
  }, [])

  const filteredLists = lists.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    if (!selectedListId) {
      toast.error('Selecciona una lista primero')
      return
    }
    if (stock < 1) {
      toast.error('El stock debe ser al menos 1')
      return
    }
    try {
      setSaving(true)
      await listService.addItem(selectedListId, costumeId, stock)
      toast.success('Vestuario añadido a la lista correctamente')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al añadir a la lista')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-violet-500" />
            Añadir a lista
          </DialogTitle>
        </DialogHeader>

        {/* Costume name reminder */}
        <div className="px-3 py-2 bg-violet-50 rounded-lg text-sm text-violet-700 font-medium border border-violet-100">
          👗 {costumeName}
        </div>

        {/* List search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar lista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all"
          />
        </div>

        {/* List selector */}
        <div className="max-h-56 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
            ))
          ) : filteredLists.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">No hay listas disponibles</p>
          ) : (
            filteredLists.map((list) => (
              <button
                key={list.id}
                onClick={() => setSelectedListId(list.id === selectedListId ? null : list.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  selectedListId === list.id
                    ? 'bg-violet-50 border border-violet-200 text-violet-800'
                    : 'hover:bg-gray-50 border border-transparent text-gray-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                  selectedListId === list.id ? 'border-violet-500 bg-violet-500' : 'border-gray-300'
                }`}>
                  {selectedListId === list.id && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{list.name}</p>
                  {list.description && (
                    <p className="text-xs text-gray-400 truncate">{list.description}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Stock input */}
        <div>
          <Label htmlFor="stock-input">Cantidad / Stock</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => setStock((s) => Math.max(1, s - 1))}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg leading-none transition-colors"
            >
              −
            </button>
            <Input
              id="stock-input"
              type="number"
              min={1}
              value={stock}
              onChange={(e) => setStock(Math.max(1, Number(e.target.value)))}
              className="text-center w-20 font-semibold"
            />
            <button
              onClick={() => setStock((s) => s + 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg leading-none transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            loading={saving}
            disabled={!selectedListId || saving}
          >
            <FolderPlus className="w-4 h-4" />
            Añadir a lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
