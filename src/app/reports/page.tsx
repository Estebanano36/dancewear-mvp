'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Shirt, Calendar, TrendingUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime, formatDate } from '@/utils'
import type { DamageReport, Costume } from '@/types'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ReportsPage() {
  const [damageReports, setDamageReports] = useState<DamageReport[]>([])
  const [borrowedCostumes, setBorrowedCostumes] = useState<Costume[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        const [damagesRes, borrowedRes] = await Promise.all([
          supabase
            .from('damage_reports')
            .select(`*, costume:costumes(id, name, code, status), reporter:users!damage_reports_reported_by_fkey(full_name)`)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('costumes')
            .select(`*, current_holder:users!costumes_current_holder_id_fkey(full_name), current_event:events!costumes_current_event_id_fkey(name, date)`)
            .eq('status', 'borrowed')
            .order('updated_at', { ascending: true }),
        ])
        setDamageReports(damagesRes.data || [])
        setBorrowedCostumes(borrowedRes.data || [])
      } catch { toast.error('Error al cargar reportes') }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  const resolveDamage = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('damage_reports')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setDamageReports((prev) => prev.map((r) => r.id === id ? { ...r, resolved: true } : r))
      toast.success('Daño marcado como resuelto')
    }
  }

  const severityConfig = {
    low: { label: 'Leve', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    medium: { label: 'Moderado', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    high: { label: 'Grave', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  }

  const unresolvedDamages = damageReports.filter((r) => !r.resolved)
  const resolvedDamages = damageReports.filter((r) => r.resolved)

  // Days borrowed calculation
  const getDaysBorrowed = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daños, préstamos y alertas</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Daños sin resolver', value: unresolvedDamages.length, color: 'text-red-700', bg: 'bg-red-50', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Actualmente prestados', value: borrowedCostumes.length, color: 'text-amber-700', bg: 'bg-amber-50', icon: <Shirt className="w-5 h-5" /> },
          { label: 'Daños resueltos', value: resolvedDamages.length, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Total reportes', value: damageReports.length, color: 'text-violet-700', bg: 'bg-violet-50', icon: <Calendar className="w-5 h-5" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Overdue / long borrowed */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-50 flex items-center gap-2">
            <Shirt className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Vestuarios prestados</h2>
            <span className="ml-auto text-xs text-gray-400">{borrowedCostumes.length}</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))
            ) : borrowedCostumes.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Sin vestuarios prestados</div>
            ) : (
              borrowedCostumes.map((costume) => {
                const days = getDaysBorrowed(costume.updated_at)
                const isOverdue = days > 7
                return (
                  <div key={costume.id} className={`p-4 flex items-start gap-3 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      {days}d
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/inventory/${costume.id}`} className="text-sm font-medium text-gray-800 hover:text-violet-600 truncate">
                          {costume.name}
                        </Link>
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-medium flex-shrink-0">⚠ Tardío</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Con: {(costume.current_holder as { full_name: string })?.full_name || '—'}
                      </p>
                      {costume.current_event && (
                        <p className="text-xs text-gray-400">
                          Evento: {(costume.current_event as { name: string })?.name}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Damage reports */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-gray-900">Reportes de daño</h2>
            <span className="ml-auto text-xs text-gray-400">{unresolvedDamages.length} pendientes</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-4 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              ))
            ) : damageReports.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Sin reportes de daño</div>
            ) : (
              [...unresolvedDamages, ...resolvedDamages].map((report) => {
                const sev = severityConfig[report.severity]
                return (
                  <div key={report.id} className={`p-4 ${report.resolved ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <Link href={`/inventory/${(report.costume as { id: string })?.id}`}
                          className="text-sm font-medium text-gray-800 hover:text-violet-600 truncate block">
                          {(report.costume as { name: string })?.name || '—'}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sev.bg} ${sev.color} ${sev.border}`}>
                          {sev.label}
                        </span>
                        {report.resolved && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            Resuelto
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        Por {(report.reporter as { full_name: string })?.full_name || '—'} · {formatDateTime(report.created_at)}
                      </p>
                      {!report.resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-6 px-2"
                          onClick={() => resolveDamage(report.id)}
                        >
                          Resolver
                        </Button>
                      )}
                    </div>
                    {report.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={report.photo_url} alt="Daño" className="mt-2 rounded-lg max-h-24 object-cover" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
