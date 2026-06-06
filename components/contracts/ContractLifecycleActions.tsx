'use client'

import { Archive, PauseCircle, PlayCircle, RefreshCw, SquarePen, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { contractService, type ContractRecord } from '@/lib/services/contracts'

const ACTIONS = [
  { key: 'activate', label: 'Aktifle?tir', icon: PlayCircle },
  { key: 'renew', label: 'Yenile', icon: RefreshCw },
  { key: 'amend', label: 'Ek Protokol', icon: SquarePen },
  { key: 'suspend', label: 'Ask?ya Al', icon: PauseCircle },
  { key: 'terminate', label: 'Feshet', icon: XCircle },
  { key: 'archive', label: 'Ar?ivle', icon: Archive },
]

export function ContractLifecycleActions({ contract }: { contract: ContractRecord }) {
  const router = useRouter()
  const [active, setActive] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(action: string) {
    setActive(action)
    setMessage(null)
    setError(null)
    try {
      if (action !== 'archive') {
        const check = await contractService.precheck(contract.id, action)
        const blockers = Array.isArray(check.blockers) ? check.blockers : []
        if (blockers.length) {
          setError(blockers.join(' '))
          return
        }
      }
      await contractService.lifecycle(contract.id, action, { notes: 'Wizard MVP onay?.' })
      setMessage('??lem onayland?.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '??lem ba?ar?s?z.')
    } finally {
      setActive(null)
    }
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-base font-semibold text-slate-100">Resmi ??lemler</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button key={action.key} type="button" disabled={Boolean(active)} onClick={() => run(action.key)} className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-60">
              <Icon className="h-4 w-4" />
              {active === action.key ? 'Kontrol ediliyor' : action.label}
            </button>
          )
        })}
      </div>
      {message ? <div className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-500/10 p-2 text-sm text-emerald-100">{message}</div> : null}
      {error ? <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-500/10 p-2 text-sm text-amber-100">{error}</div> : null}
    </div>
  )
}
