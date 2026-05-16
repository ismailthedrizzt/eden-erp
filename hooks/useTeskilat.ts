'use client'

import { useState, useEffect, useRef } from 'react'
import { organizationService } from '@/lib/services/organizationService'
import type { Birim, NormKadro } from '@/types'

export function useTeskilat() {
  const [organization_units, setBirimler] = useState<Birim[]>([])
  const [positions, setPositions] = useState<NormKadro[]>([])
  const [loading, setLoading] = useState(true)
  const hasDataRef = useRef(false)

  useEffect(() => {
    async function fetch() {
      setLoading(previous => !hasDataRef.current ? true : previous)
      try {
        const result = await organizationService.list()
        setBirimler(result.organization_units ?? [])
        setPositions(result.positions ?? [])
        hasDataRef.current = true
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  function buildTree(parentId: string | null = null): Birim[] {
    return organization_units
      .filter(b => (b.parent_unit_id ?? null) === parentId)
      .map(b => ({ ...b, alt_birimler: buildTree(b.id), positions: positions.filter(k => k.unit_id === b.id) }))
  }

  const filled = positions.filter(k => k.status === 'filled').length
  const open = positions.filter(k => k.status === 'open').length
  const fillRate = positions.length ? Math.round((filled / positions.length) * 100) : 0

  return { organization_units, positions, loading, buildTree, filled, open, fillRate }
}
