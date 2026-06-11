'use client'



import { appSistemAuditListContract } from '@/contracts/pages/generated/app-sistem-audit.list.contract'

void appSistemAuditListContract

import { appSistemAuditPageContract } from '@/contracts/pages/generated/app-sistem-audit.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemAuditContractReady = requirePageContract(appSistemAuditPageContract)
void appSistemAuditContractReady

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Download,
  Filter,
  History,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { AuditDetailDrawer } from '@/components/audit/AuditDetailDrawer'
import { fetchAuditLogs, type AuditListFilters, type AuditListMeta } from '@/lib/audit/auditClient'
import type { AuditLogRecord } from '@/lib/audit/audit.types'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { cn } from '@/lib/utils'

const today = new Date()
const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

const initialFilters: AuditListFilters = {
  date_from: toDateInput(sevenDaysAgo),
  date_to: toDateInput(today),
  page: 1,
  pageSize: 50,
}

const reportPresets = [
  { key: 'user', label: 'Kullanici Islem Raporu', filters: {} },
  { key: 'official', label: 'Resmi Islemler', filters: { action_type: 'operation_complete' } },
  { key: 'authority', label: 'Yetki Denetimi', filters: { module_key: 'representatives' } },
  { key: 'ownership', label: 'Ortaklik Denetimi', filters: { module_key: 'ownership' } },
  { key: 'denied', label: 'Engellenen Islemler', filters: { result_status: 'denied' } },
  { key: 'system', label: 'Sistem Uyarilari', filters: { severity: 'error' } },
]

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditListFilters>(initialFilters)
  const [rows, setRows] = useState<AuditLogRecord[]>([])
  const [meta, setMeta] = useState<AuditListMeta>({ page: 1, pageSize: 50, count: 0, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AuditLogRecord | null>(null)

  useRegisterActionGuideContext({
    currentPage: 'audit',
    route: '/app/sistem/audit',
    availableModules: ['audit', 'process', 'action-center'],
    context: {
      suggestedActions: [
        'audit.show_record_history',
        'audit.filter_denied_attempts',
        'audit.open_compliance_report',
      ],
    },
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.size) return
    const next: AuditListFilters = { ...initialFilters }
    params.forEach((value, key) => {
      ;(next as Record<string, string | number | undefined>)[key] = value
    })
    setFilters(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAuditLogs(filters)
      .then(result => {
        if (cancelled) return
        setRows(result.data)
        setMeta(result.meta)
      })
      .catch(err => {
        if (cancelled) return
        setError(err?.message || 'Denetim izi okunamadi.')
        setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters])

  const summary = useMemo(() => {
    const denied = rows.filter(row => row.result_status === 'denied').length
    const failed = rows.filter(row => row.result_status === 'failed').length
    const warnings = rows.filter(row => row.severity === 'warning' || row.severity === 'error' || row.severity === 'critical').length
    return { denied, failed, warnings }
  }, [rows])

  const updateFilter = (key: keyof AuditListFilters, value: string) => {
    setFilters(current => ({ ...current, [key]: value || undefined, page: 1 }))
  }

  const applyPreset = (preset: (typeof reportPresets)[number]) => {
    setFilters(current => ({ ...initialFilters, ...current, ...preset.filters, page: 1 }))
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" data-tour-id="audit-header">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Denetim Izi</h1>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  Kim, ne zaman, hangi kayit uzerinde, hangi islem kapsaminda ne yapti sorusunu is diliyle izleyin.
                  Hassas veriler maskelenir; teknik ayrintilar yalnizca yetkili kullanicilar icindir.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
              title="Export P1 kapsaminda audit.export yetkisiyle aktif edilecek."
              disabled
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export hazirligi
            </button>
          </div>

          <section className="grid gap-3 md:grid-cols-5" data-tour-id="audit-summary">
            <SummaryCard icon={ClipboardList} label="Toplam kayit" value={meta.count} />
            <SummaryCard icon={AlertTriangle} label="Engellenen" value={summary.denied} tone="text-red-700 dark:text-red-300" />
            <SummaryCard icon={AlertTriangle} label="Basarisiz" value={summary.failed} tone="text-amber-700 dark:text-amber-300" />
            <SummaryCard icon={ShieldCheck} label="Uyari/Kritik" value={summary.warnings} tone="text-orange-700 dark:text-orange-300" />
            <SummaryCard icon={CalendarDays} label="Varsayilan aralik" value="7 gun" />
          </section>
        </header>

        <section className="grid gap-3 lg:grid-cols-5" data-tour-id="audit-reports">
          {reportPresets.map(preset => (
            <button
              key={preset.key}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-md border border-border bg-card p-3 text-left text-sm hover:bg-muted/50"
            >
              <div className="font-medium">{preset.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">Filtreli rapor gorunumu</div>
            </button>
          ))}
        </section>

        <section className="rounded-md border border-border bg-card p-4" data-tour-id="audit-filters">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filtreler
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FilterInput icon={Search} label="Arama" value={filters.search || ''} onChange={value => updateFilter('search', value)} placeholder="ozet, request id, kayit" />
            <FilterInput label="Kullanici" value={filters.user_id || ''} onChange={value => updateFilter('user_id', value)} placeholder="user id" />
            <FilterInput label="Modul" value={filters.module_key || ''} onChange={value => updateFilter('module_key', value)} placeholder="company, audit" />
            <FilterInput label="Islem" value={filters.action_type || ''} onChange={value => updateFilter('action_type', value)} placeholder="permission_denied" />
            <FilterSelect label="Sonuc" value={filters.result_status || ''} onChange={value => updateFilter('result_status', value)} options={['success', 'failed', 'denied', 'pending']} />
            <FilterSelect label="Onem" value={filters.severity || ''} onChange={value => updateFilter('severity', value)} options={['info', 'warning', 'error', 'critical']} />
            <FilterInput label="Sirket" value={filters.company_id || ''} onChange={value => updateFilter('company_id', value)} placeholder="company id" />
            <FilterInput label="Sube" value={filters.branch_id || ''} onChange={value => updateFilter('branch_id', value)} placeholder="branch id" />
            <FilterInput label="Kayit tipi" value={filters.entity_type || ''} onChange={value => updateFilter('entity_type', value)} placeholder="company" />
            <FilterInput label="Kayit ID" value={filters.entity_id || ''} onChange={value => updateFilter('entity_id', value)} placeholder="uuid" />
            <FilterInput label="Operation ID" value={filters.operation_id || ''} onChange={value => updateFilter('operation_id', value)} placeholder="uuid" />
            <FilterInput label="Process ID" value={filters.process_instance_id || ''} onChange={value => updateFilter('process_instance_id', value)} placeholder="uuid" />
            <FilterInput label="Baslangic" type="date" value={filters.date_from || ''} onChange={value => updateFilter('date_from', value)} />
            <FilterInput label="Bitis" type="date" value={filters.date_to || ''} onChange={value => updateFilter('date_to', value)} />
            <FilterSelect label="Sayfa boyutu" value={String(filters.pageSize || 50)} onChange={value => setFilters(current => ({ ...current, pageSize: Number(value), page: 1 }))} options={['25', '50', '100']} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setFilters(initialFilters)} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted">
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Sifirla
            </button>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card" data-tour-id="audit-list">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h2 className="text-base font-semibold">Audit kayitlari</h2>
              <p className="text-sm text-muted-foreground">History, transaction ve process olaylarindan farkli olarak denetim amacli iz kayitlari.</p>
            </div>
            <History className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          {error ? (
            <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</div>
          ) : loading ? (
            <div className="p-6 text-sm text-muted-foreground">Denetim izi yukleniyor...</div>
          ) : rows.length ? (
            <AuditTable rows={rows} onSelect={setSelected} />
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Denetim izi bulunamadi.</div>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm text-muted-foreground">
            <span>Sayfa {meta.page} / {meta.totalPages} - {meta.count} kayit</span>
            <div className="flex gap-2">
              <button type="button" disabled={meta.page <= 1} onClick={() => setFilters(current => ({ ...current, page: Math.max(1, Number(current.page || 1) - 1) }))} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Onceki</button>
              <button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setFilters(current => ({ ...current, page: Number(current.page || 1) + 1 }))} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Sonraki</button>
            </div>
          </footer>
        </section>
      </div>
      <AuditDetailDrawer record={selected} onClose={() => setSelected(null)} />
    </main>
  )
}

function AuditTable({ rows, onSelect }: { rows: AuditLogRecord[]; onSelect: (record: AuditLogRecord) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Tarih/Saat</th>
            <th className="px-4 py-3">Kullanici</th>
            <th className="px-4 py-3">Modul</th>
            <th className="px-4 py-3">Islem</th>
            <th className="px-4 py-3">Kayit</th>
            <th className="px-4 py-3">Sonuc</th>
            <th className="px-4 py-3">Onem</th>
            <th className="px-4 py-3">Aciklama</th>
            <th className="px-4 py-3">Request ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(row => (
            <tr key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(row)}>
              <td className="whitespace-nowrap px-4 py-3">{formatDate(row.created_at)}</td>
              <td className="max-w-44 truncate px-4 py-3">{row.user_label || row.user_id || 'Sistem'}</td>
              <td className="px-4 py-3">{row.module_key || '-'}</td>
              <td className="px-4 py-3">{row.action_key || row.action_type}</td>
              <td className="max-w-56 truncate px-4 py-3">{[row.entity_type, row.metadata_json?.record_label || row.entity_id].filter(Boolean).join(' / ') || '-'}</td>
              <td className="px-4 py-3"><Badge tone={resultTone(row.result_status)}>{resultLabel(row.result_status)}</Badge></td>
              <td className="px-4 py-3"><Badge tone={severityTone(row.severity)}>{severityLabel(row.severity)}</Badge></td>
              <td className="max-w-md truncate px-4 py-3 text-muted-foreground">{row.summary || row.reason || '-'}</td>
              <td className="max-w-40 truncate px-4 py-3 font-mono text-xs text-muted-foreground">{row.request_id || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof ClipboardList; label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <div className={cn('mt-2 text-xl font-semibold', tone)}>{value}</div>
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder, type = 'text', icon: Icon }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; icon?: typeof Search }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <span className="relative block">
        {Icon ? <Icon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /> : null}
        <input
          type={type}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn('h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary', Icon && 'pl-8')}
        />
      </span>
    </label>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
        <option value="">Tum</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Badge({ children, tone }: { children: string; tone: string }) {
  return <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium', tone)}>{children}</span>
}

function resultLabel(value?: string | null) {
  if (value === 'denied') return 'Reddedildi'
  if (value === 'failed') return 'Basarisiz'
  if (value === 'pending') return 'Bekliyor'
  return 'Basarili'
}

function severityLabel(value?: string | null) {
  if (value === 'critical') return 'Kritik'
  if (value === 'error') return 'Hata'
  if (value === 'warning') return 'Uyari'
  return 'Bilgi'
}

function resultTone(value?: string | null) {
  if (value === 'denied' || value === 'failed') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
  if (value === 'pending') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
}

function severityTone(value?: string | null) {
  if (value === 'critical' || value === 'error') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
  if (value === 'warning') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
  return 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('tr-TR')
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10)
}
