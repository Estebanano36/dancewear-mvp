import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { costumeId, eventId } = body || {}

  if (!costumeId) return NextResponse.json({ error: 'costumeId requerido' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(_c) {},
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Fetch costume
  const { data: costume, error: costumeError } = await supabase
    .from('costumes')
    .select('id, status')
    .eq('id', costumeId)
    .maybeSingle()

  if (costumeError) return NextResponse.json({ error: costumeError.message }, { status: 500 })
  if (!costume) return NextResponse.json({ error: 'Vestuario no encontrado' }, { status: 404 })

  // Only allow assigning if available or reserved
  if (!['available', 'reserved'].includes(costume.status)) {
    return NextResponse.json({ error: 'Vestuario no disponible para asignación' }, { status: 400 })
  }

  // Update costume and insert movement
  const { error: updateError } = await supabase
    .from('costumes')
    .update({ status: 'borrowed', current_holder_id: user.id, current_event_id: eventId || null })
    .eq('id', costumeId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: movementError } = await supabase
    .from('costume_movements')
    .insert({ costume_id: costumeId, user_id: user.id, event_id: eventId || null, action: 'assign' })

  if (movementError) return NextResponse.json({ error: movementError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
