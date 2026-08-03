'use client'

import { useState, useEffect, use, useCallback } from 'react'
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
import { listService } from '@/lib/services/list.service'
import { eventService } from '@/lib/services/event.service'
import { authService } from '@/lib/services/auth.service'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/utils'
import type { Event, List, ListItem, Costume, User as UserType } from '@/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function QRScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  type ActionType = 'checkout' | 'return' | 'washing' | 'repair' | 'damage'

  const actions = [
    { id: 'checkout' as ActionType, label: 'Retirar', icon: ArrowLeft, iconClass: 'rotate-180', bg: 'bg-amber-50', border: 'border-amber-200', color: 'text-amber-700', activeBg: 'bg-amber-500', activeText: 'text-white' },
    { id: 'return' as ActionType, label: 'Devolver', icon: CheckCircle, iconClass: '', bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-700', activeBg: 'bg-emerald-500', activeText: 'text-white' },
    { id: 'washing' as ActionType, label: 'Lavado', icon: Droplets, iconClass: '', bg: 'bg-cyan-50', border: 'border-cyan-200', color: 'text-cyan-700', activeBg: 'bg-cyan-500', activeText: 'text-white' },
    { id: 'repair' as ActionType, label: 'Arreglo', icon: Wrench, iconClass: '', bg: 'bg-orange-50', border: 'border-orange-200', color: 'text-orange-700', activeBg: 'bg-orange-500', activeText: 'text-white' },
    { id: 'damage' as ActionType, label: 'Daño', icon: AlertTriangle, iconClass: '', bg: 'bg-red-50', border: 'border-red-200', color: 'text-red-700', activeBg: 'bg-red-500', activeText: 'text-white' },
  ]

  const [list, setList] = useState<List | null>(null)
  const [scannedCostume, setScannedCostume] = useState<Costume | null>(null)
  const [selectedListItem, setSelectedListItem] = useState<ListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; full_name: string; role: string } | null>(null)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedDancerId, setSelectedDancerId] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [dancers, setDancers] = useState<UserType[]>([])
  const [notes, setNotes] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
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

      // Try loading a list first (lists share the same QR namespace)
      const [maybeList, eventsData, usersData] = await Promise.all([
        listService.getById(id),
        eventService.getAll(),
        authService.getUsers(),
      ])

      setEvents(eventsData)
      setDancers(usersData)

      if (maybeList) {
        setList(maybeList)
      } else {
        const maybeCostume = await costumeService.getById(id)
        if (maybeCostume) {
          setScannedCostume(maybeCostume)
        }
      }
    } catch {
      toast.error('Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedCostume = selectedListItem?.costume || scannedCostume

  const handleSubmit = async () => {
    if (!selectedAction || !user || !selectedCostume) return

    if (selectedAction === 'checkout' && !selectedEventId) {
      toast.error('Selecciona un evento para registrar el retiro')
      return
    }

    if (selectedAction === 'checkout' && !selectedDancerId) {
      toast.error('Selecciona el bailarín asignado')
      return
    }

    if (selectedAction === 'damage' && !photoFile) {
      toast.error('Debes tomar una foto del daño antes de confirmarlo')
      return
    }

    if (selectedListItem && (selectedAction === 'checkout' || selectedAction === 'washing' || selectedAction === 'repair')) {
      if (selectedListItem.stock <= 0) {
        toast.error('No queda stock disponible de este vestuario en la lista')
        return
      }
    }

    try {
      setSubmitting(true)
      let photoUrl: string | undefined

      if (photoFile) {
        photoUrl = await costumeService.uploadPhoto(photoFile, selectedCostume.id)
      }

      if (selectedAction === 'damage') {
        await costumeService.reportDamage({
          costume_id: selectedCostume.id,
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
          selectedCostume.id,
          statusMap[selectedAction as keyof typeof statusMap],
          user.id,
          {
            eventId: selectedAction === 'checkout' ? selectedEventId ?? undefined : undefined,
            dancerId: selectedAction === 'checkout' ? selectedDancerId ?? undefined : undefined,
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

  if (!list && !scannedCostume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <h2 className="font-bold text-gray-800">No encontrado</h2>
          <p className="text-sm text-gray-500 mt-1">El código QR no corresponde a ninguna lista o vestuario válido</p>
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
    const performedCostume = selectedCostume
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {actionLabels[selectedAction!]}
          </h2>
          {performedCostume && (
            <p className="text-gray-500 text-sm mb-6">{performedCostume.name} · {performedCostume.code}</p>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={() => {
              loadData()
              setDone(false)
              setSelectedAction(null)
              setSelectedListItem(null)
              setNotes('')
              setPhotoFile(null)
              setSelectedEventId(null)
            }}>
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
  // If we loaded a list, show a simple list view with items
  if (list) {
    const selectedItem = selectedListItem
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center overflow-hidden p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.jpeg" alt="ArabelaEspectaculos" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-gray-900">ArabelaEspectaculos</span>
          <span className="ml-auto text-xs text-gray-400">Lista · {list.name}</span>
        </div>
        <div className="p-4 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <h2 className="font-bold text-lg">{list.name}</h2>
            {list.description && <p className="text-sm text-gray-500">{list.description}</p>}
          </div>

          {list.items && list.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {list.items.map((it) => {
                const isSelected = selectedItem?.id === it.id
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setSelectedListItem(it)
                      setSelectedAction(null)
                      setSelectedEventId(null)
                      setNotes('')
                      setPhotoFile(null)
                      setDone(false)
                    }}
                    className={`text-left bg-white rounded-xl border p-4 flex gap-3 items-center transition-shadow ${isSelected ? 'border-violet-500 shadow-sm' : 'border-gray-100 hover:shadow-sm'}`}
                  >
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
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400">No hay elementos en esta lista</div>
          )}

          {!selectedItem ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-sm text-gray-500">
              Selecciona un elemento para registrar una acción como retirar, devolver, lavado, arreglo o daño.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedItem.costume?.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedItem.costume.photos[0]} alt={selectedItem.costume.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-7 h-7 text-violet-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900 truncate">{selectedItem.costume?.name}</h2>
                    <p className="text-xs text-gray-400">{selectedItem.costume?.code} · {selectedItem.costume?.category} · {selectedItem.costume?.size}</p>
                    <div className="mt-1">
                      <StatusBadge status={selectedItem.costume?.status ?? 'available'} size="sm" />
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 text-sm text-gray-600">
                  Stock en lista: <span className="font-medium">{selectedItem.stock}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                <p className="text-sm font-semibold text-gray-600">¿Qué deseas hacer con este elemento?</p>
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const allowed = user && (user.role === 'coordinator' || user.role === 'admin')
                      ? actions
                      : actions.filter(a => ['checkout', 'return', 'damage'].includes(a.id))

                    return allowed.map((action) => {
                      const Icon = action.icon
                      const isSelected = selectedAction === action.id
                      return (
                        <button
                          key={action.id}
                          type="button"
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
                    })
                  })()}
                </div>

                {selectedAction && (
                  <div className="space-y-4">
                    {selectedAction === 'checkout' && (
                      <>
                        <div>
                          <Label>1. ¿Para qué evento? *</Label>
                          <Select value={selectedEventId ?? 'none'} onValueChange={(value) => setSelectedEventId(value === 'none' ? null : value)}>
                            <SelectTrigger className="mt-1.5">
                              <SelectValue placeholder="Selecciona un evento" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Selecciona un evento</SelectItem>
                              {events.map((event) => (
                                <SelectItem key={event.id} value={event.id}>
                                  📅 {event.name} – {formatDate(event.date)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>2. Bailarín asignado *</Label>
                          <Select value={selectedDancerId ?? 'none'} onValueChange={(value) => setSelectedDancerId(value === 'none' ? null : value)}>
                            <SelectTrigger className="mt-1.5">
                              <SelectValue placeholder="Selecciona el bailarín" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Selecciona el bailarín</SelectItem>
                              {dancers.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  👤 {d.full_name} ({d.role === 'dancer' ? 'Bailarín/a' : d.role === 'coordinator' ? 'Coordinador' : 'Admin'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
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
                      <Label htmlFor="qr-notes">Observaciones {selectedAction === 'damage' ? '(describe el daño)' : '(opcional)'}</Label>
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
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center overflow-hidden p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.jpeg" alt="ArabelaEspectaculos" className="w-full h-full object-contain" />
        </div>
        <span className="font-bold text-gray-900">ArabelaEspectaculos</span>
        {user && (
          <span className="ml-auto text-xs text-gray-400">{user.full_name}</span>
        )}
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Costume info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {selectedCostume?.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedCostume.photos[0]} alt={selectedCostume.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-7 h-7 text-violet-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 truncate">{selectedCostume?.name}</h2>
              <p className="text-xs text-gray-400">{selectedCostume?.code} · {selectedCostume?.category} · {selectedCostume?.size}</p>
              <div className="mt-1">
                {selectedCostume?.status && <StatusBadge status={selectedCostume.status} size="sm" />}
              </div>
            </div>
          </div>

          {(selectedCostume?.current_holder || selectedCostume?.current_event) && (
            <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
              {selectedCostume?.current_holder && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  Con: <span className="font-medium">{selectedCostume.current_holder.full_name}</span>
                </div>
              )}
              {selectedCostume?.current_event && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Package className="w-3.5 h-3.5 text-gray-400" />
                  Evento: <span className="font-medium">{selectedCostume.current_event.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action selector */}
        <p className="text-sm font-semibold text-gray-600 mb-3">¿Qué deseas hacer?</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(() => {
            const allowed = user && (user.role === 'coordinator' || user.role === 'admin')
              ? actions
              : actions.filter(a => ['checkout', 'return', 'damage'].includes(a.id))
            return allowed.map((action) => {
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
            })
          })()}
        </div>

        {/* Action form */}
        {selectedAction && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            {selectedAction === 'checkout' && (
              <div>
                <Label>¿Para qué evento?</Label>
                <Select value={selectedEventId ?? 'none'} onValueChange={(value) => setSelectedEventId(value === 'none' ? null : value)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecciona un evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecciona un evento</SelectItem>
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
            {selectedAction === 'checkout' && (
              <Button
                onClick={async () => {
                  if (!user || !selectedCostume) return
                  if (!selectedEventId) {
                    toast.error('Selecciona un evento para asignar el vestuario a tu cuenta')
                    return
                  }
                  try {
                    setSubmitting(true)
                    const res = await fetch('/api/costumes/assign', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ costumeId: selectedCostume.id, eventId: selectedEventId }),
                    })
                    const json = await res.json()
                    if (!res.ok) throw new Error(json?.error || 'Error al asignar')
                    toast.success('Vestuario asignado a tu cuenta')
                    setDone(true)
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Error')
                  } finally {
                    setSubmitting(false)
                  }
                }}
                size="xl"
                className="w-full mt-2"
                variant="secondary"
              >
                Asignar a mi cuenta
              </Button>
            )}
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
