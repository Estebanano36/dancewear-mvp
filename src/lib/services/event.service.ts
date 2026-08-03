import { createClient } from '@/lib/supabase/client'
import type { Event, EventCostume } from '@/types'
import { costumeService } from '@/lib/services/costume.service'

export const eventService = {
  async getAll(): Promise<Event[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        coordinator:users!events_coordinator_id_fkey(id, full_name),
        event_costumes(
          id,
          costume:costumes(id, name, code, status),
          dancer:users!event_costumes_dancer_id_fkey(id, full_name)
        )
      `)
      .order('date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Event | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        coordinator:users!events_coordinator_id_fkey(id, full_name, email),
        event_costumes(
          id,
          notes,
          costume:costumes(id, name, code, status, category, size),
          dancer:users!event_costumes_dancer_id_fkey(id, full_name, email)
        )
      `)
      .eq('id', id)
      .single()

    if (error) return null
    return data
  },

  async create(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Event>): Promise<Event> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
  },

  async assignCostume(
    eventId: string,
    costumeId: string,
    dancerId?: string,
    notes?: string,
    status: 'borrowed' | 'reserved' = 'reserved',
    userId?: string
  ): Promise<EventCostume> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('event_costumes')
      .upsert(
        { event_id: eventId, costume_id: costumeId, dancer_id: dancerId || null, notes },
        { onConflict: 'event_id,costume_id' }
      )
      .select()
      .single()

    if (error) throw error

    // Update costume status
    await costumeService.updateStatus(
      costumeId,
      status,
      userId || dancerId || 'system',
      {
        eventId,
        dancerId,
        notes,
      }
    )

    return data
  },

  async removeCostume(eventCostumeId: string, costumeId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('event_costumes')
      .delete()
      .eq('id', eventCostumeId)

    if (error) throw error

    await supabase
      .from('costumes')
      .update({ status: 'available', current_event_id: null })
      .eq('id', costumeId)
  },
}
