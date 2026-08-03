'use client'

import { useState, useEffect, use, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, AlertTriangle, RotateCcw,
  Droplets, Wrench, Package, User, Calendar, MapPin,
  Clock, Camera, CheckCircle, Trash2, Pencil, X, Check,
  ImagePlus, ChevronLeft, ChevronRight, FolderPlus, Folder, FolderX, Maximize2
} from 'lucide-react'
import { ImageZoom } from '@/components/image-zoom'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { costumeService } from '@/lib/services/costume.service'
import { eventService } from '@/lib/services/event.service'
import { authService } from '@/lib/services/auth.service'
import { useUser } from '@/hooks/use-user'
import { formatDateTime, formatDate } from '@/utils'
import type { Costume, CostumeMovement, Event, User as UserType } from '@/types'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddToListModal } from '@/components/lists/add-to-list-modal'

interface ActionModalProps {
  costume: Costume
  action: 'checkout' | 'return' | 'washing' | 'repair' | 'damage' | 'lost'
  userId: string
  onSuccess: () => void
  onClose: () => void
}

function ActionModal({ costume, action, userId, onSuccess, onClose }: ActionModalProps) {
  const [notes, setNotes] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // Checkout specific states
  const [events, setEvents] = useState<Event[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [selectedDancerId, setSelectedDancerId] = useState<string>('')
  const [fetchingOptions, setFetchingOptions] = useState(false)

  const titles = {
    checkout: 'Retirar vestuario',
    return: 'Devolver vestuario',
    washing: 'Enviar a lavado',
    repair: 'Enviar a arreglo',
    damage: 'Reportar daño',
    lost: 'Marcar como perdido',
  }

  useEffect(() => {
    if (action === 'checkout') {
      const loadOptions = async () => {
        try {
          setFetchingOptions(true)
          const [evList, userList] = await Promise.all([
            eventService.getAll(),
            authService.getUsers(),
          ])
          setEvents(evList)
          setUsers(userList)
          if (evList.length > 0) {
            setSelectedEventId(evList[0].id)
          }
        } catch {
          toast.error('Error al cargar eventos y usuarios')
        } finally {
          setFetchingOptions(false)
        }
      }
      loadOptions()
    }
  }, [action])

  const handleSubmit = async () => {
    if (action === 'checkout') {
      if (!selectedEventId) {
        toast.error('Selecciona el evento al que asignas el retiro')
        return
      }
      if (!selectedDancerId) {
        toast.error('Selecciona el bailarín al que entregas el vestuario')
        return
      }
    }

    try {
      setLoading(true)
      let photoUrl: string | undefined

      if (photoFile) {
        photoUrl = await costumeService.uploadPhoto(photoFile, costume.id)
      }

      if (action === 'damage') {
        await costumeService.reportDamage({
          costume_id: costume.id,
          reported_by: userId,
          description: notes,
          severity,
          photo_url: photoUrl,
        })
        toast.success('Daño reportado')
      } else {
        const statusMap = {
          checkout: 'borrowed' as const,
          return: 'available' as const,
          washing: 'washing' as const,
          repair: 'repair' as const,
          lost: 'lost' as const,
        }
        await costumeService.updateStatus(
          costume.id,
          statusMap[action as keyof typeof statusMap],
          userId,
          {
            eventId: action === 'checkout' ? selectedEventId : undefined,
            dancerId: action === 'checkout' ? selectedDancerId : undefined,
            notes,
            photoUrl,
          }
        )
        toast.success(action === 'checkout' ? 'Vestuario retirado y asignado al evento' : 'Estado actualizado')
      }

      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
            <Package className="w-4 h-4 text-gray-400" />
            <div>
              <p className="font-medium text-sm text-gray-800">{costume.name}</p>
              <p className="text-xs text-gray-400">{costume.code}</p>
            </div>
          </div>

          {action === 'checkout' && (
            <>
              <div>
                <Label htmlFor="checkout-event">1. Evento al que va la prenda *</Label>
                {fetchingOptions ? (
                  <p className="text-xs text-gray-400 mt-1">Cargando eventos...</p>
                ) : events.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700 mt-1.5 border border-amber-200">
                    No hay eventos creados. Crea un evento en la pestaña Eventos primero.
                  </div>
                ) : (
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger id="checkout-event" className="mt-1.5">
                      <SelectValue placeholder="Selecciona un evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          📅 {e.name} ({formatDate(e.date)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="checkout-dancer">2. Bailarín a asignar *</Label>
                {fetchingOptions ? (
                  <p className="text-xs text-gray-400 mt-1">Cargando personas...</p>
                ) : (
                  <Select value={selectedDancerId} onValueChange={setSelectedDancerId}>
                    <SelectTrigger id="checkout-dancer" className="mt-1.5">
                      <SelectValue placeholder="Selecciona el bailarín o usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          👤 {u.full_name} ({u.role === 'dancer' ? 'Bailarín/a' : u.role === 'coordinator' ? 'Coordinador' : 'Admin'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          )}

          {action === 'damage' && (
            <div>
              <Label>Severidad</Label>
              <Select value={severity} onValueChange={(v: 'low' | 'medium' | 'high') => setSeverity(v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟡 Leve</SelectItem>
                  <SelectItem value="medium">🟠 Moderado</SelectItem>
                  <SelectItem value="high">🔴 Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Observaciones {action === 'damage' ? '*' : '(opcional)'}</Label>
            <Textarea
              id="notes"
              className="mt-1.5"
              placeholder={action === 'damage' ? 'Describe el daño...' : 'Notas adicionales...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label>Foto {action === 'damage' ? '(recomendada)' : '(opcional)'}</Label>
            <label className="mt-1.5 flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Camera className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {photoFile ? photoFile.name : 'Tomar o subir foto'}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            variant={action === 'lost' || action === 'damage' ? 'destructive' : 'default'}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const movementIcons: Record<string, React.ReactNode> = {
  checkout: <ArrowLeft className="w-3.5 h-3.5 rotate-180" />,
  return: <CheckCircle className="w-3.5 h-3.5" />,
  send_wash: <Droplets className="w-3.5 h-3.5" />,
  send_repair: <Wrench className="w-3.5 h-3.5" />,
  damage_report: <AlertTriangle className="w-3.5 h-3.5" />,
  mark_lost: <AlertTriangle className="w-3.5 h-3.5" />,
  status_change: <RotateCcw className="w-3.5 h-3.5" />,
}

const movementLabels: Record<string, string> = {
  checkout: 'Retirado por',
  return: 'Devuelto por',
  send_wash: 'Enviado a lavado por',
  send_repair: 'Enviado a arreglo por',
  damage_report: 'Daño reportado por',
  mark_lost: 'Marcado como perdido por',
  status_change: 'Estado cambiado por',
}

export default function CostumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useUser()
  const [costume, setCostume] = useState<Costume | null>(null)
  const [history, setHistory] = useState<CostumeMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAction, setActiveAction] = useState<ActionModalProps['action'] | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [showAddToList, setShowAddToList] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [costumeData, historyData] = await Promise.all([
        costumeService.getById(id),
        costumeService.getHistory(id),
      ])
      setCostume(costumeData)
      setHistory(historyData)
    } catch {
      toast.error('Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveEdit = async (field: 'name' | 'description') => {
    if (!costume) return
    const value = field === 'name' ? editName.trim() : editDesc.trim()
    if (field === 'name' && !value) {
      toast.error('El nombre no puede estar vacío')
      return
    }
    try {
      const updated = await costumeService.update(costume.id, { [field]: value })
      setCostume(updated)
      if (field === 'name') setEditingName(false)
      else setEditingDesc(false)
      toast.success('Guardado')
    } catch {
      toast.error('Error al guardar')
    }
  }

  const startEditName = () => {
    if (!costume) return
    setEditName(costume.name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  const startEditDesc = () => {
    if (!costume) return
    setEditDesc(costume.description || '')
    setEditingDesc(true)
    setTimeout(() => descInputRef.current?.focus(), 50)
  }

  const handleDelete = async () => {
    if (!costume) return
    if (!window.confirm('¿Estás seguro de que deseas eliminar este vestuario de forma permanente? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setLoading(true)
      await costumeService.delete(costume.id)
      toast.success('Vestuario eliminado exitosamente')
      router.push('/inventory')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPhoto = async (file: File) => {
    if (!costume) return
    try {
      setUploadingPhoto(true)
      const updated = await costumeService.addPhoto(costume.id, file)
      setCostume(updated)
      setPhotoIndex((updated.photos?.length || 1) - 1)
      toast.success('Foto añadida correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async (photoUrl: string) => {
    if (!costume) return
    if (!window.confirm('¿Eliminar esta foto?')) return
    try {
      const updated = await costumeService.removePhoto(costume.id, photoUrl)
      setCostume(updated)
      setPhotoIndex(0)
      toast.success('Foto eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la foto')
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!costume) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Vestuario no encontrado</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">Volver</Button>
      </div>
    )
  }

  const canCheckout = costume.status === 'available'
  const canReturn = costume.status === 'borrowed' || costume.status === 'reserved'
  const canMarkAvailable = (user?.role === 'coordinator' || user?.role === 'admin') && (costume.status === 'washing' || costume.status === 'repair' || costume.status === 'lost')

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {/* Editable name */}
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInputRef}
                className="text-xl font-bold text-gray-900 leading-tight border-b-2 border-violet-400 outline-none bg-transparent w-full"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit('name'); if (e.key === 'Escape') setEditingName(false) }}
              />
              <button onClick={() => handleSaveEdit('name')} className="text-green-600 hover:text-green-700 p-1 flex-shrink-0"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingName(false)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">{costume.name}</h1>
              {(user?.role === 'coordinator' || user?.role === 'admin') && (
                <button onClick={startEditName} className="text-gray-300 hover:text-violet-500 p-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
              )}
            </div>
          )}
          <p className="text-sm text-gray-400 font-mono mt-0.5">{costume.code}</p>
        </div>
        <StatusBadge status={costume.status} />
      </div>

      {/* Grid: 2 columns on desktop (Info/Actions/History on Left, Photo Gallery on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (lg:col-span-7): Info, Actions, History */}
        <div className="lg:col-span-7 space-y-4 order-2 lg:order-1">
          
          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Categoría</p>
              <p className="font-semibold text-gray-800">{costume.category}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Talla</p>
              <p className="font-semibold text-gray-800">{costume.size}</p>
            </div>
            {costume.location && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Ubicación</p>
                  <p className="text-sm font-medium text-gray-800">{costume.location}</p>
                </div>
              </div>
            )}
            {costume.current_holder && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Con</p>
                  <p className="text-sm font-medium text-gray-800">{costume.current_holder.full_name}</p>
                </div>
              </div>
            )}
            {costume.current_event && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-2 col-span-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Evento</p>
                  <p className="text-sm font-medium text-gray-800">{costume.current_event.name}</p>
                  {costume.current_event.date && (
                    <p className="text-xs text-gray-400">{formatDate(costume.current_event.date)}</p>
                  )}
                </div>
              </div>
            )}
            {/* Lista Asignada */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-2 col-span-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-4 h-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Lista asignada</p>
                  {costume.list_items && costume.list_items.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {costume.list_items.map((item) => (
                        item.list ? (
                          <Link
                            key={item.id}
                            href={`/lists/${item.list.id}`}
                            className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 text-xs font-semibold px-2 py-0.5 rounded-md transition-colors"
                          >
                            <span className="truncate">{item.list.name}</span>
                          </Link>
                        ) : null
                      ))}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 border border-gray-200 text-xs font-medium px-2 py-0.5 rounded-md mt-0.5">
                      <FolderX className="w-3 h-3 text-gray-400" />
                      Sin asignar
                    </span>
                  )}
                </div>
              </div>
              {(user?.role === 'coordinator' || user?.role === 'admin') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex-shrink-0"
                  onClick={() => setShowAddToList(true)}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  {costume.list_items && costume.list_items.length > 0 ? 'Gestionar listas' : 'Asignar a lista'}
                </Button>
              )}
            </div>
          </div>

          {/* Description card */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Descripción</p>
              {(user?.role === 'coordinator' || user?.role === 'admin') && !editingDesc && (
                <button
                  onClick={startEditDesc}
                  className="text-gray-400 hover:text-violet-600 transition-colors p-1"
                  title="Editar descripción"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea
                  className="text-sm text-gray-700 w-full"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={6}
                />
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditingDesc(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={() => handleSaveEdit('description')}>
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {costume.description || 'Sin descripción'}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {canCheckout && (
              <Button onClick={() => setActiveAction('checkout')} className="col-span-2">
                <ArrowLeft className="w-4 h-4 rotate-180" />
                Retirar vestuario
              </Button>
            )}
            {canReturn && (
              <Button onClick={() => setActiveAction('return')} variant="success" className="col-span-2">
                <CheckCircle className="w-4 h-4" />
                Devolver vestuario
              </Button>
            )}
            {canMarkAvailable && (
              <Button onClick={() => setActiveAction('return')} variant="success" className="col-span-2">
                <CheckCircle className="w-4 h-4" />
                Marcar como disponible
              </Button>
            )}
            <Button variant="outline" onClick={() => setActiveAction('damage')}>
              <AlertTriangle className="w-4 h-4" />
              Reportar daño
            </Button>
            {(user?.role === 'coordinator' || user?.role === 'admin') && (
              <>
                <Button onClick={() => setShowAddToList(true)} className="col-span-2 bg-violet-600 hover:bg-violet-700">
                  <FolderPlus className="w-4 h-4" />
                  Añadir a lista
                </Button>
                <Button variant="outline" onClick={() => setActiveAction('washing')}>
                  <Droplets className="w-4 h-4" />
                  Enviar lavado
                </Button>
                <Button variant="outline" onClick={() => setActiveAction('repair')}>
                  <Wrench className="w-4 h-4" />
                  Enviar arreglo
                </Button>
                <Button variant="outline" onClick={() => setActiveAction('lost')} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <AlertTriangle className="w-4 h-4" />
                  Marcar perdido
                </Button>
                <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 col-span-2">
                  <Trash2 className="w-4 h-4" />
                  Eliminar vestuario
                </Button>
              </>
            )}
          </div>

          {/* History timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm pt-2">
            <div className="p-5 border-b border-gray-50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Historial</h2>
              <span className="ml-auto text-xs text-gray-400">{history.length} movimientos</span>
            </div>
            <div className="p-4">
              {history.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Sin historial aún</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {history.map((movement) => (
                      <div key={movement.id} className="flex items-start gap-4 pl-10 relative">
                        <div className={`absolute left-2 w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-0.5 ${
                          movement.action === 'damage_report' || movement.action === 'mark_lost'
                            ? 'bg-red-400'
                            : movement.action === 'return'
                            ? 'bg-emerald-400'
                            : movement.action === 'checkout'
                            ? 'bg-amber-400'
                            : 'bg-gray-300'
                        }`}>
                          {movementIcons[movement.action] || <RotateCcw className="w-2.5 h-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">
                            <span className="text-gray-500">{movementLabels[movement.action] || movement.action}</span>
                            {' '}
                            <span className="font-medium">{(movement.user as { full_name: string })?.full_name}</span>
                          </p>
                          {movement.notes && (
                            <p className="text-xs text-gray-500 mt-0.5">{movement.notes}</p>
                          )}
                          {movement.photo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={movement.photo_url}
                              alt="Foto"
                              className="mt-2 rounded-lg max-h-32 object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(movement.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-5): High quality photo display without cropping */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-3 order-1 lg:order-2">
          <div className="bg-slate-900 rounded-2xl h-[480px] lg:h-[540px] overflow-hidden relative group shadow-md flex items-center justify-center border border-slate-800">
            {costume.photos && costume.photos.length > 0 ? (
              <>
                {/* Ambient background blur */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={costume.photos[photoIndex]}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 pointer-events-none scale-125"
                  decoding="async"
                  loading="eager"
                />
                
                {/* Main complete non-cropped vertical photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={costume.photos[photoIndex]}
                  alt={`${costume.name} - foto ${photoIndex + 1}`}
                  onClick={() => setZoomOpen(true)}
                  className="relative z-10 max-h-full max-w-full object-contain cursor-pointer transition-transform duration-200 hover:scale-[1.01] p-2"
                  title="Clic para ampliar pantalla completa"
                  fetchPriority="high"
                  decoding="async"
                />

                {/* Zoom button badge */}
                <button
                  onClick={() => setZoomOpen(true)}
                  className="absolute top-3 left-3 z-20 bg-black/60 hover:bg-black/80 text-white px-2.5 py-1.5 rounded-lg backdrop-blur-md transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
                  title="Ampliar pantalla completa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Ampliar</span>
                </button>

                {/* Navigation arrows if multiple photos */}
                {costume.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIndex((i) => (i - 1 + costume.photos!.length) % costume.photos!.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPhotoIndex((i) => (i + 1) % costume.photos!.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    {/* Photo counter */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                      {photoIndex + 1} / {costume.photos.length}
                    </div>
                  </>
                )}

                {/* Delete current photo button */}
                {(user?.role === 'coordinator' || user?.role === 'admin') && (
                  <button
                    onClick={() => handleRemovePhoto(costume.photos![photoIndex])}
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                    title="Eliminar esta foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <span className="text-6xl mb-2">👗</span>
                <p className="text-sm font-medium">Sin foto asignada</p>
              </div>
            )}

            {/* Upload overlay button */}
            {(user?.role === 'coordinator' || user?.role === 'admin') && (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleAddPhoto(file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-white/95 hover:bg-white text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md transition-all hover:shadow-lg disabled:opacity-60"
                >
                  {uploadingPhoto ? (
                    <span className="animate-spin rounded-full border-2 border-violet-400 border-t-transparent w-3.5 h-3.5" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" />
                  )}
                  {uploadingPhoto ? 'Subiendo...' : costume.photos && costume.photos.length > 0 ? 'Añadir foto' : 'Subir foto'}
                </button>
              </>
            )}
          </div>

          {/* Photo thumbnails strip */}
          {costume.photos && costume.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {costume.photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setPhotoIndex(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === photoIndex ? 'border-violet-500 shadow-md ring-2 ring-violet-200' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {activeAction && user && (
        <ActionModal
          costume={costume}
          action={activeAction}
          userId={user.id}
          onSuccess={fetchData}
          onClose={() => setActiveAction(null)}
        />
      )}

      {showAddToList && (
        <AddToListModal
          costumeId={costume.id}
          costumeName={costume.name}
          onClose={() => { setShowAddToList(false); fetchData() }}
        />
      )}

      {zoomOpen && costume.photos?.[photoIndex] && (
        <ImageZoom
          src={costume.photos[photoIndex]}
          alt={costume.name}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  )
}
