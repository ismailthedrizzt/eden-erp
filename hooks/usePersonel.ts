'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { employeeService, type EmployeeListQuery } from '@/lib/services/employeeService'
import type { ListMeta } from '@/lib/api/listEndpoint'
import type { Personel } from '@/types'

interface Filters {
  birimId?: string
  durum?: string
  ara?: string
  includePassive?: boolean
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export function usePersonel(filters: Filters = {}) {
  const filterKey = `${filters.birimId ?? ''}|${filters.durum ?? ''}|${filters.ara ?? ''}|${filters.search ?? ''}|${filters.includePassive ? '1' : '0'}|${filters.page ?? 1}|${filters.pageSize ?? 50}|${filters.sort ?? ''}|${filters.direction ?? ''}`
  const debouncedFilterKey = useDebouncedValue(filterKey)
  const [birimId, durum, ara, search, includePassive, page, pageSize, sort, direction] = debouncedFilterKey.split('|')
  const debouncedFilters: Partial<EmployeeListQuery> = {
    birimId: birimId || undefined,
    durum: durum || undefined,
    ara: ara || undefined,
    search: search || undefined,
    includePassive: includePassive === '1',
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 50,
    sort: sort || undefined,
    direction: direction === 'desc' ? 'desc' : 'asc',
  }
  const [data, setData] = useState<Personel[]>([])
  const [meta, setMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) employeeService.invalidateList()
      const result = await employeeService.list(debouncedFilters, { useCache: !force })
      setData(result.data ?? [])
      setMeta(result.meta ?? { page: debouncedFilters.page ?? 1, pageSize: debouncedFilters.pageSize ?? 50, total: result.data?.length ?? 0, totalPages: 1 })
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

  return { data, meta, loading, error, ekle, guncelle, yenile: () => fetch(true), gorevde, izinde, ayrilmis }
}
