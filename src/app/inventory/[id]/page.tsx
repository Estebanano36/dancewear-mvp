'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, AlertTriangle, RotateCcw,
  Droplets, Wrench, Package, User, Calendar, MapPin,
  Clock, Camera, CheckCircle, Trash2, Pencil, X, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { costumeService } from '@/lib/services/costume.service'
import { useUser } from '@/hooks/use-user'
import { formatDateTime, formatDate } from '@/utils'
import type { Costume, CostumeMovement } from '@/types'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

  const titles = {
    checkout: 'Retirar vestuario',
    return: 'Devolver vestuario',
    washing: 'Enviar a lavado',
    repair: 'Enviar a arreglo',
    damage: 'Reportar daño',
    lost: 'Marcar como perdido',
  }

  const handleSubmit = async () => {
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
        await costumeService.updateStatus(costume.id, statusMap[action as keyof typeof statusMap], userId, {
          notes,
          photoUrl,
        })
        toast.success('Estado actualizado')
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
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
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
  }

  useEffect(() => { fetchData() }, [id])

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
    <div className="max-w-2xl">
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
          {/* Editable description */}
          {editingDesc ? (
            <div className="flex items-center gap-1 mt-0.5">
              <input
                ref={descInputRef}
                className="text-sm text-gray-400 border-b border-violet-300 outline-none bg-transparent w-full"
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
              <p className="text-sm text-gray-400 truncate">{costume.description || costume.code}</p>
              {(user?.role === 'coordinator' || user?.role === 'admin') && (
                <button onClick={startEditDesc} className="text-gray-300 hover:text-violet-500 p-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3 h-3" /></button>
              )}
            </div>
          )}
        </div>
        <StatusBadge status={costume.status} />
      </div>

      {/* Photo */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl h-52 mb-4 overflow-hidden relative">
        {costume.photos?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={costume.photos[0]} alt={costume.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-6xl">👗</span>
            <p className="text-xs text-violet-300 mt-2">Sin foto</p>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
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
      </div>

      {costume.description && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1">Descripción</p>
          <p className="text-sm text-gray-700">{costume.description}</p>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-6">
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
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
                {history.map((movement, i) => (
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

      {activeAction && user && (
        <ActionModal
          costume={costume}
          action={activeAction}
          userId={user.id}
          onSuccess={fetchData}
          onClose={() => setActiveAction(null)}
        />
      )}
    </div>
  )
}
