'use client'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, Loader2, RefreshCw, ShieldCheck, Upload, type LucideIcon } from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { importService, type ImportColumnRule, type ImportJob, type ImportTemplate } from '@/lib/services/importExport'

type ToastState = { type: ToastType; title?: string; message: string }

const wizardSteps = [
  'Veri Seti',
  'Dosya',
  'Mapping',
  'Validation',
  'Preview',
  'Import',
  'Rapor',
]

export default function DataImportPage() {
  const [templates, setTemplates] = useState<ImportTemplate[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [job, setJob] = useState<ImportJob | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const selectedTemplate = useMemo(
    () => templates.find(template => template.template_key === selectedKey) || templates[0] || null,
    [selectedKey, templates]
  )

  useEffect(() => {
    if (!selectedTemplate && templates.length) setSelectedKey(templates[0].template_key)
  }, [selectedTemplate, templates])

  const rules = useMemo(() => selectedTemplate ? uniqueRules(selectedTemplate) : [], [selectedTemplate])
  const sourceColumns = useMemo(() => job?.source_file_ref?.columns || [], [job])
  const sampleRows = useMemo(() => job?.source_file_ref?.sample_rows || selectedTemplate?.sample_rows || [], [job, selectedTemplate])
  const currentStep = stepForStatus(job?.status)

  async function loadTemplates() {
    setLoading(true)
    try {
      const data = await importService.listTemplates()
      setTemplates(data)
      setSelectedKey(current => current || data[0]?.template_key || '')
    } catch (error) {
      setToast({ type: 'error', title: 'Sablonlar Yuklenemedi', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  async function handleFile(file: File | null) {
    if (!file || !selectedTemplate) return
    setWorking(true)
    try {
      const nextJob = await importService.createJob({
        module_key: selectedTemplate.module_key,
        entity_type: selectedTemplate.entity_type,
        import_type: 'create',
        template_key: selectedTemplate.template_key,
      })
      const uploaded = await importService.uploadFile(nextJob.id, file)
      setJob(uploaded)
      setMapping(uploaded.field_mapping || {})
      setToast({ type: 'success', title: 'Dosya Yuklendi', message: `${uploaded.total_rows || 0} satir parse edildi.` })
    } catch (error) {
      setToast({ type: 'error', title: 'Yukleme Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function validateJob() {
    if (!job) return
    setWorking(true)
    try {
      const validated = await importService.validate(job.id, mapping)
      setJob(validated)
      setMapping(validated.field_mapping || mapping)
      setToast({ type: validated.invalid_rows ? 'warning' : 'success', title: 'Validation Tamamlandi', message: validationMessage(validated) })
    } catch (error) {
      setToast({ type: 'error', title: 'Validation Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function confirmJob() {
    if (!job) return
    setWorking(true)
    try {
      const confirmed = await importService.confirm(job.id, { import_valid_rows_only: true, skip_duplicates: true })
      setJob(confirmed)
      setToast({ type: confirmed.failed_rows ? 'warning' : 'success', title: 'Import Tamamlandi', message: importResultMessage(confirmed) })
    } catch (error) {
      setToast({ type: 'error', title: 'Import Basarisiz', message: errorMessage(error) })
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
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Data Import</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Sablon, mapping, validation, dry-run ve onay adimlariyla master data aktarimi.
              </p>
            </div>
          </div>
          <button type="button" onClick={loadTemplates} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Yenile
          </button>
        </header>

        <section className="grid gap-2 md:grid-cols-7">
          {wizardSteps.map((step, index) => (
            <div key={step} className={cn('rounded-md border px-3 py-2 text-sm', index <= currentStep ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground')}>
              <span className="mr-2 font-mono text-xs">{index + 1}</span>{step}
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Veri Seti ve Dosya</h2>
                <p className="text-sm text-muted-foreground">Import job dosya yuklemeden sonra otomatik yazmaz; once validation gerekir.</p>
              </div>
              {selectedTemplate ? (
                <a href={importService.templateDownloadUrl(selectedTemplate.template_key)} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Sablon
                </a>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Veri seti</span>
                <select value={selectedTemplate?.template_key || ''} onChange={event => { setSelectedKey(event.target.value); setJob(null); setMapping({}) }} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                  {templates.map(template => <option key={template.template_key} value={template.template_key}>{template.label}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">CSV / XLSX</span>
                <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={!selectedTemplate || working} onChange={event => handleFile(event.target.files?.[0] || null)} className="block h-10 w-full rounded-md border border-border bg-background text-sm file:mr-3 file:h-full file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium" />
              </label>
            </div>

            {selectedTemplate ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoTile label="Modul" value={selectedTemplate.module_key} />
                <InfoTile label="Entity" value={selectedTemplate.entity_type} />
                <InfoTile label="Kontrollu alan" value={String(selectedTemplate.operation_controlled_fields?.length || 0)} />
              </div>
            ) : loading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Yukleniyor</div>
            ) : null}
          </div>

          <StatusPanel job={job} working={working} />
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Alan Esleme</h2>
              <p className="text-sm text-muted-foreground">Required alanlar bos kalirsa validation blocking olur.</p>
            </div>
            <button type="button" disabled={!job || working} onClick={validateJob} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              Validate
            </button>
          </div>

          {job ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Hedef alan</th>
                    <th className="px-3 py-2">Tip</th>
                    <th className="px-3 py-2">Kaynak kolon</th>
                    <th className="px-3 py-2">Kural</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.map(rule => (
                    <tr key={rule.field}>
                      <td className="px-3 py-2 font-medium">{rule.label}<span className="ml-2 font-mono text-xs text-muted-foreground">{rule.field}</span></td>
                      <td className="px-3 py-2 text-muted-foreground">{rule.data_type || 'string'}</td>
                      <td className="px-3 py-2">
                        <select value={mapping[rule.field] || ''} onChange={event => setMapping(current => ({ ...current, [rule.field]: event.target.value }))} className="h-9 w-full min-w-48 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary">
                          <option value="">Secilmedi</option>
                          {sourceColumns.map(column => <option key={column} value={column}>{column}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">{rule.required ? <Badge tone="amber">Required</Badge> : <Badge tone="muted">Optional</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Upload} text="Dosya yuklenince mapping onerileri burada gorunur." />
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Preview</h2>
            {sampleRows.length ? <PreviewTable rows={sampleRows} /> : <EmptyState icon={FileSpreadsheet} text="Sablon veya dosya ornek satiri yok." />}
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">Dry-run / Rapor</h2>
            <DryRunPanel job={job} onConfirm={confirmJob} working={working} />
          </div>
        </section>
      </div>
    </main>
  )
}

function StatusPanel({ job, working }: { job: ImportJob | null; working: boolean }) {
  return (
    <aside className="rounded-md border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Job Durumu</h2>
        {working ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
      </div>
      {job ? (
        <div className="grid grid-cols-2 gap-3">
          <InfoTile label="Status" value={job.status} />
          <InfoTile label="Toplam" value={job.total_rows || 0} />
          <InfoTile label="Valid" value={job.valid_rows || 0} tone="emerald" />
          <InfoTile label="Invalid" value={job.invalid_rows || 0} tone="red" />
          <InfoTile label="Duplicate" value={job.duplicate_rows || 0} tone="amber" />
          <InfoTile label="Warning" value={job.warning_rows || 0} tone="amber" />
        </div>
      ) : (
        <EmptyState icon={FileSpreadsheet} text="Aktif import job yok." />
      )}
    </aside>
  )
}

function DryRunPanel({ job, onConfirm, working }: { job: ImportJob | null; onConfirm: () => void; working: boolean }) {
  const messages = Array.isArray(job?.dry_run_result?.messages) ? job?.dry_run_result?.messages as string[] : []
  return (
    <div className="space-y-4">
      {job?.dry_run_result ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile label="Create" value={String(job.dry_run_result.create_rows || 0)} tone="emerald" />
          <InfoTile label="Skip duplicate" value={String(job.dry_run_result.skip_duplicate_rows || 0)} tone="amber" />
          <InfoTile label="Skip invalid" value={String(job.dry_run_result.skip_invalid_rows || 0)} tone="red" />
        </div>
      ) : <EmptyState icon={ShieldCheck} text="Validation sonrasi dry-run ozeti gorunur." />}
      {messages.length ? <ul className="space-y-2 text-sm text-muted-foreground">{messages.map(message => <li key={message} className="rounded-md border border-border bg-background px-3 py-2">{message}</li>)}</ul> : null}
      <div className="flex flex-wrap gap-2">
        {job?.error_report_file_ref && Object.keys(job.error_report_file_ref).length ? (
          <a href={importService.errorReportUrl(job.id)} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted">
            <Download className="h-4 w-4" aria-hidden="true" />
            Hata Raporu
          </a>
        ) : null}
        <button type="button" disabled={!job || job.status !== 'ready_to_import' || working} onClick={onConfirm} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          Onayla
        </button>
      </div>
      {job?.status === 'completed' ? <ResultStrip job={job} /> : null}
    </div>
  )
}

function PreviewTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Object.keys(rows[0] || {}).slice(0, 8)
  return (
    <div className="max-h-80 overflow-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 border-b border-border bg-card text-xs uppercase text-muted-foreground">
          <tr>{columns.map(column => <th key={column} className="px-3 py-2">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.slice(0, 8).map((row, index) => (
            <tr key={index}>
              {columns.map(column => <td key={column} className="max-w-56 truncate px-3 py-2 text-muted-foreground">{String(row[column] ?? '-')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResultStrip({ job }: { job: ImportJob }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
      Import sonucu: {job.imported_rows || 0} imported, {job.skipped_rows || 0} skipped, {job.failed_rows || 0} failed.
    </div>
  )
}

function InfoTile({ label, value, tone }: { label: string; value: string | number; tone?: 'emerald' | 'red' | 'amber' }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 truncate text-lg font-semibold', tone === 'emerald' && 'text-emerald-700 dark:text-emerald-300', tone === 'red' && 'text-red-700 dark:text-red-300', tone === 'amber' && 'text-amber-700 dark:text-amber-300')}>{value}</div>
    </div>
  )
}

function Badge({ children, tone }: { children: string; tone: 'amber' | 'muted' }) {
  return <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium', tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200' : 'bg-muted text-muted-foreground')}>{children}</span>
}

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" aria-hidden="true" />{text}</span>
    </div>
  )
}

function uniqueRules(template: ImportTemplate): ImportColumnRule[] {
  const map = new Map<string, ImportColumnRule>()
  for (const rule of [...template.required_columns, ...template.optional_columns]) map.set(rule.field, rule)
  return [...map.values()]
}

function stepForStatus(status?: string | null) {
  if (!status) return 0
  if (status === 'uploaded' || status === 'mapping_required') return 2
  if (status === 'validating') return 3
  if (status === 'validation_failed') return 4
  if (status === 'ready_to_import') return 5
  if (status === 'importing') return 5
  if (status === 'completed' || status === 'failed' || status === 'cancelled') return 6
  return 1
}

function validationMessage(job: ImportJob) {
  return `${job.valid_rows || 0} valid, ${job.invalid_rows || 0} invalid, ${job.duplicate_rows || 0} duplicate.`
}

function importResultMessage(job: ImportJob) {
  return `${job.imported_rows || 0} imported, ${job.skipped_rows || 0} skipped, ${job.failed_rows || 0} failed.`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Islem tamamlanamadi.'
}
