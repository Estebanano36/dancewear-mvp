import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const qrUrl = `${baseUrl.replace(/\/$/, '')}/qr/${id}`

  try {
    const svg = await QRCode.toString(qrUrl, { type: 'svg', width: 300 })
    return new NextResponse(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } })
  } catch {
    return NextResponse.json({ error: 'Error generando QR' }, { status: 500 })
  }
}
