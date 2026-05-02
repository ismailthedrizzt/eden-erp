'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Birim, NormKadro } from '@/types'

export function useTeskilat() {
  const [birimler, setBirimler] = useState<Birim[]>([])
  const [kadrolar, setKadrolar] = useState<NormKadro[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const [{ data: b }, { data: k }] = await Promise.all([
        supabase.from('birimler').select('*').order('ad'),
        supabase.from('norm_kadrolar').select('*, personel:employees(id,ad,soyad)').order('unvan'),
      ])
      setBirimler(b ?? [])
      setKadrolar(k ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  // Ağaç yapısı oluştur
  function buildTree(parentId: string | null = null): Birim[] {
    return birimler
      .filter(b => (b.ust_birim_id ?? null) === parentId)
      .map(b => ({ ...b, alt_birimler: buildTree(b.id), kadrolar: kadrolar.filter(k => k.birim_id === b.id) }))
  }

  const dolu   = kadrolar.filter(k => k.durum === 'dolu').length
  const acik   = kadrolar.filter(k => k.durum === 'acik').length
  const dolulukOrani = kadrolar.length ? Math.round((dolu / kadrolar.length) * 100) : 0

  return { birimler, kadrolar, loading, buildTree, dolu, acik, dolulukOrani }
}
