'use client'

import { useState, useEffect, use } from 'react'
import {
  CheckCircle, ArrowLeft, Droplets, Wrench,
  AlertTriangle, Package, User, Camera, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { costumeService } from '@/lib/services/costume.service'
import { eventService } from '@/lib/services/event.service'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/utils'
import type { Costume, Event } from '@/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ActionType = 'checkout' | 'return' | 'washing' | 'repair' | 'damage'

const actions = [
  { id: 'checkout' as ActionType, label: 'Retirar', icon: ArrowLeft, iconClass: 'rotate-180', bg: 'bg-amber-50', border: 'border-amber-200', color: 'text-amber-700', activeBg: 'bg-amber-500', activeText: 'text-white' },
  { id: 'return' as ActionType, label: 'Devolver', icon: CheckCircle, iconClass: '', bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-700', activeBg: 'bg-emerald-500', activeText: 'text-white' },
  { id: 'washing' as ActionType, label: 'Lavado', icon: Droplets, iconClass: '', bg: 'bg-cyan-50', border: 'border-cyan-200', color: 'text-cyan-700', activeBg: 'bg-cyan-500', activeText: 'text-white' },
  { id: 'repair' as ActionType, label: 'Arreglo', icon: Wrench, iconClass: '', bg: 'bg-orange-50', border: 'border-orange-200', color: 'text-orange-700', activeBg: 'bg-orange-500', activeText: 'text-white' },
  { id: 'damage' as ActionType, label: 'Daño', icon: AlertTriangle, iconClass: '', bg: 'bg-red-50', border: 'border-red-200', color: 'text-red-700', activeBg: 'bg-red-500', activeText: 'text-white' },
]

export default function QRScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [costume, setCostume] = useState<Costume | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; full_name: string; role: string } | null>(null)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [notes, setNotes] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          router.push(`/login?redirect=/qr/${id}`)
          return
        }

        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, role')
          .eq('id', authUser.id)
          .single()

        setUser(userData)

        const [costumeData, eventsData] = await Promise.all([
          costumeService.getById(id),
          eventService.getAll(),
        ])

        setCostume(costumeData)
        setEvents(eventsData)
      } catch {
        toast.error('Error al cargar')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, router])

  const handleSubmit = async () => {
    if (!selectedAction || !user || !costume) return

    if (selectedAction === 'checkout' && !selectedEventId) {
      toast.error('Selecciona un evento para registrar el retiro')
      return
    }

    if (selectedAction === 'damage' && !photoFile) {
      toast.error('Debes tomar una foto del daño antes de confirmarlo')
      return
    }

    try {
      setSubmitting(true)
      let photoUrl: string | undefined

      if (photoFile) {
        photoUrl = await costumeService.uploadPhoto(photoFile, costume.id)
      }

      if (selectedAction === 'damage') {
        await costumeService.reportDamage({
          costume_id: costume.id,
          reported_by: user.id,
          description: notes || 'Daño reportado vía QR',
          severity,
          photo_url: photoUrl,
        })
      } else {
        const statusMap = {
          checkout: 'borrowed' as const,
          return: 'available' as const,
          washing: 'washing' as const,
          repair: 'repair' as const,
        }
        await costumeService.updateStatus(
          costume.id,
          statusMap[selectedAction as keyof typeof statusMap],
          user.id,
          {
            eventId: selectedAction === 'checkout' ? selectedEventId ?? undefined : undefined,
            notes: notes || undefined,
            photoUrl,
          }
        )
      }

      setDone(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!costume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <h2 className="font-bold text-gray-800">Vestuario no encontrado</h2>
          <p className="text-sm text-gray-500 mt-1">El código QR no corresponde a ningún vestuario</p>
          <Link href="/inventory">
            <Button className="mt-4">Ir al inventario</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    const actionLabels: Record<ActionType, string> = {
      checkout: 'Vestuario retirado',
      return: 'Vestuario devuelto',
      washing: 'Enviado a lavado',
      repair: 'Enviado a arreglo',
      damage: 'Daño reportado',
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {actionLabels[selectedAction!]}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{costume.name} · {costume.code}</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => { setDone(false); setSelectedAction(null); setNotes('') }}>
              Nueva acción
            </Button>
            <Link href="/inventory">
              <Button variant="outline" className="w-full">Ir al inventario</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <span className="text-sm">🩰</span>
        </div>
        <span className="font-bold text-gray-900">DanceWear</span>
        {user && (
          <span className="ml-auto text-xs text-gray-400">{user.full_name}</span>
        )}
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Costume info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {costume.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={costume.photos[0]} alt={costume.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-7 h-7 text-violet-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 truncate">{costume.name}</h2>
              <p className="text-xs text-gray-400">{costume.code} · {costume.category} · {costume.size}</p>
              <div className="mt-1">
                <StatusBadge status={costume.status} size="sm" />
              </div>
            </div>
          </div>

          {(costume.current_holder || costume.current_event) && (
            <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
              {costume.current_holder && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  Con: <span className="font-medium">{costume.current_holder.full_name}</span>
                </div>
              )}
              {costume.current_event && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Package className="w-3.5 h-3.5 text-gray-400" />
                  Evento: <span className="font-medium">{costume.current_event.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action selector */}
        <p className="text-sm font-semibold text-gray-600 mb-3">¿Qué deseas hacer?</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {actions.map((action) => {
            const Icon = action.icon
            const isSelected = selectedAction === action.id
            return (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? `${action.activeBg} ${action.activeText} border-transparent shadow-md scale-105`
                    : `${action.bg} ${action.color} ${action.border} hover:scale-102`
                }`}
              >
                <Icon className={`w-5 h-5 ${action.iconClass}`} />
                <span className="text-xs font-semibold">{action.label}</span>
              </button>
            )
          })}
        </div>

        {/* Action form */}
        {selectedAction && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            {selectedAction === 'checkout' && (
              <div>
                <Label>¿Para qué evento?</Label>
                <Select value={selectedEventId || ''} onValueChange={(value) => setSelectedEventId(value || null)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue>{selectedEventId ? events.find((event) => event.id === selectedEventId)?.name : 'Selecciona un evento'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Selecciona un evento</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} – {formatDate(event.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedAction === 'damage' && (
              <div>
                <Label>Severidad del daño</Label>
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
              <Label htmlFor="qr-notes">
                Observaciones {selectedAction === 'damage' ? '(describe el daño)' : '(opcional)'}
              </Label>
              <Textarea
                id="qr-notes"
                className="mt-1.5"
                placeholder={selectedAction === 'damage' ? 'Describe el daño...' : 'Notas adicionales...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 px-3 py-3 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 active:scale-95 transition-all">
                <Camera className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500 flex-1">
                  {photoFile ? photoFile.name : 'Tomar foto (opcional)'}
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

            <Button
              onClick={handleSubmit}
              loading={submitting}
              size="xl"
              className="w-full"
              variant={selectedAction === 'damage' ? 'destructive' : selectedAction === 'return' ? 'success' : 'default'}
            >
              {submitting ? 'Procesando...' : 'Confirmar acción'}
            </Button>
          </div>
        )}

        {!user && (
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-700 text-center">
            Debes <Link href="/login" className="font-bold underline">iniciar sesión</Link> para realizar acciones
          </div>
        )}
      </div>
    </div>
  )
}
