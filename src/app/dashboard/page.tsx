'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shirt, CheckCircle, ArrowUpRight,
  Calendar, Clock,
  TrendingUp, RefreshCw, FolderPlus,
  ArrowRight, ShieldAlert
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/utils'
import type { CostumeMovement } from '@/types'
import Link from 'next/link'

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

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const supabase = createClient()

      // Fetch stats from server-side API to always get fresh data
      const statsRes = await fetch('/api/dashboard/stats', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!statsRes.ok) throw new Error('Error al obtener estadísticas')
      const statsData = await statsRes.json()

      const movementsData = await supabase
        .from('costume_movements')
        .select(`
          *,
          costume:costumes(id, name, code),
          user:users!costume_movements_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(8)
        .then(({ data }) => data || [])

      setStats(statsData)
      setRecentMovements(movementsData)
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const handleFocus = () => fetchData(true)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData(true)
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-costumes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'costumes' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'costume_movements' }, () => fetchData(true))
      .subscribe()

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const actionLabels: Record<string, string> = {
    checkout: 'Retiró',
    return: 'Devolvió',
    send_wash: 'Envió a lavado',
    send_repair: 'Envió a arreglo',
    mark_lost: 'Marcó como perdido',
    damage_report: 'Reportó daño',
    status_change: 'Cambió estado',
  }

  const availabilityPct = stats && stats.total > 0
    ? Math.round((stats.available / stats.total) * 100)
    : 0

  const needsAttentionCount = (stats?.washing || 0) + (stats?.repair || 0) + (stats?.lost || 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 tracking-wide">
              Panel Principal
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
            Arabela Espectáculos
          </h1>
          <p className="text-sm text-gray-500">
            Control de inventario, préstamos de vestuario y eventos en tiempo real.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData()}
          className="self-start sm:self-auto rounded-xl border-gray-200 bg-white shadow-sm hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar datos
        </Button>
      </div>

      {/* Quick Action Hub - Ultra-intuitive for anyone */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href="/inventory"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-4 text-white shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs font-medium text-violet-100">Explorar catálogo</p>
          <h3 className="font-bold text-base text-white">Inventario</h3>
        </Link>

        <Link
          href="/lists"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 p-4 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs font-medium text-indigo-100">Colecciones & Sets</p>
          <h3 className="font-bold text-base text-white">Listas de Show</h3>
        </Link>

        <Link
          href="/events"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 p-4 text-white shadow-md shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs font-medium text-pink-100">Presentaciones</p>
          <h3 className="font-bold text-base text-white">Eventos</h3>
        </Link>

        <Link
          href="/reports"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs font-medium text-amber-100">Métricas & Descargas</p>
          <h3 className="font-bold text-base text-white">Reportes</h3>
        </Link>
      </div>

      {/* Attention Alert Banner if items need action */}
      {needsAttentionCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">
                Prendas que requieren atención: {needsAttentionCount}
              </p>
              <p className="text-xs text-amber-700">
                {stats?.washing || 0} en lavado · {stats?.repair || 0} en arreglo · {stats?.lost || 0} reportadas como perdidas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats?.washing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/inventory?status=washing')}
                className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 text-xs h-8"
              >
                Ver Lavado
              </Button>
            ) : null}
            {stats?.repair ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/inventory?status=repair')}
                className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 text-xs h-8"
              >
                Ver Arreglos
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Vestuarios"
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
          subtitle={`${availabilityPct}% del almacén`}
        />
        <StatCard
          title="En Préstamo / Uso"
          value={stats?.borrowed ?? 0}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="text-amber-700"
          bgColor="bg-amber-50"
          borderColor="border-amber-100"
          loading={loading}
          onClick={() => router.push('/inventory?status=borrowed')}
        />
        <StatCard
          title="En Lavado"
          value={stats?.washing ?? 0}
          icon={<Clock className="w-5 h-5" />}
          color="text-cyan-700"
          bgColor="bg-cyan-50"
          borderColor="border-cyan-100"
          loading={loading}
          onClick={() => router.push('/inventory?status=washing')}
        />
      </div>

      {/* Dual Column: Activity Feed & Inventory Distribution */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Movements */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Actividad Reciente</h2>
              <p className="text-xs text-gray-400">Últimos movimientos registrados en el sistema</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[380px] overflow-y-auto">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded-md animate-pulse w-1/2" />
                  </div>
                </div>
              ))
            ) : recentMovements.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">
                <p className="text-2xl mb-1">✨</p>
                No hay movimientos registrados recientemente
              </div>
            ) : (
              recentMovements.map((movement) => (
                <div key={movement.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-100 to-purple-100 text-violet-700 flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-sm">
                    {(movement.user as { full_name: string })?.full_name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold text-gray-900">
                        {(movement.user as { full_name: string })?.full_name || 'Usuario'}
                      </span>
                      {' '}
                      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                        {actionLabels[movement.action] || movement.action}
                      </span>
                      {' '}
                      <span className="font-semibold text-violet-900">
                        {(movement.costume as { name: string })?.name || 'prenda'}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatDateTime(movement.created_at)}
                    </p>
                    {movement.notes && (
                      <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg p-1.5 border border-gray-100">
                        💬 {movement.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Distribution Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-base">Estado del Inventario</h2>
            <p className="text-xs text-gray-400">Distribución de prendas por condición actual</p>
          </div>
          <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-center">
            {stats ? (
              [
                { status: 'available' as const, count: stats.available, barColor: 'bg-emerald-500' },
                { status: 'borrowed' as const, count: stats.borrowed, barColor: 'bg-amber-500' },
                { status: 'reserved' as const, count: stats.reserved, barColor: 'bg-blue-500' },
                { status: 'washing' as const, count: stats.washing, barColor: 'bg-cyan-500' },
                { status: 'repair' as const, count: stats.repair, barColor: 'bg-orange-500' },
                { status: 'lost' as const, count: stats.lost, barColor: 'bg-red-500' },
              ].map(({ status, count, barColor }) => (
                <div key={status} className="flex items-center justify-between gap-3">
                  <div className="w-28 flex-shrink-0">
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-700`}
                      style={{ width: `${stats.total ? Math.max((count / stats.total) * 100, count > 0 ? 3 : 0) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-8 text-right">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full animate-pulse" />
                  <div className="w-6 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-gray-100 text-center">
            <Link
              href="/inventory"
              className="text-xs font-semibold text-violet-700 hover:text-violet-800 transition-colors inline-flex items-center gap-1"
            >
              Ver inventario completo con fotos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
