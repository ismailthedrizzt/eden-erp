'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Personel } from '@/types'

interface Filters {
  birimId?: string
  durum?: string
  ara?: string
}

export function usePersonel(filters: Filters = {}) {
  const [data, setData] = useState<Personel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('personel')
        .select('*, birim:birimler(id,ad,tip), kadro:norm_kadrolar(id,unvan)')
        .order('soyad')

      if (filters.birimId) q = q.eq('birim_id', filters.birimId)
      if (filters.durum)   q = q.eq('calisma_durumu', filters.durum)
      if (filters.ara)     q = q.or(`ad.ilike.%${filters.ara}%,soyad.ilike.%${filters.ara}%`)

      const { data: rows, error: err } = await q
      if (err) throw err
      setData(rows ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters.birimId, filters.durum, filters.ara])

  useEffect(() => { fetch() }, [fetch])

  async function ekle(p: Omit<Personel, 'id' | 'created_at' | 'updated_at'>) {
    const { data: row, error: err } = await supabase
      .from('personel').insert(p).select().single()
    if (err) throw err
    setData(prev => [...prev, row])
    return row
  }

  async function guncelle(id: string, updates: Partial<Personel>) {
    const { data: row, error: err } = await supabase
      .from('personel').update(updates).eq('id', id).select().single()
    if (err) throw err
    setData(prev => prev.map(r => r.id === id ? row : r))
    return row
  }

  const gorevde  = data.filter(r => r.calisma_durumu === 'gorevde').length
  const izinde   = data.filter(r => r.calisma_durumu === 'izinde').length
  const ayrilmis = data.filter(r => r.calisma_durumu === 'ayrilmis').length

  return { data, loading, error, ekle, guncelle, yenile: fetch, gorevde, izinde, ayrilmis }
}
