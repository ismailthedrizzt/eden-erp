'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ContractDetail } from './ContractDetail'
import { contractService, type ContractRecord } from '@/lib/services/contracts'

export function ContractDetailClient() {
  const params = useParams<{ id: string }>()
  const id = String(params.id || '')
  const [contract, setContract] = useState<ContractRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    contractService.get(id).then(setContract).catch(err => setError(err instanceof Error ? err.message : 'S?zle?me y?klenemedi.')).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="rounded-md border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">S?zle?me y?kleniyor.</div>
  if (error) return <div className="rounded-md border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{error}</div>
  if (!contract) return <div className="rounded-md border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">S?zle?me bulunamad?.</div>
  return <ContractDetail contract={contract} />
}
