import { createClient } from '@/lib/supabase/client'
import type { Costume, CostumeMovement, CostumeStatus, DamageReport } from '@/types'
import { generateCostumeCode } from '@/utils'

export const costumeService = {
  async getAll(filters?: {
    status?: CostumeStatus
    category?: string
    search?: string
  }): Promise<Costume[]> {
    const supabase = createClient()
    let query = supabase
      .from('costumes')
      .select(`
        *,
        current_holder:users!costumes_current_holder_id_fkey(id, full_name, email),
        current_event:events!costumes_current_event_id_fkey(id, name, date)
      `)
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,category.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Costume | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('costumes')
      .select(`
        *,
        current_holder:users!costumes_current_holder_id_fkey(id, full_name, email),
        current_event:events!costumes_current_event_id_fkey(id, name, date)
      `)
      .eq('id', id)
      .single()

    if (error) return null
    return data
  },

  async create(costume: Omit<Costume, 'id' | 'created_at' | 'updated_at' | 'code'>): Promise<Costume> {
    const supabase = createClient()
    const code = generateCostumeCode()
    const { data, error } = await supabase
      .from('costumes')
      .insert({ ...costume, code, status: 'available' })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Costume>): Promise<Costume> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('costumes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateStatus(
    costumeId: string,
    status: CostumeStatus,
    userId: string,
    options?: {
      eventId?: string
      notes?: string
      photoUrl?: string
      action?: string
    }
  ): Promise<void> {
    const supabase = createClient()

    // Determine action based on status
    const actionMap: Record<CostumeStatus, string> = {
      available: 'return',
      borrowed: 'checkout',
      reserved: 'status_change',
      washing: 'send_wash',
      repair: 'send_repair',
      lost: 'mark_lost',
    }

    const updates: Partial<Costume> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'borrowed') {
      updates.current_holder_id = userId
      if (options?.eventId) updates.current_event_id = options.eventId
    } else if (status === 'available') {
      updates.current_holder_id = undefined
      updates.current_event_id = undefined
    }

    // Update costume
    const { error: costumeError } = await supabase
      .from('costumes')
      .update(updates)
      .eq('id', costumeId)

    if (costumeError) throw costumeError

    // Record movement
    const { error: movementError } = await supabase
      .from('costume_movements')
      .insert({
        costume_id: costumeId,
        user_id: userId,
        event_id: options?.eventId,
        action: options?.action || actionMap[status],
        notes: options?.notes,
        photo_url: options?.photoUrl,
      })

    if (movementError) throw movementError
  },

  async getHistory(costumeId: string): Promise<CostumeMovement[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('costume_movements')
      .select(`
        *,
        user:users!costume_movements_user_id_fkey(id, full_name, email),
        event:events!costume_movements_event_id_fkey(id, name)
      `)
      .eq('costume_id', costumeId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async reportDamage(report: {
    costume_id: string
    reported_by: string
    description: string
    severity: 'low' | 'medium' | 'high'
    photo_url?: string
    movement_id?: string
  }): Promise<DamageReport> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('damage_reports')
      .insert(report)
      .select()
      .single()

    if (error) throw error

    // Record movement
    await supabase.from('costume_movements').insert({
      costume_id: report.costume_id,
      user_id: report.reported_by,
      action: 'damage_report',
      notes: report.description,
      photo_url: report.photo_url,
    })

    return data
  },

  async uploadPhoto(file: File, costumeId: string): Promise<string> {
    const supabase = createClient()
    const filename = `costumes/${costumeId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('costume-photos')
      .upload(filename, file)

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('costume-photos')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  },

  async getDashboardStats() {
    const supabase = createClient()
    const { data: costumes, error } = await supabase
      .from('costumes')
      .select('id, status, name, updated_at')

    if (error) throw error

    const stats = {
      total: costumes?.length || 0,
      available: costumes?.filter((c) => c.status === 'available').length || 0,
      borrowed: costumes?.filter((c) => c.status === 'borrowed').length || 0,
      washing: costumes?.filter((c) => c.status === 'washing').length || 0,
      repair: costumes?.filter((c) => c.status === 'repair').length || 0,
      lost: costumes?.filter((c) => c.status === 'lost').length || 0,
      reserved: costumes?.filter((c) => c.status === 'reserved').length || 0,
    }

    return stats
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('costumes')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message || 'Error al eliminar el vestuario')
    }
  },
}
