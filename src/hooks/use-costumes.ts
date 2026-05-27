'use client'

import { useState, useEffect, useCallback } from 'react'
import { costumeService } from '@/lib/services/costume.service'
import type { Costume, CostumeStatus } from '@/types'

interface Filters {
  status?: CostumeStatus
  category?: string
  search?: string
}

export function useCostumes(initialFilters?: Filters) {
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(initialFilters || {})

  const fetchCostumes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await costumeService.getAll(filters)
      setCostumes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vestuarios')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchCostumes()
  }, [fetchCostumes])

  const updateFilter = (key: keyof Filters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const clearFilters = () => setFilters({})

  // Optimistic update
  const updateCostumeOptimistic = (id: string, updates: Partial<Costume>) => {
    setCostumes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const removeCostume = (id: string) => {
    setCostumes((prev) => prev.filter((c) => c.id !== id))
  }

  return {
    costumes,
    loading,
    error,
    filters,
    updateFilter,
    clearFilters,
    refetch: fetchCostumes,
    updateCostumeOptimistic,
    removeCostume,
  }
}
