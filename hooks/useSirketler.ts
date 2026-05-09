'use client'

import { useState, useEffect, useCallback } from 'react'
import { companyService } from '@/lib/services/companyService'
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
  const [data, setData] = useState<Sirket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSirketler = useCallback(async (force = false) => {
    try {
      setLoading(true)
      setError(null)
      if (force) companyService.invalidateList()
      const result = await companyService.list({ useCache: !force })
      setData(result.data || [])
    } catch (err: any) {
      console.error('Error fetching sirketler:', err)
      setError(err.message || 'Sirketler yuklenirken hata olustu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSirketler()
  }, [fetchSirketler])

  const getSirket = async (id: string): Promise<Sirket | null> => {
    try {
      const result = await companyService.detail(id)
      return result.data
    } catch (err) {
      console.error('Error fetching sirket:', err)
      return null
    }
  }

  const getOrtaklar = async (sirketId: string): Promise<SirketOrtak[]> => {
    try {
      const result = await companyService.partners(sirketId)
      return result.data || []
    } catch (err) {
      console.error('Error fetching ortaklar:', err)
      return []
    }
  }

  const getTemsilciler = async (sirketId: string): Promise<SirketTemsilci[]> => {
    try {
      const result = await companyService.representatives(sirketId)
      return result.data || []
    } catch (err) {
      console.error('Error fetching temsilciler:', err)
      return []
    }
  }

  const getDokumanlar = async (sirketId: string): Promise<SirketDokuman[]> => {
    try {
      const result = await companyService.documents(sirketId)
      return result.data || []
    } catch (err) {
      console.error('Error fetching dokumanlar:', err)
      return []
    }
  }

  const getLogolar = async (sirketId: string): Promise<SirketLogo[]> => {
    try {
      const result = await companyService.logos(sirketId)
      return result.data || []
    } catch (err) {
      console.error('Error fetching logolar:', err)
      return []
    }
  }

  return {
    data,
    loading,
    error,
    yenile: () => fetchSirketler(true),
    getSirket,
    getOrtaklar,
    getTemsilciler,
    getDokumanlar,
    getLogolar,
  }
}
