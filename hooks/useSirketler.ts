'use client'

/**
 * useSirketler Hook
 * 
 * Custom hook for company (şirket) data management
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Sirket, SirketOrtak, SirketTemsilci, SirketDokuman, SirketLogo } from '@/types/sirket'

interface UseSirketlerReturn {
  data: Sirket[]
  loading: boolean
  error: string | null
  yenile: () => void
  getSirket: (id: string) => Promise<Sirket | null>
  getOrtaklar: (sirketId: string) => Promise<SirketOrtak[]>
  getTemsilciler: (sirketId: string) => Promise<SirketTemsilci[]>
  getDokumanlar: (sirketId: string) => Promise<SirketDokuman[]>
  getLogolar: (sirketId: string) => Promise<SirketLogo[]>
}

export function useSirketler(): UseSirketlerReturn {
  const supabase = createClient()
  const [data, setData] = useState<Sirket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSirketler = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/sirketler')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Şirketler yüklenirken hata oluştu')
      }
      
      setData(result.data || [])
    } catch (err: any) {
      console.error('Error fetching sirketler:', err)
      setError(err.message || 'Şirketler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSirketler()
  }, [fetchSirketler])

  const getSirket = async (id: string): Promise<Sirket | null> => {
    try {
      const { data: sirket, error } = await supabase
        .from('sirketler')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return sirket
    } catch (err) {
      console.error('Error fetching sirket:', err)
      return null
    }
  }

  const getOrtaklar = async (sirketId: string): Promise<SirketOrtak[]> => {
    try {
      const { data: ortaklar, error } = await supabase
        .from('sirket_ortaklar')
        .select('*')
        .eq('sirket_id', sirketId)
        .order('hisse_orani', { ascending: false })
      
      if (error) throw error
      return ortaklar || []
    } catch (err) {
      console.error('Error fetching ortaklar:', err)
      return []
    }
  }

  const getTemsilciler = async (sirketId: string): Promise<SirketTemsilci[]> => {
    try {
      const { data: temsilciler, error } = await supabase
        .from('sirket_temsilciler')
        .select('*')
        .eq('sirket_id', sirketId)
      
      if (error) throw error
      return temsilciler || []
    } catch (err) {
      console.error('Error fetching temsilciler:', err)
      return []
    }
  }

  const getDokumanlar = async (sirketId: string): Promise<SirketDokuman[]> => {
    try {
      const { data: dokumanlar, error } = await supabase
        .from('sirket_dokumanlar')
        .select('*')
        .eq('sirket_id', sirketId)
        .order('yuklenme_tarihi', { ascending: false })
      
      if (error) throw error
      return dokumanlar || []
    } catch (err) {
      console.error('Error fetching dokumanlar:', err)
      return []
    }
  }

  const getLogolar = async (sirketId: string): Promise<SirketLogo[]> => {
    try {
      const { data: logolar, error } = await supabase
        .from('sirket_logolar')
        .select('*')
        .eq('sirket_id', sirketId)
        .order('is_primary', { ascending: false })
      
      if (error) throw error
      return logolar || []
    } catch (err) {
      console.error('Error fetching logolar:', err)
      return []
    }
  }

  return {
    data,
    loading,
    error,
    yenile: fetchSirketler,
    getSirket,
    getOrtaklar,
    getTemsilciler,
    getDokumanlar,
    getLogolar
  }
}
