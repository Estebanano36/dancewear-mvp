'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shirt, CheckCircle, ArrowUpRight, Sparkles,
  Wrench, AlertTriangle, Calendar, Clock,
  TrendingUp, RefreshCw
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { costumeService } from '@/lib/services/costume.service'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/utils'
import type { CostumeMovement } from '@/types'

interface Stats {
  total: number
  available: number
  borrowed: number
  washing: number
  repair: number
  lost: number
  reserved: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentMovements, setRecentMovements] = useState<CostumeMovement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const [statsData, movementsData] = await Promise.all([
        costumeService.getDashboardStats(),
        supabase
          .from('costume_movements')
          .select(`
            *,
            costume:costumes(id, name, code),
            user:users!costume_movements_user_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(8)
          .then(({ data }) => data || []),
      ])

      setStats(statsData)
      setRecentMovements(movementsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'costumes' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const actionLabels: Record<string, string> = {
    checkout: 'Retiró',
    return: 'Devolvió',
    send_wash: 'Envió a lavado',
    send_repair: 'Envió a arreglo',
    mark_lost: 'Marcó como perdido',
    damage_report: 'Reportó daño',
    status_change: 'Cambió estado',
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600">Dashboard</p>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Resumen del día</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="rounded-2xl border-violet-200 bg-white/80 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-md">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </Button>
      </div>

      <div className="mb-6 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 p-6 text-white shadow-[0_28px_50px_-24px_rgba(76,29,149,0.65)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-violet-100">Resumen del día</p>
            <h2 className="text-xl font-semibold">Estado general del inventario</h2>
            <p className="text-sm text-violet-100/95 max-w-xl">Consulta el estado de tus prendas, movimientos recientes y disponibilidad en una sola vista clara.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-md">{stats?.available ?? 0} disponibles</div>
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-md">{stats?.borrowed ?? 0} prestados</div>
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-md">{stats?.repair ?? 0} en arreglo</div>
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-md">{recentMovements.length} movimientos</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="Total vestuarios"
          value={stats?.total ?? 0}
          icon={<Shirt className="w-5 h-5" />}
          color="text-violet-700"
          bgColor="bg-violet-50"
          borderColor="border-violet-100"
          loading={loading}
          onClick={() => router.push('/inventory')}
        />
        <StatCard
          title="Disponibles"
          value={stats?.available ?? 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="text-emerald-700"
          bgColor="bg-emerald-50"
          borderColor="border-emerald-100"
          loading={loading}
          onClick={() => router.push('/inventory?status=available')}
        />
        <StatCard
          title="Prestados"
          value={stats?.borrowed ?? 0}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="text-amber-700"
          bgColor="bg-amber-50"
          borderColor="border-amber-100"
          loading={loading}
          onClick={() => router.push('/inventory?status=borrowed')}
        />
        <StatCard
          title="Reservados"
          value={stats?.reserved ?? 0}
          icon={<Sparkles className="w-5 h-5" />}
          color="text-blue-700"
          bgColor="bg-blue-50"
          borderColor="border-blue-100"
          loading={loading}
        />
        <StatCard
          title="En lavado"
          value={stats?.washing ?? 0}
          icon={<Clock className="w-5 h-5" />}
          color="text-cyan-700"
          bgColor="bg-cyan-50"
          borderColor="border-cyan-100"
          loading={loading}
          onClick={() => router.push('/inventory?status=washing')}
        />
        <StatCard
          title="En arreglo"
          value={stats?.repair ?? 0}
          icon={<Wrench className="w-5 h-5" />}
          color="text-orange-700"
          bgColor="bg-orange-50"
          borderColor="border-orange-100"
          loading={loading}
          onClick={() => router.push('/inventory?status=repair')}
        />
        <StatCard
          title="Perdidos"
          value={stats?.lost ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="text-red-700"
          bgColor="bg-red-50"
          borderColor="border-red-100"
          loading={loading}
          onClick={() => router.push('/inventory?status=lost')}
        />
        {stats && (
          <StatCard
            title="Disponibilidad"
            value={`${Math.round((stats.available / (stats.total || 1)) * 100)}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="text-violet-700"
            bgColor="bg-violet-50"
            borderColor="border-violet-100"
            subtitle="del total disponible"
          />
        )}
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Actividad reciente</h2>
              <p className="text-xs text-gray-400">Últimos movimientos del inventario</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-2 text-violet-600"><Calendar className="w-4 h-4" /></div>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))
            ) : recentMovements.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Sin movimientos recientes
              </div>
            ) : (
              recentMovements.map((movement) => (
                <div key={movement.id} className="p-4 flex items-start gap-3 hover:bg-gray-50/50">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-violet-600 text-xs font-bold">
                      {(movement.user as { full_name: string })?.full_name?.[0] || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{(movement.user as { full_name: string })?.full_name || 'Usuario'}</span>
                      {' '}
                      <span className="text-gray-500">{actionLabels[movement.action] || movement.action}</span>
                      {' '}
                      <span className="font-medium">{(movement.costume as { name: string })?.name || 'vestuario'}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(movement.created_at)}</p>
                    {movement.notes && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{movement.notes}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Estado del inventario</h2>
            <p className="text-xs text-gray-400">Distribución por estado actual</p>
          </div>
          <div className="p-5 space-y-3">
            {stats ? (
              [
                { status: 'available' as const, count: stats.available },
                { status: 'borrowed' as const, count: stats.borrowed },
                { status: 'reserved' as const, count: stats.reserved },
                { status: 'washing' as const, count: stats.washing },
                { status: 'repair' as const, count: stats.repair },
                { status: 'lost' as const, count: stats.lost },
              ].map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <div className="flex items-center gap-3 flex-1 mx-4">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))
            ) : (
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full animate-pulse" />
                  <div className="w-8 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
