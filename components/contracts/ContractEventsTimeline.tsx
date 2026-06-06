'use client'

import { useEffect, useState } from 'react'
import { contractService } from '@/lib/services/contracts'

export function ContractEventsTimeline({ contractId }: { contractId: string }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    contractService.events(contractId).then(setItems).finally(() => setLoading(false))
  }, [contractId])

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-base font-semibold text-slate-100">Lifecycle Ge?mi?i</h2>
      <div className="mt-3 space-y-2">
        {loading ? <div className="text-sm text-slate-400">Ge?mi? y?kleniyor.</div> : items.length ? items.map(item => (
          <div key={String(item.id)} className="rounded-md border border-white/10 bg-slate-950/40 p-3">
            <div className="font-semibold text-slate-100">{String(item.event_type || '-')}</div>
            <div className="mt-1 text-sm text-slate-400">{String(item.old_status || '-')} ? {String(item.new_status || '-')}</div>
            {item.notes ? <div className="mt-1 text-sm text-slate-300">{String(item.notes)}</div> : null}
          </div>
        )) : <div className="text-sm text-slate-400">Hen?z lifecycle kayd? yok.</div>}
      </div>
    </div>
  )
}
