'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Calendar, MapPin, Shirt, User, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { eventService } from '@/lib/services/event.service'
import { costumeService } from '@/lib/services/costume.service'
import { authService } from '@/lib/services/auth.service'
import { useUser } from '@/hooks/use-user'
import { formatDate } from '@/utils'
import type { Event, Costume, User as UserType } from '@/types'
import { toast } from 'sonner'
import Link from 'next/link'

function AssignCostumeModal({
  eventId,
  onSuccess,
  onClose,
}: {
  eventId: string
  onSuccess: () => void
  onClose: () => void
}) {
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [search, setSearch] = useState('')
  const [selectedCostume, setSelectedCostume] = useState('')
  const [selectedDancer, setSelectedDancer] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [c, u] = await Promise.all([
          costumeService.getAll({ status: 'available' }),
          authService.getUsers(),
        ])
        setCostumes(c)
        setUsers(u.filter((u) => u.role === 'dancer'))
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [])

  const filtered = costumes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleAssign = async () => {
    if (!selectedCostume) { toast.error('Selecciona un vestuario'); return }
    try {
      setLoading(true)
      await eventService.assignCostume(eventId, selectedCostume, selectedDancer || undefined)
      toast.success('Vestuario asignado')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar vestuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Buscar vestuario disponible</Label>
            <Input
              className="mt-1.5"
              placeholder="Nombre o código..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {fetching ? (
              <div className="p-4 text-center text-sm text-gray-400">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">Sin vestuarios disponibles</div>
            ) : (
              filtered.map((costume) => (
                <button
                  key={costume.id}
                  onClick={() => setSelectedCostume(costume.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    selectedCostume === costume.id ? 'bg-violet-50' : ''
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    selectedCostume === costume.id ? 'border-violet-600 bg-violet-600' : 'border-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{costume.name}</p>
                    <p className="text-xs text-gray-400">{costume.code} · {costume.category} · {costume.size}</p>
                  </div>
                  <StatusBadge status={costume.status} size="sm" />
                </button>
              ))
            )}
          </div>

          <div>
            <Label>Asignar a bailarín (opcional)</Label>
            <Select value={selectedDancer || 'none'} onValueChange={(v) => setSelectedDancer(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleAssign} loading={loading} disabled={!selectedCostume}>
            <Plus className="w-4 h-4" />Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { user } = useUser()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAssign, setShowAssign] = useState(false)

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const data = await eventService.getById(id)
      setEvent(data)
    } catch {
      toast.error('Error al cargar el evento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvent() }, [id])

  const handleRemoveCostume = async (eventCostumeId: string, costumeId: string) => {
    if (!confirm('¿Quitar este vestuario del evento?')) return
    try {
      await eventService.removeCostume(eventCostumeId, costumeId)
      toast.success('Vestuario removido')
      fetchEvent()
    } catch {
      toast.error('Error al remover')
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Evento no encontrado</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">Volver</Button>
      </div>
    )
  }

  const isPast = new Date(event.date) < new Date()

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{event.name}</h1>
          {event.description && (
            <p className="text-sm text-gray-400 mt-0.5">{event.description}</p>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          isPast ? 'bg-gray-100 text-gray-500' : 'bg-violet-50 text-violet-700'
        }`}>
          {isPast ? 'Pasado' : 'Próximo'}
        </span>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-2">
          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Fecha</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatDate(event.date)}</p>
          </div>
        </div>
        {event.location && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Lugar</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{event.location}</p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-2">
          <Shirt className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Vestuarios</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{event.event_costumes?.length || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-2">
          <User className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Coordinador</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">
              {event.coordinator?.full_name || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Costumes section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Vestuarios asignados</h2>
          {(user?.role === 'coordinator' || user?.role === 'admin') && !isPast && (
            <Button size="sm" onClick={() => setShowAssign(true)}>
              <Plus className="w-3.5 h-3.5" />Asignar
            </Button>
          )}
        </div>

        {!event.event_costumes || event.event_costumes.length === 0 ? (
          <div className="p-8 text-center">
            <Shirt className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">Sin vestuarios asignados</p>
            {(user?.role === 'coordinator' || user?.role === 'admin') && !isPast && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAssign(true)}>
                Asignar primer vestuario
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {event.event_costumes.map((ec) => (
              <div key={ec.id} className="p-4 flex items-center gap-3 hover:bg-gray-50/50">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Shirt className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {(ec.costume as { name: string })?.name || 'Vestuario'}
                    </p>
                    <StatusBadge status={(ec.costume as { status: string })?.status as never} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-gray-400">
                      {(ec.costume as { code: string })?.code}
                    </p>
                    {ec.dancer && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {(ec.dancer as { full_name: string })?.full_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/inventory/${(ec.costume as { id: string })?.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs">Ver</Button>
                  </Link>
                  {(user?.role === 'coordinator' || user?.role === 'admin') && !isPast && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveCostume(ec.id, (ec.costume as { id: string })?.id)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAssign && (
        <AssignCostumeModal
          eventId={event.id}
          onSuccess={fetchEvent}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  )
}
