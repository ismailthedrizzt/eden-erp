'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { companyService } from '@/lib/services/companyService'
import type { ListMeta, ListQuery } from '@/lib/api/listEndpoint'
import type { Sirket, SirketOrtak, SirketTemsilci, SirketDokuman, SirketLogo } from '@/types/sirket'

interface UseSirketlerReturn {
  data: Sirket[]
  meta: ListMeta
  loading: boolean
  error: string | null
  yenile: () => void
  getSirket: (id: string) => Promise<Sirket | null>
  getPartners: (sirketId: string) => Promise<SirketOrtak[]>
  getRepresentatives: (sirketId: string) => Promise<SirketTemsilci[]>
  getDocuments: (sirketId: string) => Promise<SirketDokuman[]>
  getLogos: (sirketId: string) => Promise<SirketLogo[]>
}

export function useSirketler(options: { includePassive?: boolean } & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> = {}): UseSirketlerReturn {
  const [data, setData] = useState<Sirket[]>([])
  const [meta, setMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)

  const fetchSirketler = useCallback(async (force = false) => {
    try {
      setLoading(previous => force || !hasDataRef.current ? true : previous)
      setError(null)
      if (force) companyService.invalidateList()
      const result = await companyService.list({ useCache: !force, ...options })
      setData(result.data || [])
      hasDataRef.current = true
      setMeta(result.meta ?? { page: options.page ?? 1, pageSize: options.pageSize ?? 50, total: result.data?.length ?? 0, totalPages: 1 })
    } catch (err: any) {
      console.error('Error fetching companies:', err)
      setError(err.message || 'Sirketler yuklenirken hata olustu')
    } finally {
      setLoading(false)
    }
  }, [options.includePassive, options.page, options.pageSize, options.search, options.sort, options.direction])

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

  const getPartners = async (sirketId: string): Promise<SirketOrtak[]> => {
    try {
      const result = await companyService.partners(sirketId)
      return result.data || []
    } catch (err) {
      console.error('Error fetching partners:', err)
      return []
    }
  }

  const getRepresentatives = async (sirketId: string): Promise<SirketTemsilci[]> => {
    try {
      const result = await companyService.representatives(sirketId)
      return result.data || []
    } catch (err) {
      console.error('Error fetching representatives:', err)
      return []
    }
  }

  const getDocuments = async (sirketId: string): Promise<SirketDokuman[]> => {
    try {
      const result = await companyService.documents(sirketId)
      return result.data || []
    } catch (err) {
      console.error('Error fetching documents:', err)
      return []
    }
  }

  const getLogos = async (sirketId: string): Promise<SirketLogo[]> => {
    try {
      const result = await companyService.logos(sirketId)
      return result.data || []
    } catch (err) {
      console.error('Error fetching logos:', err)
      return []
    }
  }

  return {
    data,
    meta,
    loading,
    error,
    yenile: () => fetchSirketler(true),
    getSirket,
    getPartners,
    getRepresentatives,
    getDocuments,
    getLogos,
  }
}
