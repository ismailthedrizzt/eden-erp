'use client'

import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CONTRACT_TYPE_LABELS, contractService, type ContractRecord } from '@/lib/services/contracts'

type Props = { contract?: ContractRecord }

export function ContractForm({ contract }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>({
    contract_title: String(contract?.contract_title || ''),
    contract_type: String(contract?.contract_type || 'sales_contract'),
    counterparty_name: String(contract?.counterparty_name || ''),
    start_date: String(contract?.start_date || ''),
    end_date: String(contract?.end_date || ''),
    renewal_date: String(contract?.renewal_date || ''),
    contract_value: String(contract?.contract_value || ''),
    currency: String(contract?.currency || 'TRY'),
    owner_user_id: String(contract?.owner_user_id || ''),
    responsible_department: String(contract?.responsible_department || ''),
    risk_level: String(contract?.risk_level || 'medium'),
    description: String(contract?.description || ''),
    notes: String(contract?.notes || ''),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(key: string, value: string) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))
      const row = contract ? await contractService.update(contract.id, payload) : await contractService.create(payload)
      router.push(`/app/sozlesmeler/${row.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'S?zle?me kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
      {error ? <div className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Ba?l?k" value={form.contract_title} onChange={value => update('contract_title', value)} required />
        <label className="space-y-1 text-sm text-slate-300">T?r
          <select value={form.contract_type} onChange={event => update('contract_type', event.target.value)} className="min-h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-slate-100">
            {Object.entries(CONTRACT_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <Field label="Kar?? Taraf" value={form.counterparty_name} onChange={value => update('counterparty_name', value)} />
        <Field label="Sorumlu Departman" value={form.responsible_department} onChange={value => update('responsible_department', value)} />
        <Field label="Ba?lang??" type="date" value={form.start_date} onChange={value => update('start_date', value)} />
        <Field label="Biti?" type="date" value={form.end_date} onChange={value => update('end_date', value)} />
        <Field label="Yenileme Tarihi" type="date" value={form.renewal_date} onChange={value => update('renewal_date', value)} />
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <Field label="Tutar" type="number" value={form.contract_value} onChange={value => update('contract_value', value)} />
          <Field label="Para Birimi" value={form.currency} onChange={value => update('currency', value)} />
        </div>
        <label className="space-y-1 text-sm text-slate-300">Risk
          <select value={form.risk_level} onChange={event => update('risk_level', event.target.value)} className="min-h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-slate-100">
            <option value="low">D???k</option><option value="medium">Orta</option><option value="high">Y?ksek</option><option value="critical">Kritik</option>
          </select>
        </label>
      </div>
      <Textarea label="A??klama" value={form.description} onChange={value => update('description', value)} />
      <Textarea label="Notlar" value={form.notes} onChange={value => update('notes', value)} />
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">
          <Save className="h-4 w-4" />
          {saving ? 'Kaydediliyor' : contract ? 'G?ncelle' : 'Taslak Olu?tur'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="space-y-1 text-sm text-slate-300">{label}<input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} className="min-h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-slate-100 outline-none focus:border-cyan-400" /></label>
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-sm text-slate-300">{label}<textarea value={value} onChange={event => onChange(event.target.value)} rows={3} className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400" /></label>
}
