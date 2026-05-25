import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export const authService = {
  async signIn(email: string, password: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signUp(email: string, password: string, fullName: string, role: 'coordinator' | 'dancer' = 'dancer') {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser(): Promise<User | null> {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error) return null
    return data
  },

  async getUsers(): Promise<User[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('full_name')

    if (error) throw error
    return data || []
  },
}
