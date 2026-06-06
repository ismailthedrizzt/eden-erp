'use client'

import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { contractService } from '@/lib/services/contracts'

export function ContractObligationsPanel({ contractId }: { contractId: string }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    contractService.obligations(contractId).then(setItems).finally(() => setLoading(false))
  }, [contractId])

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">Y?k?ml?l?kler</h2>
        <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-slate-300 opacity-60" disabled>
          <Plus className="h-4 w-4" />
          Ekle
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {loading ? <div className="text-sm text-slate-400">Y?k?ml?l?kler y?kleniyor.</div> : items.length ? items.map(item => (
          <div key={String(item.id)} className="rounded-md border border-white/10 bg-slate-950/40 p-3">
            <div className="font-semibold text-slate-100">{String(item.title || '-')}</div>
            <div className="mt-1 text-sm text-slate-400">{String(item.status || 'open')} ? {String(item.due_date || '-')}</div>
          </div>
        )) : <div className="text-sm text-slate-400">A??k y?k?ml?l?k yok.</div>}
      </div>
    </div>
  )
}
