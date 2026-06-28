import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type SupabaseCookie = { name: string; value: string; options?: Record<string, unknown> }

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: SupabaseCookie[]) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })

  // Verify the user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Use service role key if available to avoid RLS caching issues
  const client = serviceRoleKey
    ? createServerClient(supabaseUrl, serviceRoleKey, {
        cookies: { getAll() { return [] }, setAll() {} },
      })
    : supabase

  // Use count queries per status — avoids the 1000-row default limit and is much more efficient
  const statuses = ['available', 'borrowed', 'washing', 'repair', 'lost', 'reserved'] as const

  const [totalRes, ...statusCounts] = await Promise.all([
    client.from('costumes').select('*', { count: 'exact', head: true }),
    ...statuses.map((s) =>
      client.from('costumes').select('*', { count: 'exact', head: true }).eq('status', s)
    ),
  ])

  if (totalRes.error) {
    return NextResponse.json({ error: totalRes.error.message }, { status: 500 })
  }

  const stats: Record<string, number> = { total: totalRes.count ?? 0 }
  statuses.forEach((s, i) => {
    stats[s] = statusCounts[i].count ?? 0
  })

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}
