'use client'

import type { ReportingFilter } from '@/lib/services/reporting'

export function ReportFilters({ filters, onChange }: { filters: ReportingFilter; onChange: (filters: ReportingFilter) => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-5">
      <input className={inputClass} value={filters.company_id || ''} onChange={event => onChange({ ...filters, company_id: event.target.value || null })} placeholder="Şirket ID" />
      <input className={inputClass} value={filters.status || ''} onChange={event => onChange({ ...filters, status: event.target.value || null })} placeholder="Durum" />
      <input className={inputClass} type="date" value={filters.date_from || ''} onChange={event => onChange({ ...filters, date_from: event.target.value || null })} />
      <input className={inputClass} type="date" value={filters.date_to || ''} onChange={event => onChange({ ...filters, date_to: event.target.value || null })} />
      <select className={inputClass} value={filters.page_size || 50} onChange={event => onChange({ ...filters, page_size: Number(event.target.value) })}>
        <option value={25}>25 satır</option>
        <option value={50}>50 satır</option>
        <option value={100}>100 satır</option>
      </select>
    </div>
  )
}

const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-300/20'
