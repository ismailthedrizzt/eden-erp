'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { accountingService } from '@/lib/services/accountingService'
import type { NakitIslem } from '@/types'

interface Filters {
  islemTarafi?: string
  proje?: string
  tip?: 'gelir' | 'gider' | ''
  ara?: string
}

export function useNakitIslemler(filters: Filters = {}) {
  const filterKey = `${filters.islemTarafi ?? ''}|${filters.proje ?? ''}|${filters.tip ?? ''}|${filters.ara ?? ''}`
  const debouncedFilterKey = useDebouncedValue(filterKey)
  const [islemTarafi, proje, tip, ara] = debouncedFilterKey.split('|')
  const debouncedFilters = {
    islemTarafi: islemTarafi || undefined,
    proje: proje || undefined,
    tip: (tip || undefined) as Filters['tip'],
    ara: ara || undefined,
  }
  const [data, setData] = useState<NakitIslem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)

  const fetch = useCallback(async (force = false) => {
    setLoading(previous => force || !hasDataRef.current ? true : previous)
    setError(null)
    try {
      if (force) accountingService.invalidateList()
      const result = await accountingService.list(debouncedFilters, { useCache: !force })
      setData(result.data ?? [])
      hasDataRef.current = true
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [debouncedFilterKey])

  useEffect(() => { fetch() }, [fetch])

  async function ekle(islem: Omit<NakitIslem, 'id' | 'created_at' | 'updated_at'>) {
    const result = await accountingService.create(islem)
    accountingService.invalidateList()
    setData(prev => [result.data, ...prev])
    return result.data
  }

  async function guncelle(id: string, updates: Partial<NakitIslem>) {
    const result = await accountingService.update(id, updates)
    accountingService.invalidateList()
    setData(prev => prev.map(r => r.id === id ? result.data : r))
    return result.data
  }

  async function sil(id: string) {
    await accountingService.delete(id)
    accountingService.invalidateList()
    setData(prev => prev.filter(r => r.id !== id))
  }

  const toplamGelir = data
    .filter(r => String(r.proje) !== 'Aktarim' && String(r.proje) !== 'Aktarım')
    .reduce((s, r) => s + (r.gelir || 0), 0)

  const toplamGider = data
    .filter(r => String(r.proje) !== 'Aktarim' && String(r.proje) !== 'Aktarım')
    .reduce((s, r) => s + (r.gider || 0), 0)

  const netBakiye = toplamGelir - toplamGider

  const IC_TARAFLAR = ['Ismail ILGAR', 'İsmail ILGAR', 'Canberk', 'Ergun', 'Ergün']
  const acikBorc =
    data.filter(r => IC_TARAFLAR.includes(r.islem_tarafi)).reduce((s, r) => s + (r.gider || 0), 0) -
    data.filter(r => r.islem_tarafi === 'Eden' && IC_TARAFLAR.includes(r.karsi_taraf ?? '')).reduce((s, r) => s + (r.gelir || 0), 0)

  return { data, loading, error, ekle, guncelle, sil, yenile: () => fetch(true), toplamGelir, toplamGider, netBakiye, acikBorc }
}
