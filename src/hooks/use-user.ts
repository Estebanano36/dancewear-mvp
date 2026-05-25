'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          setUser(null)
          return
        }

        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        setUser(data || null)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
      } else {
        getUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
