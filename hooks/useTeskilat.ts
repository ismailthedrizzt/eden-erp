'use client'

import { useState, useEffect } from 'react'
import { organizationService } from '@/lib/services/organizationService'
import type { Birim, NormKadro } from '@/types'

export function useTeskilat() {
  const [birimler, setBirimler] = useState<Birim[]>([])
  const [kadrolar, setKadrolar] = useState<NormKadro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const result = await organizationService.list()
        setBirimler(result.birimler ?? [])
        setKadrolar(result.kadrolar ?? [])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  function buildTree(parentId: string | null = null): Birim[] {
    return birimler
      .filter(b => (b.ust_birim_id ?? null) === parentId)
      .map(b => ({ ...b, alt_birimler: buildTree(b.id), kadrolar: kadrolar.filter(k => k.birim_id === b.id) }))
  }

  const dolu = kadrolar.filter(k => k.durum === 'dolu').length
  const acik = kadrolar.filter(k => k.durum === 'acik').length
  const dolulukOrani = kadrolar.length ? Math.round((dolu / kadrolar.length) * 100) : 0

  return { birimler, kadrolar, loading, buildTree, dolu, acik, dolulukOrani }
}
