'use client'

import { useState, useEffect } from 'react'
import { Plus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { costumeService } from '@/lib/services/costume.service'
import { listService } from '@/lib/services/list.service'
import { COSTUME_CATEGORIES, COSTUME_SIZES, List } from '@/types'
import { toast } from 'sonner'

interface CreateCostumeModalProps {
  onSuccess: () => void
  onClose: () => void
}

export function CreateCostumeModal({ onSuccess, onClose }: CreateCostumeModalProps) {
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: '',
    size: '',
    description: '',
    location: '',
    notes: '',
  })
  const [lists, setLists] = useState<List[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    const loadLists = async () => {
      try {
        const allLists = await listService.getAll()
        setLists(allLists)
      } catch {
        // ignore
      }
    }
    loadLists()
  }, [])

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.size) {
      toast.error('Completa los campos requeridos')
      return
    }

    try {
      setLoading(true)
      const costume = await costumeService.create({
        ...form,
        photos: [],
        status: 'available',
        current_holder_id: undefined,
        current_event_id: undefined,
      })

      if (photoFile) {
        const photoUrl = await costumeService.uploadPhoto(photoFile, costume.id)
        await costumeService.update(costume.id, { photos: [photoUrl] })
      }

      if (selectedListId) {
        await listService.addItem(selectedListId, costume.id, quantity)
        toast.success('Vestuario creado y agregado a la lista')
      } else {
        toast.success('Vestuario creado exitosamente')
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error creando vestuario:', err)
      let message = 'Error al crear vestuario'
      if (err instanceof Error) message = err.message
      else if (typeof err === 'object' && err !== null) {
        const e = err as Record<string, unknown>
        if (typeof e.message === 'string') message = e.message
        else if (typeof e.error === 'string') message = e.error
        else message = JSON.stringify(e)
      }
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo vestuario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo upload */}
          <div>
            <Label>Foto</Label>
            <div className="mt-1.5">
              {photoPreview ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-400">Subir foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              className="mt-1.5"
              placeholder="Ej: Vestido flamenco rojo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoría *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {COSTUME_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Talla *</Label>
              <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Talla" />
                </SelectTrigger>
                <SelectContent>
                  {COSTUME_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="quantity">Cantidad / Stock *</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="list">Agregar a lista (opcional)</Label>
            <Select value={selectedListId ?? 'none'} onValueChange={(v) => setSelectedListId(v === 'none' ? null : v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Seleccionar lista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              className="mt-1.5"
              placeholder="Ej: Estante 3, Armario B"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              className="mt-1.5"
              placeholder="Características especiales, detalles..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            <Plus className="w-4 h-4" />
            Crear vestuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
