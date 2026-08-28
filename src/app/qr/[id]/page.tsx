'use client'

import { useState, useEffect, use, useCallback } from 'react'
import {
  CheckCircle2, ArrowLeft, Droplets, Wrench,
  AlertTriangle, Package, Camera, Loader2
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

type ActionType = 'checkout' | 'return' | 'washing' | 'repair' | 'damage'

export default function QRScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const actions = [
    {
      id: 'checkout' as ActionType,
      label: 'Retirar',
      desc: 'Llevar a un show',
      icon: ArrowLeft,
      iconClass: 'rotate-180',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      color: 'text-amber-700',
      activeBg: 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200',
    },
    {
      id: 'return' as ActionType,
      label: 'Devolver',
      desc: 'Regresar a almacén',
      icon: CheckCircle2,
      iconClass: '',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      color: 'text-emerald-700',
      activeBg: 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-200',
    },
    {
      id: 'washing' as ActionType,
      label: 'Lavado',
      desc: 'Enviar a lavandería',
      icon: Droplets,
      iconClass: '',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      color: 'text-cyan-700',
      activeBg: 'bg-cyan-600 text-white border-cyan-700 shadow-md shadow-cyan-200',
    },
    {
      id: 'repair' as ActionType,
      label: 'Arreglo',
      desc: 'Costura / modista',
      icon: Wrench,
      iconClass: '',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      color: 'text-orange-700',
      activeBg: 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-200',
    },
    {
      id: 'damage' as ActionType,
      label: 'Daño',
      desc: 'Reportar rotura o mancha',
      icon: AlertTriangle,
      iconClass: '',
      bg: 'bg-red-50',
      border: 'border-red-200',
      color: 'text-red-700',
      activeBg: 'bg-red-600 text-white border-red-700 shadow-md shadow-red-200',
    },
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
      toast.error('Error al cargar la información del código')
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
      toast.error(err instanceof Error ? err.message : 'Error al procesar la acción')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-xs w-full">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 text-base">Cargando prenda...</h3>
          <p className="text-xs text-gray-400 mt-1">Conectando con el inventario de Arabela</p>
        </div>
      </div>
    )
  }

  if (!list && !scannedCostume) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 text-3xl">
            🔍
          </div>
          <h2 className="font-bold text-gray-900 text-lg">Código no encontrado</h2>
          <p className="text-sm text-gray-500 mt-1">El código escaneado no corresponde a ninguna lista o prenda registrada.</p>
          <Link href="/inventory" className="block mt-5">
            <Button className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl">Ir al Inventario</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    const actionLabels: Record<ActionType, { title: string; color: string; desc: string }> = {
      checkout: { title: 'Vestuario Retirado', color: 'text-amber-600', desc: 'Registrado con éxito para el show/bailarín.' },
      return: { title: 'Vestuario Devuelto', color: 'text-emerald-600', desc: 'Marcado como disponible en el almacén.' },
      washing: { title: 'Enviado a Lavado', color: 'text-cyan-600', desc: 'Registrado en estado de lavandería.' },
      repair: { title: 'Enviado a Arreglo', color: 'text-orange-600', desc: 'Registrado para reparación o costura.' },
      damage: { title: 'Daño Reportado', color: 'text-red-600', desc: 'El reporte y la foto fueron guardados con éxito.' },
    }
    const performedCostume = selectedCostume
    const actionInfo = actionLabels[selectedAction!]

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>

          <h2 className={`text-xl font-black ${actionInfo.color} mb-1`}>
            {actionInfo.title}
          </h2>
          <p className="text-xs text-gray-500 mb-4">{actionInfo.desc}</p>

          {performedCostume && (
            <div className="bg-slate-50 rounded-2xl p-3 mb-6 border border-gray-100 flex items-center gap-3 text-left">
              <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-gray-200/60 flex items-center justify-center">
                {performedCostume.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={performedCostume.photos[0]} alt={performedCostume.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">👗</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-sm truncate">{performedCostume.name}</p>
                <p className="text-xs text-gray-400 font-mono">{performedCostume.code}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Button
              onClick={() => {
                loadData()
                setDone(false)
                setSelectedAction(null)
                setSelectedListItem(null)
                setNotes('')
                setPhotoFile(null)
                setSelectedEventId(null)
                setSelectedDancerId(null)
              }}
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl"
            >
              Escanear otra prenda
            </Button>
            <Link href="/inventory">
              <Button variant="outline" className="w-full h-11 rounded-xl border-gray-200">
                Ir al inventario
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Brand Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.jpeg" alt="ArabelaEspectaculos" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-gray-900 text-sm">Arabela Espectáculos</span>
        </Link>

        {user && (
          <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">
            👤 {user.full_name}
          </span>
        )}
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        {/* If scanned entity is a List */}
        {list && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Lista de Show
              </span>
            </div>
            <h2 className="font-black text-lg text-gray-900">{list.name}</h2>
            {list.description && <p className="text-xs text-gray-500 mt-1">{list.description}</p>}

            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-2">Selecciona la prenda de la lista:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {list.items?.map((it) => {
                  const isSelected = selectedListItem?.id === it.id
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        setSelectedListItem(it)
                        setSelectedAction(null)
                        setNotes('')
                        setPhotoFile(null)
                      }}
                      className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-violet-600 bg-violet-50/50 shadow-sm'
                          : 'border-gray-200/80 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {it.costume?.photos?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.costume.photos[0]} alt={it.costume.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base">👗</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-gray-900 truncate">{it.costume?.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{it.costume?.code}</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">Stock: <span className="font-bold">{it.stock}</span></p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs">✓</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Costume Overview Card */}
        {selectedCostume && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex p-4 gap-4 items-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100 shadow-inner">
                {selectedCostume.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedCostume.photos[0]} alt={selectedCostume.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-violet-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {selectedCostume.status && <StatusBadge status={selectedCostume.status} size="sm" />}
                  {selectedCostume.size && (
                    <span className="text-[11px] font-bold bg-slate-100 text-gray-700 px-2 py-0.5 rounded-md">
                      Talla {selectedCostume.size}
                    </span>
                  )}
                </div>
                <h2 className="font-black text-gray-900 text-base leading-tight truncate">{selectedCostume.name}</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedCostume.code} · {selectedCostume.category}</p>
              </div>
            </div>

            {(selectedCostume.current_holder || selectedCostume.current_event) && (
              <div className="bg-slate-50/80 px-4 py-2.5 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs">
                {selectedCostume.current_holder && (
                  <span className="text-amber-800 font-medium">
                    👤 En poder de: <strong>{selectedCostume.current_holder.full_name}</strong>
                  </span>
                )}
                {selectedCostume.current_event && (
                  <span className="text-indigo-800 font-medium">
                    🎭 Evento: <strong>{selectedCostume.current_event.name}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Prompt and Big Touch Buttons */}
        {selectedCostume && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">
                ¿Qué deseas hacer con esta prenda?
              </h3>
              <span className="text-[11px] text-gray-400">Toca una opción</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
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
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col text-left justify-between gap-2.5 ${
                        isSelected
                          ? action.activeBg
                          : `${action.bg} ${action.color} ${action.border} hover:shadow-sm`
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={`w-5 h-5 ${action.iconClass}`} />
                        {isSelected && <span className="text-xs font-black">●</span>}
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-none">{action.label}</p>
                        <p className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                          {action.desc}
                        </p>
                      </div>
                    </button>
                  )
                })
              })()}
            </div>

            {/* Action Details Form Card */}
            {selectedAction && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {selectedAction === 'checkout' && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-bold text-gray-700">1. ¿Para qué evento? *</Label>
                      <Select
                        value={selectedEventId ?? 'none'}
                        onValueChange={(val) => setSelectedEventId(val === 'none' ? null : val)}
                      >
                        <SelectTrigger className="mt-1 h-11 rounded-xl">
                          <SelectValue placeholder="Selecciona un evento" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none">Seleccionar evento...</SelectItem>
                          {events.map((ev) => (
                            <SelectItem key={ev.id} value={ev.id}>
                              🎭 {ev.name} ({formatDate(ev.date)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-gray-700">2. Bailarín / Responsable asignado *</Label>
                      <Select
                        value={selectedDancerId ?? 'none'}
                        onValueChange={(val) => setSelectedDancerId(val === 'none' ? null : val)}
                      >
                        <SelectTrigger className="mt-1 h-11 rounded-xl">
                          <SelectValue placeholder="Selecciona el bailarín" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none">Seleccionar persona...</SelectItem>
                          {dancers.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              👤 {d.full_name} ({d.role === 'dancer' ? 'Bailarín' : 'Staff'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedAction === 'damage' && (
                  <div>
                    <Label className="text-xs font-bold text-gray-700">Nivel de gravedad del daño</Label>
                    <Select value={severity} onValueChange={(v: 'low' | 'medium' | 'high') => setSeverity(v)}>
                      <SelectTrigger className="mt-1 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="low">🟡 Daño Leve (Mancha lavable, detalle menor)</SelectItem>
                        <SelectItem value="medium">🟠 Daño Moderado (Requiere costura o ajuste)</SelectItem>
                        <SelectItem value="high">🔴 Daño Grave (Prenda rota o inutilizable)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="action-notes" className="text-xs font-bold text-gray-700">
                    {selectedAction === 'damage' ? 'Descripción del daño *' : 'Notas u observaciones (opcional)'}
                  </Label>
                  <Textarea
                    id="action-notes"
                    placeholder={
                      selectedAction === 'damage'
                        ? 'Describe brevemente qué le ocurrió a la prenda...'
                        : 'Ej. Entregado con todos los accesorios completos...'
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 rounded-xl text-sm"
                    rows={2}
                  />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="flex items-center gap-2.5 p-3 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <Camera className="w-5 h-5 text-violet-600 flex-shrink-0" />
                    <span className="text-xs text-gray-600 font-medium flex-1 truncate">
                      {photoFile ? `📸 ${photoFile.name}` : selectedAction === 'damage' ? 'Tomar foto del daño (requerido)' : 'Tomar foto de respaldo (opcional)'}
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

                {/* Submit button */}
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  className="w-full h-12 text-sm font-bold rounded-2xl bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
                >
                  {submitting ? 'Guardando registro...' : 'Confirmar Registro'}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
