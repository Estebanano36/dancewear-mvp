'use client'

import { useState, useEffect, useRef } from 'react'
import { listService } from '@/lib/services/list.service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { List } from '@/types'
import { ListQRButton } from '@/components/lists/list-qr-button'
import { Pencil, X, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/hooks/use-user'
import { useParams, useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ListDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { user } = useUser()
  const [list, setList] = useState<List | null>(null)
  const [loading, setLoading] = useState(true)

  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listService.getById(id).then((data) => {
      setList(data)
      setLoading(false)
    }).catch(() => {
      toast.error('Error al cargar la lista')
      setLoading(false)
    })
  }, [id])

  const handleSaveEdit = async (field: 'name' | 'description') => {
    if (!list) return
    const value = field === 'name' ? editName.trim() : editDesc.trim()
    if (field === 'name' && !value) {
      toast.error('El nombre no puede estar vacío')
      return
    }
    try {
      const updated = await listService.update(list.id, { [field]: value })
      setList((prev) => prev ? { ...prev, ...updated } : prev)
      if (field === 'name') setEditingName(false)
      else setEditingDesc(false)
      toast.success('Guardado')
    } catch {
      toast.error('Error al guardar')
    }
  }

  const handleDelete = async () => {
    if (!list) return
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta lista de forma permanente? Esto no eliminará los vestuarios de tu inventario.')) {
      return
    }
    try {
      setLoading(true)
      await listService.delete(list.id)
      toast.success('Lista eliminada exitosamente')
      router.push('/inventory')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la lista')
      setLoading(false)
    }
  }

  const handleUpdateStock = async (itemId: string, currentStock: number, change: number) => {
    const newStock = currentStock + change
    if (newStock < 1) {
      handleRemoveItem(itemId)
      return
    }
    try {
      await listService.updateItemStock(itemId, newStock)
      setList((prev) => {
        if (!prev) return null
        return {
          ...prev,
          items: prev.items?.map((it) => it.id === itemId ? { ...it, stock: newStock } : it)
        }
      })
      toast.success('Stock actualizado')
    } catch {
      toast.error('Error al actualizar el stock')
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!window.confirm('¿Deseas quitar este vestuario de la lista?')) return
    try {
      await listService.removeItem(itemId)
      setList((prev) => {
        if (!prev) return null
        return {
          ...prev,
          items: prev.items?.filter((it) => it.id !== itemId)
        }
      })
      toast.success('Vestuario retirado de la lista')
    } catch {
      toast.error('Error al retirar el vestuario')
    }
  }

  const startEditName = () => {
    if (!list) return
    setEditName(list.name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  const startEditDesc = () => {
    if (!list) return
    setEditDesc(list.description || '')
    setEditingDesc(true)
    setTimeout(() => descInputRef.current?.focus(), 50)
  }

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!list) return <div className="p-4 text-gray-500">Lista no encontrada</div>

  const isAdmin = user?.role === 'coordinator' || user?.role === 'admin'

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex-1 min-w-0">
          {/* Editable name */}
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInputRef}
                className="text-xl font-bold border-b-2 border-violet-400 outline-none bg-transparent w-full"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit('name'); if (e.key === 'Escape') setEditingName(false) }}
              />
              <button onClick={() => handleSaveEdit('name')} className="text-green-600 hover:text-green-700 p-1 flex-shrink-0"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingName(false)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <h1 className="text-xl font-bold truncate">{list.name}</h1>
              {isAdmin && (
                <button onClick={startEditName} className="text-gray-300 hover:text-violet-500 p-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
              )}
            </div>
          )}

          {/* Editable description */}
          {editingDesc ? (
            <div className="flex items-center gap-1 mt-0.5">
              <input
                ref={descInputRef}
                className="text-sm text-gray-500 border-b border-violet-300 outline-none bg-transparent w-full"
                value={editDesc}
                placeholder="Sin descripción"
                onChange={(e) => setEditDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit('description'); if (e.key === 'Escape') setEditingDesc(false) }}
              />
              <button onClick={() => handleSaveEdit('description')} className="text-green-600 hover:text-green-700 p-1 flex-shrink-0"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingDesc(false)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-0.5 group">
              <p className="text-sm text-gray-500 truncate">{list.description || 'Sin descripción'}</p>
              {isAdmin && (
                <button onClick={startEditDesc} className="text-gray-300 hover:text-violet-500 p-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3 h-3" /></button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar lista
            </Button>
          )}
          <Link href="/lists">
            <Button variant="outline">Volver</Button>
          </Link>
          {list && <ListQRButton list={list} />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {list?.items?.filter((it) => it.costume != null).map((it) => (
          <div key={it.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-center hover:shadow-sm transition-shadow relative group">
            <Link href={`/inventory/${it.costume?.id}`} className="w-20 h-20 bg-gray-50 rounded overflow-hidden flex-shrink-0 block">
              {it.costume?.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.costume.photos[0]} alt={it.costume.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">👗</div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/inventory/${it.costume?.id}`} className="font-semibold truncate block hover:text-violet-600">
                {it.costume?.name || '—'}
              </Link>
              <div className="text-xs text-gray-400 font-mono mt-0.5">{it.costume?.code}</div>
              
              <div className="flex items-center justify-between mt-2.5">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <span>Stock:</span>
                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateStock(it.id, it.stock, -1)}
                        className="w-5 h-5 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs"
                      >
                        −
                      </button>
                      <span className="font-semibold text-gray-800 min-w-[1.25rem] text-center">{it.stock}</span>
                      <button
                        onClick={() => handleUpdateStock(it.id, it.stock, 1)}
                        className="w-5 h-5 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-800">{it.stock}</span>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleRemoveItem(it.id)}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
