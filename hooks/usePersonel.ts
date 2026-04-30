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
      // Check if teskilat module is active
      const { data: teskilatLicense } = await supabase
        .from('module_licenses')
        .select('is_active, environment')
        .eq('module_key', 'teskilat')
        .single()

      const isTeskilatActive = teskilatLicense?.is_active &&
        (teskilatLicense.environment === 'all' || teskilatLicense.environment === 'development')

      console.log('usePersonel: Teskilat module active:', isTeskilatActive)

      // Build select query based on teskilat module status
      let selectQuery = '*'
      if (isTeskilatActive) {
        selectQuery = '*, birim:birimler(id,ad,tip), kadro:norm_kadrolar(id,unvan)'
      }

      let q = supabase
        .from('personel')
        .select(selectQuery)
        .order('soyad')

      if (filters.birimId && isTeskilatActive) q = q.eq('birim_id', filters.birimId)
      if (filters.durum)   q = q.eq('calisma_durumu', filters.durum)
      if (filters.ara)     q = q.or(`ad.ilike.%${filters.ara}%,soyad.ilike.%${filters.ara}%`)

      console.log('usePersonel: Executing query...')
      const { data: rows, error: err } = await q
      console.log('usePersonel: Query result:', { rows, err })
      if (err) {
        console.error('usePersonel: Error fetching data:', err)
        throw err
      }
      console.log('usePersonel: Setting data:', rows)
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
