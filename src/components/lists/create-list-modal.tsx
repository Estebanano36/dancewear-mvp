 'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { costumeService } from '@/lib/services/costume.service'
import { listService } from '@/lib/services/list.service'
import type { Costume } from '@/types'
import { toast } from 'sonner'

interface Props {
  onClose: () => void
  onCreated: (id: string) => void
}

export function CreateListModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [selectedCostume, setSelectedCostume] = useState<string | null>(null)
  const [stock, setStock] = useState(1)
  const [adding, setAdding] = useState(false)
  const [items, setItems] = useState<{ costumeId: string; stock: number }[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const all = await costumeService.getAll()
        setCostumes(all)
      } catch (e) {
        // ignore
      }
    }
    load()
  }, [])

  const handleAddItem = () => {
    if (!selectedCostume) return
    setItems((s) => [...s, { costumeId: selectedCostume!, stock }])
    setSelectedCostume(null)
    setStock(1)
  }

  const handleCreate = async () => {
    if (!name) return toast.error('Nombre requerido')
    try {
      setAdding(true)
      const list = await listService.create({ name, description })
      for (const it of items) {
        await listService.addItem(list.id, it.costumeId, it.stock)
      }
      toast.success('Lista creada')
      onCreated(list.id)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
          <h3 className="font-bold text-lg mb-3">Crear lista</h3>
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="mb-2" />
          <Input placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} className="mb-4" />

          <div className="mb-3">
            <Select value={selectedCostume ?? undefined} onValueChange={(v) => setSelectedCostume(v || null)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar vestuario" />
              </SelectTrigger>
              <SelectContent>
                {costumes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} · {c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 mt-2">
              <Input type="number" value={stock} min={1} onChange={(e) => setStock(Number(e.target.value))} />
              <Button onClick={handleAddItem}>Añadir</Button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="text-sm">{costumes.find(c => c.id === it.costumeId)?.name || it.costumeId}</div>
                <div className="text-sm">Stock: {it.stock}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} loading={adding} className="flex-1">Crear lista</Button>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default CreateListModal
