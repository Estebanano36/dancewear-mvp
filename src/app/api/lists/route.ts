import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type SupabaseCookie = { name: string; value: string; options?: Record<string, unknown> }

export async function GET() {
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

  const { data, error } = await supabase.from('lists').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

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

  try {
    const authRes = await supabase.auth.getUser()
    const user = authRes?.data?.user
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Only coordinators and admins can create lists
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (!profile || !['coordinator', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const body = await request.json()
    if (!body?.name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const admin = serviceRoleKey
      ? createServerClient(supabaseUrl, serviceRoleKey, {
          cookies: {
            getAll() { return [] },
            setAll() {},
          },
        })
      : supabase

    const { data, error } = await admin.from('lists').insert({ name: body.name, description: body.description }).select().single()
    if (error) {
      // Helpful guidance for missing-table / PostgREST schema cache issues
      const msg = error?.message || String(error)
      if (/Could not find the table/i.test(msg) || /schema cache/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Tabla 'public.lists' no encontrada en el esquema del servidor Supabase. Verifica que hayas aplicado `supabase/schema.sql` al proyecto correcto o reinicia el servicio (supabase start / dashboard restart).",
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (caught) {
    console.error('Error POST /api/lists', caught)
    let message = ''
    if (caught instanceof Error) message = caught.message
    else if (typeof caught === 'object' && caught !== null && 'message' in caught) {
      const obj = caught as Record<string, unknown>
      message = typeof obj.message === 'string' ? obj.message : String(obj)
    } else {
      message = String(caught)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
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

  try {
    const authRes = await supabase.auth.getUser()
    const user = authRes?.data?.user
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (!profile || !['coordinator', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const body = await request.json()
    if (!body?.id) return NextResponse.json({ error: 'Id de lista requerido' }, { status: 400 })

    const admin = serviceRoleKey
      ? createServerClient(supabaseUrl, serviceRoleKey, {
          cookies: {
            getAll() { return [] },
            setAll() {},
          },
        })
      : supabase

    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name
    if (typeof body.description === 'string') updates.description = body.description

    const { data, error } = await admin.from('lists').update(updates).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (caught) {
    console.error('Error PATCH /api/lists', caught)
    let message = ''
    if (caught instanceof Error) message = caught.message
    else if (typeof caught === 'object' && caught !== null && 'message' in caught) {
      const obj = caught as Record<string, unknown>
      message = typeof obj.message === 'string' ? obj.message : String(obj)
    } else {
      message = String(caught)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
