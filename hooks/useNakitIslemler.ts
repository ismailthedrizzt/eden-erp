'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NakitIslem } from '@/types'

interface Filters {
  islemTarafi?: string
  proje?: string
  tip?: 'gelir' | 'gider' | ''
  ara?: string
}

export function useNakitIslemler(filters: Filters = {}) {
  const [data, setData] = useState<NakitIslem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('nakit_islemler')
        .select('*')
        .order('tarih', { ascending: false })

      if (filters.islemTarafi) q = q.eq('islem_tarafi', filters.islemTarafi)
      if (filters.proje)       q = q.eq('proje', filters.proje)
      if (filters.tip === 'gelir') q = q.gt('gelir', 0)
      if (filters.tip === 'gider') q = q.gt('gider', 0)
      if (filters.ara) q = q.or(
        `aciklama.ilike.%${filters.ara}%,karsi_taraf.ilike.%${filters.ara}%`
      )

      const { data: rows, error: err } = await q
      if (err) throw err
      setData(rows ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters.islemTarafi, filters.proje, filters.tip, filters.ara])

  useEffect(() => { fetch() }, [fetch])

  async function ekle(islem: Omit<NakitIslem, 'id' | 'created_at' | 'updated_at'>) {
    const { data: row, error: err } = await supabase
      .from('nakit_islemler').insert(islem).select().single()
    if (err) throw err
    setData(prev => [row, ...prev])
    return row
  }

  async function guncelle(id: string, updates: Partial<NakitIslem>) {
    const { data: row, error: err } = await supabase
      .from('nakit_islemler').update(updates).eq('id', id).select().single()
    if (err) throw err
    setData(prev => prev.map(r => r.id === id ? row : r))
    return row
  }

  async function sil(id: string) {
    const { error: err } = await supabase
      .from('nakit_islemler').delete().eq('id', id)
    if (err) throw err
    setData(prev => prev.filter(r => r.id !== id))
  }

  // KPI hesapları
  const toplamGelir = data
    .filter(r => r.proje !== 'Aktarım')
    .reduce((s, r) => s + (r.gelir || 0), 0)

  const toplamGider = data
    .filter(r => r.proje !== 'Aktarım')
    .reduce((s, r) => s + (r.gider || 0), 0)

  const netBakiye = toplamGelir - toplamGider

  const IC_TARAFLAR = ['İsmail ILGAR', 'Canberk', 'Ergün']
  const acikBorc =
    data.filter(r => IC_TARAFLAR.includes(r.islem_tarafi)).reduce((s, r) => s + (r.gider || 0), 0) -
    data.filter(r => r.islem_tarafi === 'Eden' && IC_TARAFLAR.includes(r.karsi_taraf ?? '')).reduce((s, r) => s + (r.gelir || 0), 0)

  return { data, loading, error, ekle, guncelle, sil, yenile: fetch, toplamGelir, toplamGider, netBakiye, acikBorc }
}
