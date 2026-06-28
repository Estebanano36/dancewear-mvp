'use client'

import { useState, useEffect, useRef } from 'react'
import { listService } from '@/lib/services/list.service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { List } from '@/types'
import { ListQRButton } from '@/components/lists/list-qr-button'
import { Pencil, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/hooks/use-user'
import { useParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ListDetailPage() {
  const params = useParams()
  const id = params.id as string
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
          <Link href="/lists">
            <Button variant="outline">Volver</Button>
          </Link>
          {list && <ListQRButton list={list} />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {list?.items?.filter((it) => it.costume != null).map((it) => (
          <Link key={it.id} href={`/inventory/${it.costume?.id}`} className="block">
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-center hover:shadow-sm transition-shadow">
              <div className="w-20 h-20 bg-gray-50 rounded overflow-hidden flex-shrink-0">
                {it.costume?.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.costume.photos[0]} alt={it.costume.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">👗</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{it.costume?.name || '—'}</div>
                <div className="text-xs text-gray-400">{it.costume?.code}</div>
                <div className="text-sm text-gray-600 mt-2">Stock: <span className="font-medium">{it.stock}</span></div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
