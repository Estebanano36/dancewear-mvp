import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Configuración de Supabase incompleta' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify role (only coordinators and admins can delete)
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  if (!userProfile || !['coordinator', 'admin'].includes(userProfile.role)) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const client = serviceRoleKey
    ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : supabase

  const { data: existingCostume, error: fetchError } = await client
    .from('costumes')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!existingCostume) {
    return NextResponse.json({ error: 'No se encontró el vestuario para eliminar' }, { status: 404 })
  }

  // Remove related list_items and movements first (in case FK cascade is not set)
  await client.from('list_items').delete().eq('costume_id', id)
  await client.from('costume_movements').delete().eq('costume_id', id)

  const { error: deleteError } = await client
    .from('costumes')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  revalidatePath('/inventory')
  revalidatePath('/lists')

  return NextResponse.json({ success: true }, { status: 200 })
}
