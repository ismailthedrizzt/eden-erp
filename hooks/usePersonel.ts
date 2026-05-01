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
    setError(null)
    console.log('usePersonel: Fetching data...')
    try {
      // Simple query without relations first
      console.log('usePersonel: Executing simple query...')
      let q = supabase
        .from('personel')
        .select('*')
        .order('soyad')

      if (filters.durum) q = q.eq('calisma_durumu', filters.durum)
      if (filters.ara)   q = q.or(`ad.ilike.%${filters.ara}%,soyad.ilike.%${filters.ara}%`)

      const { data: rows, error: err } = await q
      
      if (err) {
        console.error('usePersonel: Error:', err)
        throw err
      }
      
      console.log('usePersonel: Success -', rows?.length || 0, 'records')
      setData(((rows as unknown) as Personel[]) ?? [])
    } catch (e: any) {
      console.error('usePersonel: Caught error:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters.birimId, filters.durum, filters.ara, supabase])

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
