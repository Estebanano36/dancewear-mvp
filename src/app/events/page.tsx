'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, MapPin, Shirt, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { eventService } from '@/lib/services/event.service'
import { useUser } from '@/hooks/use-user'
import { formatDate } from '@/utils'
import type { Event } from '@/types'
import { toast } from 'sonner'
import Link from 'next/link'

function CreateEventModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', location: '', description: '' })

  const handleSubmit = async () => {
    if (!form.name || !form.date) { toast.error('Nombre y fecha son requeridos'); return }
    try {
      setLoading(true)
      await eventService.create({ ...form, coordinator_id: user!.id })
      toast.success('Evento creado')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo evento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="event-name">Nombre *</Label>
            <Input id="event-name" className="mt-1.5" placeholder="Ej: Presentación de fin de año"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="event-date">Fecha *</Label>
            <Input id="event-date" type="date" className="mt-1.5"
              value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="event-location">Lugar</Label>
            <Input id="event-location" className="mt-1.5" placeholder="Ej: Teatro Principal"
              value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="event-desc">Descripción</Label>
            <Textarea id="event-desc" className="mt-1.5" placeholder="Detalles del evento..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading}><Plus className="w-4 h-4" />Crear evento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function EventsPage() {
  const { user } = useUser()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await eventService.getAll()
      setEvents(data)
    } catch { toast.error('Error al cargar eventos') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchEvents() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este evento?')) return
    try {
      await eventService.delete(id)
      toast.success('Evento eliminado')
      fetchEvents()
    } catch { toast.error('Error al eliminar') }
  }

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now)
  const past = events.filter(e => new Date(e.date) < now)

  const EventCard = ({ event }: { event: Event }) => {
    const isPast = new Date(event.date) < now
    const costumeCount = event.event_costumes?.length || 0
    return (
      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${isPast ? 'border-gray-100 opacity-75' : 'border-violet-100'}`}>
        <div className={`h-1.5 ${isPast ? 'bg-gray-200' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{event.name}</h3>
              {event.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{event.description}</p>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-violet-50 text-violet-700'}`}>
              {isPast ? 'Pasado' : 'Próximo'}
            </span>
          </div>
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(event.date)}
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Shirt className="w-3.5 h-3.5 text-gray-400" />
              {costumeCount} vestuario{costumeCount !== 1 ? 's' : ''} asignado{costumeCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/events/${event.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs">
                <Eye className="w-3.5 h-3.5" />Ver detalle
              </Button>
            </Link>
            {(user?.role === 'coordinator' || user?.role === 'admin') && (
              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(event.id)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Eventos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} eventos en total</p>
        </div>
        {(user?.role === 'coordinator' || user?.role === 'admin') && (
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4" />Nuevo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Sin eventos</p>
          {(user?.role === 'coordinator' || user?.role === 'admin') && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              Crear primer evento
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Próximos ({upcoming.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Pasados ({past.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateEventModal onSuccess={fetchEvents} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
