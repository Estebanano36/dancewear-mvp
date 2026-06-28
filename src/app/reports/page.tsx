'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Shirt, Droplets, Wrench, RefreshCw, Calendar, TrendingUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatDateTime } from '@/utils'
import type { DamageReport, Costume } from '@/types'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ReportsPage() {
  const [damageReports, setDamageReports] = useState<DamageReport[]>([])
  const [borrowedCostumes, setBorrowedCostumes] = useState<Costume[]>([])
  const [washingCostumes, setWashingCostumes] = useState<Costume[]>([])
  const [repairCostumes, setRepairCostumes] = useState<Costume[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'prestados' | 'lavado' | 'arreglo' | 'danos'>('prestados')

  const fetchData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const [damagesRes, borrowedRes, washingRes, repairRes] = await Promise.all([
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
        supabase
          .from('costumes')
          .select(`*, current_holder:users!costumes_current_holder_id_fkey(full_name)`)
          .eq('status', 'washing')
          .order('updated_at', { ascending: true }),
        supabase
          .from('costumes')
          .select(`*, current_holder:users!costumes_current_holder_id_fkey(full_name)`)
          .eq('status', 'repair')
          .order('updated_at', { ascending: true }),
      ])
      setDamageReports(damagesRes.data || [])
      setBorrowedCostumes(borrowedRes.data || [])
      setWashingCostumes(washingRes.data || [])
      setRepairCostumes(repairRes.data || [])
    } catch { toast.error('Error al cargar reportes') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

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

  const getDaysSince = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const exportCSV = (data: Costume[], filename: string) => {
    const headers = ['Código', 'Nombre', 'Categoría', 'Talla', 'Con quién', 'Días', 'Evento']
    const rows = data.map((c) => [
      c.code,
      c.name,
      c.category,
      c.size,
      (c.current_holder as { full_name: string } | null)?.full_name || '—',
      getDaysSince(c.updated_at),
      (c.current_event as { name: string } | null)?.name || '—',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'prestados' as const, label: 'Prestados', count: borrowedCostumes.length, icon: Shirt, color: 'text-amber-600' },
    { id: 'lavado' as const, label: 'En lavado', count: washingCostumes.length, icon: Droplets, color: 'text-cyan-600' },
    { id: 'arreglo' as const, label: 'En arreglo', count: repairCostumes.length, icon: Wrench, color: 'text-orange-600' },
    { id: 'danos' as const, label: 'Daños', count: unresolvedDamages.length, icon: AlertTriangle, color: 'text-red-600' },
  ]

  const CostumeStatusTable = ({ costumes, emptyMsg }: { costumes: Costume[]; emptyMsg: string }) => (
    <div className="divide-y divide-gray-50 max-h-[28rem] overflow-y-auto">
      {loading ? (
        [...Array(5)].map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))
      ) : costumes.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">{emptyMsg}</div>
      ) : (
        costumes.map((costume) => {
          const days = getDaysSince(costume.updated_at)
          const isLong = days > 7
          return (
            <div key={costume.id} className={`p-4 flex items-start gap-3 ${isLong ? 'bg-red-50/30' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isLong ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                {days}d
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/inventory/${costume.id}`} className="text-sm font-semibold text-gray-800 hover:text-violet-600 truncate">
                    {costume.name}
                  </Link>
                  {isLong && <span className="text-xs text-red-500 font-medium flex-shrink-0">⚠ Tardío</span>}
                </div>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{costume.code} · Talla {costume.size}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Con: {(costume.current_holder as { full_name: string } | null)?.full_name || '—'}
                </p>
                {costume.current_event && (
                  <p className="text-xs text-gray-400">
                    Evento: {(costume.current_event as { name: string; date: string })?.name} · {formatDate((costume.current_event as { name: string; date: string })?.date)}
                  </p>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daños, préstamos y alertas del inventario</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Daños pendientes', value: unresolvedDamages.length, color: 'text-red-700', bg: 'bg-red-50', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Actualmente prestados', value: borrowedCostumes.length, color: 'text-amber-700', bg: 'bg-amber-50', icon: <Shirt className="w-5 h-5" /> },
          { label: 'En lavado', value: washingCostumes.length, color: 'text-cyan-700', bg: 'bg-cyan-50', icon: <Droplets className="w-5 h-5" /> },
          { label: 'En arreglo', value: repairCostumes.length, color: 'text-orange-700', bg: 'bg-orange-50', icon: <Wrench className="w-5 h-5" /> },
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

      {/* Tabbed detail view */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'border-b-2 border-violet-500 text-violet-700 bg-violet-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-violet-500' : tab.color}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {loading ? '…' : tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab header with export button */}
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {activeTab === 'prestados' && 'Vestuarios actualmente prestados'}
            {activeTab === 'lavado' && 'Vestuarios en lavado'}
            {activeTab === 'arreglo' && 'Vestuarios en arreglo'}
            {activeTab === 'danos' && 'Reportes de daño'}
          </p>
          {activeTab !== 'danos' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                const data = activeTab === 'prestados' ? borrowedCostumes : activeTab === 'lavado' ? washingCostumes : repairCostumes
                exportCSV(data, activeTab)
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </Button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === 'prestados' && (
          <CostumeStatusTable costumes={borrowedCostumes} emptyMsg="Sin vestuarios prestados actualmente" />
        )}
        {activeTab === 'lavado' && (
          <CostumeStatusTable costumes={washingCostumes} emptyMsg="Sin vestuarios en lavado" />
        )}
        {activeTab === 'arreglo' && (
          <CostumeStatusTable costumes={repairCostumes} emptyMsg="Sin vestuarios en arreglo" />
        )}
        {activeTab === 'danos' && (
          <div className="divide-y divide-gray-50 max-h-[28rem] overflow-y-auto">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-4 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              ))
            ) : damageReports.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">Sin reportes de daño</div>
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
        )}
      </div>

      {/* Additional summary for damages */}
      {resolvedDamages.length > 0 && activeTab === 'danos' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span><strong className="text-emerald-700">{resolvedDamages.length}</strong> daños resueltos de un total de <strong>{damageReports.length}</strong> reportes.</span>
        </div>
      )}

      {/* Long-borrowed warning */}
      {!loading && activeTab === 'prestados' && borrowedCostumes.filter((c) => getDaysSince(c.updated_at) > 7).length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{borrowedCostumes.filter((c) => getDaysSince(c.updated_at) > 7).length}</strong> vestuarios llevan más de 7 días prestados sin devolución.
          </span>
        </div>
      )}

      {/* Calendar note */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Última actualización: {new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </div>
    </div>
  )
}
