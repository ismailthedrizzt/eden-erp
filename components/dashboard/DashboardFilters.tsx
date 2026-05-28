'use client'

import { Filter, RefreshCw } from 'lucide-react'
import type { ReportingFilter } from '@/lib/services/reporting'

export function DashboardFilters({
  filters,
  onChange,
  onRefresh,
}: {
  filters: ReportingFilter
  onChange: (filters: ReportingFilter) => void
  onRefresh: () => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Filter size={16} />
        Dashboard filtreleri
      </div>
      <div className="grid gap-3 md:grid-cols-6">
        <input className={inputClass} value={filters.company_id || ''} onChange={event => onChange({ ...filters, company_id: event.target.value || null })} placeholder="Şirket ID" />
        <input className={inputClass} value={filters.branch_id || ''} onChange={event => onChange({ ...filters, branch_id: event.target.value || null })} placeholder="Şube ID" />
        <select className={inputClass} value={filters.module_key || ''} onChange={event => onChange({ ...filters, module_key: event.target.value || null })}>
          <option value="">Tüm modüller</option>
          <option value="company">Şirketler</option>
          <option value="ownership">Ortaklık</option>
          <option value="representatives">Temsilciler</option>
          <option value="branches">Şubeler</option>
          <option value="accounting">Muhasebe</option>
          <option value="hr">İK</option>
          <option value="projects">Proje/Görev</option>
          <option value="after-sales">Satış Sonrası</option>
          <option value="crm">CRM</option>
          <option value="system">Sistem</option>
        </select>
        <input className={inputClass} type="date" value={filters.date_from || ''} onChange={event => onChange({ ...filters, date_from: event.target.value || null })} />
        <input className={inputClass} type="date" value={filters.date_to || ''} onChange={event => onChange({ ...filters, date_to: event.target.value || null })} />
        <button type="button" onClick={onRefresh} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950">
          <RefreshCw size={16} />
          Yenile
        </button>
      </div>
      <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={Boolean(filters.only_mine)} onChange={event => onChange({ ...filters, only_mine: event.target.checked })} />
        Sadece bana ait işler
      </label>
    </div>
  )
}

const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-300/20'
