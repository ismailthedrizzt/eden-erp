'use client'

import { FilePlus2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ContractStatusBadge } from './ContractStatusBadge'
import { CONTRACT_TYPE_LABELS, contractService, type ContractRecord } from '@/lib/services/contracts'

function money(value: unknown, currency?: string | null) {
  if (value === null || value === undefined || value === '') return '-'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return `${numeric.toLocaleString('tr-TR')} ${currency || ''}`.trim()
}

export function ContractsList() {
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const result = await contractService.list(params)
      setContracts(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'S?zle?meler y?klenemedi.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const kpis = useMemo(() => ({
    total: contracts.length,
    active: contracts.filter(item => item.status === 'active').length,
    due: contracts.filter(item => item.renewal_date).length,
    risky: contracts.filter(item => item.risk_level === 'high' || item.risk_level === 'critical').length,
  }), [contracts])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Toplam" value={kpis.total} />
        <Metric label="Aktif" value={kpis.active} />
        <Metric label="Yenileme Takibi" value={kpis.due} />
        <Metric label="Y?ksek Risk" value={kpis.risky} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="S?zle?me no, ba?l?k veya kar?? taraf" className="min-h-10 flex-1 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
        <button type="button" onClick={load} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-slate-200 hover:bg-white/10">
          <RefreshCw className="h-4 w-4" />
          Yenile
        </button>
        <Link href="/app/sozlesmeler/yeni" className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-500 px-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
          <FilePlus2 className="h-4 w-4" />
          Yeni
        </Link>
      </div>

      {error ? <div className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}

      <div className="overflow-hidden rounded-md border border-white/10">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-3">S?zle?me No</th>
              <th className="px-3 py-3">Ba?l?k</th>
              <th className="px-3 py-3">T?r</th>
              <th className="px-3 py-3">Kar?? Taraf</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3">Ba?lang??</th>
              <th className="px-3 py-3">Biti?</th>
              <th className="px-3 py-3">Yenileme</th>
              <th className="px-3 py-3">Tutar</th>
              <th className="px-3 py-3">Risk</th>
              <th className="px-3 py-3">Belge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">S?zle?meler y?kleniyor.</td></tr>
            ) : contracts.length ? contracts.map(contract => (
              <tr key={contract.id} className="hover:bg-white/[0.03]">
                <td className="px-3 py-3 font-mono text-xs text-slate-300">{contract.contract_no || '-'}</td>
                <td className="px-3 py-3"><Link className="font-semibold text-cyan-200 hover:text-cyan-100" href={`/app/sozlesmeler/${contract.id}`}>{contract.contract_title}</Link></td>
                <td className="px-3 py-3 text-slate-300">{contract.contract_type_label || CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type}</td>
                <td className="px-3 py-3 text-slate-300">{contract.counterparty_name || '-'}</td>
                <td className="px-3 py-3"><ContractStatusBadge status={contract.status} /></td>
                <td className="px-3 py-3 text-slate-300">{contract.start_date || '-'}</td>
                <td className="px-3 py-3 text-slate-300">{contract.end_date || '-'}</td>
                <td className="px-3 py-3 text-slate-300">{contract.renewal_date || '-'}</td>
                <td className="px-3 py-3 text-slate-300">{money(contract.contract_value, contract.currency)}</td>
                <td className="px-3 py-3 text-slate-300">{contract.risk_level || '-'}</td>
                <td className="px-3 py-3 text-slate-300">{contract.document_count || 0}</td>
              </tr>
            )) : (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">Hen?z s?zle?me tasla?? yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.03] p-3"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div></div>
}
