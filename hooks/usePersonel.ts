'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { employeeService } from '@/lib/services/employeeService'
import type { Personel } from '@/types'

interface Filters {
  birimId?: string
  durum?: string
  ara?: string
  includePassive?: boolean
}

export function usePersonel(filters: Filters = {}) {
  const filterKey = `${filters.birimId ?? ''}|${filters.durum ?? ''}|${filters.ara ?? ''}|${filters.includePassive ? '1' : '0'}`
  const debouncedFilterKey = useDebouncedValue(filterKey)
  const [birimId, durum, ara, includePassive] = debouncedFilterKey.split('|')
  const debouncedFilters = {
    birimId: birimId || undefined,
    durum: durum || undefined,
    ara: ara || undefined,
    includePassive: includePassive === '1',
  }
  const [data, setData] = useState<Personel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) employeeService.invalidateList()
      const result = await employeeService.list(debouncedFilters, { useCache: !force })
      setData(result.data ?? [])
    } catch (e: any) {
      console.error('usePersonel: Caught error:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [debouncedFilterKey])

  useEffect(() => { fetch() }, [fetch])

  async function ekle(p: Omit<Personel, 'id' | 'created_at' | 'updated_at'>) {
    const result = await employeeService.create(p)
    employeeService.invalidateList()
    setData(prev => [...prev, result.data])
    return result.data
  }

  async function guncelle(id: string, updates: Partial<Personel>) {
    const result = await employeeService.update(id, updates)
    employeeService.invalidateList()
    setData(prev => prev.map(r => r.id === id ? result.data : r))
    return result.data
  }

  const gorevde = data.filter(r => r.calisma_durumu === 'gorevde').length
  const izinde = data.filter(r => r.calisma_durumu === 'izinde').length
  const ayrilmis = data.filter(r => r.calisma_durumu === 'ayrilmis').length

  return { data, loading, error, ekle, guncelle, yenile: () => fetch(true), gorevde, izinde, ayrilmis }
}
