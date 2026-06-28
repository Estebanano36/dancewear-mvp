import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type SupabaseCookie = { name: string; value: string; options?: Record<string, unknown> }

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: SupabaseCookie[]) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
    }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verify role
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (!profile || !['coordinator', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const body = await request.json()
  if (!body?.listId || !body?.costumeId) return NextResponse.json({ error: 'listId y costumeId requeridos' }, { status: 400 })

  const admin = serviceRoleKey
    ? createServerClient(supabaseUrl, serviceRoleKey, {
        cookies: { getAll() { return [] }, setAll() {} },
      })
    : supabase

  const { data, error } = await admin
    .from('list_items')
    .insert({ list_id: body.listId, costume_id: body.costumeId, stock: body.stock ?? 1 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: SupabaseCookie[]) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
    }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (!profile || !['coordinator', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const body = await request.json()
  if (!body?.itemId || typeof body.stock !== 'number') return NextResponse.json({ error: 'itemId y stock requeridos' }, { status: 400 })

  const admin = createServerClient(supabaseUrl, serviceRoleKey || supabaseKey, { cookies: { getAll() { return [] }, setAll() {} } })
  const { data, error } = await admin.from('list_items').update({ stock: body.stock }).eq('id', body.itemId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: SupabaseCookie[]) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
    }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (!profile || !['coordinator', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const body = await request.json()
  if (!body?.itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 })

  const admin = createServerClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey, { cookies: { getAll() { return [] }, setAll() {} } })
  const { error } = await admin.from('list_items').delete().eq('id', body.itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
