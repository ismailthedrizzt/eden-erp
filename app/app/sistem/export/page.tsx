'use client'



import { appSistemExportListContract } from '@/contracts/pages/generated/app-sistem-export.list.contract'
import { appSistemExportWizardContract } from '@/contracts/pages/generated/app-sistem-export.wizard.contract'
import { appSistemExportLifecycleContract } from '@/contracts/pages/generated/app-sistem-export.lifecycle.contract'

void appSistemExportListContract
void appSistemExportWizardContract
void appSistemExportLifecycleContract

import { appSistemExportPageContract } from '@/contracts/pages/generated/app-sistem-export.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemExportContractReady = requirePageContract(appSistemExportPageContract)
void appSistemExportContractReady

import { useMemo, useState } from 'react'
import { Download, FileDown, Loader2, PlayCircle, ShieldCheck } from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { bulkService, exportService, type BulkActionJob, type ExportJob } from '@/lib/services/importExport'

type ToastState = { type: ToastType; title?: string; message: string }

const exportDatasets = [
  { key: 'company', label: 'Sirket listesi', columns: ['trade_name', 'tax_number', 'city', 'record_status'] },
  { key: 'partner', label: 'Ortak listesi', columns: ['display_name', 'partner_type', 'status', 'record_status'] },
  { key: 'representative', label: 'Temsilci listesi', columns: ['display_name', 'full_name', 'email', 'phone', 'status'] },
  { key: 'branch', label: 'Sube listesi', columns: ['branch_name', 'branch_type', 'city', 'status'] },
  { key: 'cari_account', label: 'Cari kartlar', columns: ['account_code', 'account_name', 'cari_role', 'tax_number', 'currency'] },
  { key: 'cari_transaction', label: 'Cari hareketler', columns: ['transaction_date', 'transaction_type', 'debit', 'credit', 'status'] },
  { key: 'employee', label: 'Calisanlar', columns: ['employee_no', 'full_name', 'email', 'employment_status'] },
  { key: 'product_catalog', label: 'Urun katalogu', columns: ['product_code', 'product_name', 'product_type', 'brand', 'active'] },
  { key: 'installed_asset', label: 'Kurulu urunler', columns: ['asset_tag', 'customer_name', 'serial_number', 'status'] },
  { key: 'service_request', label: 'Servis talepleri', columns: ['request_no', 'customer_name', 'title', 'status'] },
  { key: 'stakeholder', label: 'Paydaslar', columns: ['display_name', 'stakeholder_type', 'relationship_status'] },
  { key: 'project_task', label: 'Gorevler', columns: ['issue_key', 'title', 'status', 'assignee_user_id'] },
  { key: 'audit_log', label: 'Audit reports', columns: ['module_key', 'entity_type', 'action_key', 'result_status', 'created_at'] },
]

const bulkActions = [
  { key: 'passivate_selected', label: 'Secili kayitlari pasife al', moduleKey: 'accounting', entityType: 'cari_account', defaultPayload: '{}' },
  { key: 'task.assign', label: 'Secili tasklari ata', moduleKey: 'project_management', entityType: 'project_task', defaultPayload: '{ "assignee_user_id": "" }' },
  { key: 'task.transition', label: 'Secili task status degistir', moduleKey: 'project_management', entityType: 'project_task', defaultPayload: '{ "status": "in_progress" }' },
  { key: 'cari.add_tags', label: 'Cari kartlara etiket ekle', moduleKey: 'accounting', entityType: 'cari_account', defaultPayload: '{ "tags": ["vip"] }' },
  { key: 'stakeholder.assign_owner', label: 'Paydas sorumlusu ata', moduleKey: 'crm', entityType: 'stakeholder', defaultPayload: '{ "assigned_owner_user_id": "" }' },
  { key: 'product.set_active', label: 'Urun aktif/pasif yap', moduleKey: 'product_services', entityType: 'product_catalog', defaultPayload: '{ "active": false }' },
  { key: 'facility.update_metadata', label: 'Facility status/tag update', moduleKey: 'facilities', entityType: 'facility', defaultPayload: '{ "record_status": "passive", "tags": [] }' },
  { key: 'employee.update_notes', label: 'Calisan not/etiket update', moduleKey: 'hr', entityType: 'employee', defaultPayload: '{ "notes": "" }' },
]

export default function DataExportPage() {
  const [selectedDataset, setSelectedDataset] = useState(exportDatasets[0].key)
  const [search, setSearch] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [columns, setColumns] = useState<string[]>(exportDatasets[0].columns)
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const [bulkActionKey, setBulkActionKey] = useState(bulkActions[0].key)
  const [selectedIdsText, setSelectedIdsText] = useState('')
  const [bulkPayloadText, setBulkPayloadText] = useState(bulkActions[0].defaultPayload)
  const [bulkJob, setBulkJob] = useState<BulkActionJob | null>(null)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const dataset = useMemo(() => exportDatasets.find(item => item.key === selectedDataset) || exportDatasets[0], [selectedDataset])
  const bulkAction = useMemo(() => bulkActions.find(item => item.key === bulkActionKey) || bulkActions[0], [bulkActionKey])

  async function createExport() {
    setWorking(true)
    try {
      const job = await exportService.createJob({
        entity_type: dataset.key,
        filters: { search, company_id: companyId },
        columns,
        file_type: 'csv',
      })
      setJobs(current => [job, ...current.filter(item => item.id !== job.id)])
      setToast({ type: 'success', title: 'Export Hazir', message: `${job.row_count || 0} satir CSV olarak hazirlandi.` })
    } catch (error) {
      setToast({ type: 'error', title: 'Export Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function createBulkJob() {
    const selectedIds = selectedIdsText.split(/[\s,;]+/).map(value => value.trim()).filter(Boolean)
    if (!selectedIds.length) {
      setToast({ type: 'warning', title: 'Kayit Secin', message: 'Bulk action icin en az bir kayit id girilmelidir.' })
      return
    }
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(bulkPayloadText || '{}') as Record<string, unknown>
    } catch {
      setToast({ type: 'warning', title: 'Payload Gecersiz', message: 'Payload JSON formatinda olmalidir.' })
      return
    }
    setWorking(true)
    try {
      const job = await bulkService.createJob({
        module_key: bulkAction.moduleKey,
        entity_type: bulkAction.entityType,
        action_key: bulkAction.key,
        selected_ids: selectedIds,
        payload,
      })
      setBulkJob(job)
      setToast({ type: 'success', title: 'Bulk Dry-run Hazir', message: `${job.total_count || 0} kayit onay bekliyor.` })
    } catch (error) {
      setToast({ type: 'error', title: 'Bulk Hazirlanamadi', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function confirmBulkJob() {
    if (!bulkJob) return
    setWorking(true)
    try {
      const confirmed = await bulkService.confirm(bulkJob.id, bulkJob.total_count || undefined)
      const report = await bulkService.report(confirmed.id)
      setBulkJob(report)
      setToast({ type: confirmed.failed_count ? 'warning' : 'success', title: 'Bulk Tamamlandi', message: bulkMessage(confirmed) })
    } catch (error) {
      setToast({ type: 'error', title: 'Bulk Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <FileDown className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Data Export / Bulk Operations</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Scope, permission, masking ve audit kurallariyla CSV export ve kontrollu bulk action.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Export Job</h2>
              <button type="button" disabled={working} onClick={createExport} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                Export
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Veri seti</span>
                <select value={dataset.key} onChange={event => { const next = exportDatasets.find(item => item.key === event.target.value) || exportDatasets[0]; setSelectedDataset(next.key); setColumns(next.columns) }} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                  {exportDatasets.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </label>
              <TextInput label="Arama" value={search} onChange={setSearch} placeholder="Filtre" />
              <TextInput label="Sirket ID" value={companyId} onChange={setCompanyId} placeholder="Scope filtresi" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {dataset.columns.map(column => (
                <label key={column} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <input type="checkbox" checked={columns.includes(column)} onChange={event => setColumns(current => event.target.checked ? [...current, column] : current.filter(item => item !== column))} />
                  {column}
                </label>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Hassas alanlar ek yetki yoksa maskelenir; export olusturma ve indirme auditlenir.
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-4 text-base font-semibold">Son Export Jobs</h2>
            <div className="space-y-3">
              {jobs.length ? jobs.map(job => (
                <div key={job.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{job.entity_type}</div>
                      <div className="text-xs text-muted-foreground">{job.status} - {job.row_count || 0} satir</div>
                    </div>
                    {job.status === 'completed' ? (
                      <a href={exportService.downloadUrl(job.id)} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-2 text-xs hover:bg-muted">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        CSV
                      </a>
                    ) : null}
                  </div>
                </div>
              )) : <EmptyBox text="Export job yok." />}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Bulk Action Guard</h2>
              <p className="text-sm text-muted-foreground">Permission, scope, field control, record status, integrity ve max batch kontrolleri backend tarafinda uygulanir.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={working} onClick={createBulkJob} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Dry-run
              </button>
              <button type="button" disabled={!bulkJob || bulkJob.status !== 'ready_to_confirm' || working} onClick={confirmBulkJob} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
                Onayla
              </button>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Action</span>
              <select value={bulkAction.key} onChange={event => { const next = bulkActions.find(item => item.key === event.target.value) || bulkActions[0]; setBulkActionKey(next.key); setBulkPayloadText(next.defaultPayload); setBulkJob(null) }} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                {bulkActions.map(action => <option key={action.key} value={action.key}>{action.label}</option>)}
              </select>
            </label>
            <label className="block text-sm lg:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Selected IDs</span>
              <textarea value={selectedIdsText} onChange={event => setSelectedIdsText(event.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="uuid, uuid, uuid" />
            </label>
            <label className="block text-sm lg:col-span-3">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Payload JSON</span>
              <textarea value={bulkPayloadText} onChange={event => setBulkPayloadText(event.target.value)} rows={4} className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary" />
            </label>
          </div>
          {bulkJob ? <BulkResult job={bulkJob} /> : null}
        </section>
      </div>
    </main>
  )
}

function BulkResult({ job }: { job: BulkActionJob }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-background p-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="Status" value={job.status} />
        <Metric label="Total" value={job.total_count || 0} />
        <Metric label="Success" value={job.success_count || 0} tone="emerald" />
        <Metric label="Failed" value={job.failed_count || 0} tone="red" />
        <Metric label="Skipped" value={job.skipped_count || 0} tone="amber" />
      </div>
      {job.results?.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Entity</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Error</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {job.results.map(result => <tr key={result.entity_id}><td className="px-3 py-2 font-mono text-xs">{result.entity_id}</td><td className="px-3 py-2">{result.status}</td><td className="px-3 py-2 text-muted-foreground">{result.error || '-'}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
    </label>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: 'emerald' | 'red' | 'amber' }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 truncate text-lg font-semibold', tone === 'emerald' && 'text-emerald-700 dark:text-emerald-300', tone === 'red' && 'text-red-700 dark:text-red-300', tone === 'amber' && 'text-amber-700 dark:text-amber-300')}>{value}</div>
    </div>
  )
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">{text}</div>
}

function bulkMessage(job: BulkActionJob) {
  return `${job.success_count || 0} success, ${job.failed_count || 0} failed, ${job.skipped_count || 0} skipped.`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Islem tamamlanamadi.'
}
