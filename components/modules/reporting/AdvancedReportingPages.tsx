'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarClock,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  Pause,
  Pin,
  Play,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import {
  reportingCustomReports,
  reportingDashboardPreferences,
  reportingExportJobs,
  reportingReports,
  reportingSavedViews,
  reportingScheduledReports,
  type CustomReport,
  type ExportJob,
  type ReportDefinitionRecord,
  type SavedView,
  type ScheduledReport,
} from '@/lib/services/reporting'

type LoadState = 'idle' | 'loading' | 'saving'

const moduleOptions = ['companies', 'accounting', 'hr', 'project_management', 'after_sales', 'crm', 'audit', 'reporting']

export function AdvancedCustomReportsPage() {
  const [catalog, setCatalog] = useState<ReportDefinitionRecord[]>([])
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [customReports, setCustomReports] = useState<CustomReport[]>([])
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [selectedSource, setSelectedSource] = useState('company_360_status_report')
  const [savedViewName, setSavedViewName] = useState('Belge Takip Gorunumu')
  const [savedViewModule, setSavedViewModule] = useState('accounting')
  const [savedViewReport, setSavedViewReport] = useState('financial_document_gap_report')
  const [customReportName, setCustomReportName] = useState('Operasyon Risk Ozeti')
  const [customReportModule, setCustomReportModule] = useState('reporting')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>('idle')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const [catalogData, customData, viewData, jobData] = await Promise.all([
        reportingReports.catalog().catch(() => reportingReports.list()),
        reportingCustomReports.list({ page_size: 50 }),
        reportingSavedViews.list({ page_size: 50 }),
        reportingExportJobs.list({ page_size: 10 }),
      ])
      setCatalog(catalogData)
      setCustomReports(customData.items)
      setSavedViews(viewData.items)
      setExportJobs(jobData.items)
      setSelectedSource(current => current || catalogData[0]?.report_key || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gelismis raporlama verisi yuklenemedi.')
    } finally {
      setState('idle')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectedDefinition = useMemo(
    () => catalog.find(report => report.report_key === selectedSource) || catalog[0],
    [catalog, selectedSource]
  )

  async function createSavedView() {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      await reportingSavedViews.create({
        module_key: savedViewModule,
        report_key: savedViewReport,
        entity_type: 'report',
        view_name: savedViewName,
        visibility: 'private',
        filters_json: { date_from: monthStart(), date_to: today(), document_status: 'document_needed' },
        columns_json: [{ key: 'company_id' }, { key: 'document_status' }, { key: 'updated_at' }],
        sort_json: { key: 'updated_at', direction: 'desc' },
        group_by_json: [],
      })
      setMessage('Kayitli gorunum olusturuldu.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gorunum kaydedilemedi.')
    } finally {
      setState('idle')
    }
  }

  async function createCustomReport() {
    if (!selectedDefinition) return
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      await reportingCustomReports.create({
        report_key: toReportKey(customReportName),
        report_name: customReportName,
        module_key: customReportModule,
        report_type: 'table',
        source_type: 'predefined_report',
        source_key: selectedDefinition.report_key,
        columns_json: selectedDefinition.columns,
        default_filters_json: { date_from: monthStart(), date_to: today() },
        required_permissions: [selectedDefinition.required_permission],
        export_enabled: selectedDefinition.export_enabled,
        schedule_enabled: true,
      })
      setMessage('Ozel rapor tanimi olusturuldu.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ozel rapor olusturulamadi.')
    } finally {
      setState('idle')
    }
  }

  async function requestExport(reportKey: string) {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      await reportingReports.export(reportKey, { page: 1, page_size: 200, date_from: monthStart(), date_to: today() })
      setMessage('Export job olusturuldu. Hazir olunca bildirim uretilecek.')
      const jobData = await reportingExportJobs.list({ page_size: 10 })
      setExportJobs(jobData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export job olusturulamadi.')
    } finally {
      setState('idle')
    }
  }

  async function pinView(view: SavedView) {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      await reportingSavedViews.pin(view.id, !view.pinned)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gorunum pin durumu guncellenemedi.')
    } finally {
      setState('idle')
    }
  }

  async function deleteCustomReport(report: CustomReport) {
    setState('saving')
    setError(null)
    try {
      await reportingCustomReports.remove(report.id)
      setMessage('Ozel rapor pasife alindi.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ozel rapor pasife alinamadi.')
    } finally {
      setState('idle')
    }
  }

  async function saveDashboardPreference() {
    setState('saving')
    setError(null)
    try {
      await reportingDashboardPreferences.update({
        layout_json: [{ key: 'risk', order: 1 }, { key: 'reports', order: 2 }],
        hidden_widgets: ['hr.sensitive'],
        pinned_reports: ['operations_risk_report', 'company_360_status_report'],
        default_filters: { date_from: monthStart(), date_to: today() },
      })
      setMessage('Dashboard tercihleri kaydedildi.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard tercihleri kaydedilemedi.')
    } finally {
      setState('idle')
    }
  }

  return (
    <ReportingShell
      eyebrow="Advanced Reporting"
      title="Ozel Raporlar"
      description="Saved view, kolon secimi, whitelist kaynakli ozel rapor ve guvenli export job akislari."
      error={error}
      message={message}
      loading={state === 'loading'}
    >
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
        <Panel title="Ozel rapor olustur" icon={<FileSpreadsheet size={18} />}>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Kaynak rapor">
              <select className={inputClass} value={selectedSource} onChange={event => setSelectedSource(event.target.value)}>
                {catalog.map(report => <option key={report.report_key} value={report.report_key}>{report.title}</option>)}
              </select>
            </Field>
            <Field label="Modul">
              <select className={inputClass} value={customReportModule} onChange={event => setCustomReportModule(event.target.value)}>
                {moduleOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Rapor adi">
              <input className={inputClass} value={customReportName} onChange={event => setCustomReportName(event.target.value)} />
            </Field>
            <Field label="Guvenlik">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                Kaynak registry whitelist kontrollu. Serbest SQL yok.
              </div>
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} onClick={createCustomReport} disabled={state === 'saving' || !selectedDefinition}>
              {state === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Ozel Rapor Kaydet
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => requestExport(selectedDefinition?.report_key || 'operations_risk_report')} disabled={state === 'saving'}>
              <Download size={16} />
              Export Job
            </button>
            <button type="button" className={secondaryButtonClass} onClick={saveDashboardPreference} disabled={state === 'saving'}>
              <LayoutDashboard size={16} />
              Paneli Ozellestir
            </button>
          </div>
        </Panel>

        <Panel title="Kayitli gorunum" icon={<Save size={18} />}>
          <div className="grid gap-3">
            <Field label="Gorunum adi">
              <input className={inputClass} value={savedViewName} onChange={event => setSavedViewName(event.target.value)} />
            </Field>
            <Field label="Modul">
              <select className={inputClass} value={savedViewModule} onChange={event => setSavedViewModule(event.target.value)}>
                {moduleOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Rapor anahtari">
              <select className={inputClass} value={savedViewReport} onChange={event => setSavedViewReport(event.target.value)}>
                {catalog.map(report => <option key={report.report_key} value={report.report_key}>{report.title}</option>)}
              </select>
            </Field>
            <button type="button" className={primaryButtonClass} onClick={createSavedView} disabled={state === 'saving'}>
              <Save size={16} />
              Gorunum Kaydet
            </button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Benim ve paylasilan gorunumler" icon={<Pin size={18} />}>
          <div className="space-y-2">
            {savedViews.map(view => (
              <CompactRow key={view.id} title={view.view_name} detail={`${view.module_key} / ${view.report_key || 'liste'} / ${view.visibility}`}>
                <button type="button" className={iconButtonClass} onClick={() => pinView(view)} aria-label="Gorunumu pinle">
                  <Pin size={15} className={view.pinned ? 'fill-current' : ''} />
                </button>
              </CompactRow>
            ))}
            {savedViews.length === 0 && <EmptyLine text="Henuz kayitli gorunum yok." />}
          </div>
        </Panel>

        <Panel title="Ozel rapor katalogu" icon={<SlidersHorizontal size={18} />}>
          <div className="space-y-2">
            {customReports.map(report => (
              <CompactRow key={report.id} title={report.report_name} detail={`${report.report_key} / ${report.source_type}:${report.source_key}`}>
                <button type="button" className={iconButtonClass} onClick={() => requestExport(report.report_key)} aria-label="Export olustur">
                  <Download size={15} />
                </button>
                <button type="button" className={dangerIconButtonClass} onClick={() => deleteCustomReport(report)} aria-label="Raporu pasife al">
                  <Trash2 size={15} />
                </button>
              </CompactRow>
            ))}
            {customReports.length === 0 && <EmptyLine text="Ozel rapor tanimi yok." />}
          </div>
        </Panel>
      </section>

      <Panel title="Son export joblari" icon={<Download size={18} />}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Rapor</th>
                <th className="px-3 py-2">Format</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">Satir</th>
                <th className="px-3 py-2">Olusturma</th>
              </tr>
            </thead>
            <tbody>
              {exportJobs.map(job => (
                <tr key={job.id} className="border-t border-slate-200 dark:border-white/10">
                  <td className="px-3 py-2 font-medium">{job.report_key}</td>
                  <td className="px-3 py-2">{job.export_format}</td>
                  <td className="px-3 py-2"><StatusPill status={job.status} /></td>
                  <td className="px-3 py-2">{job.row_count ?? '-'}</td>
                  <td className="px-3 py-2">{formatDate(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {exportJobs.length === 0 && <EmptyLine text="Export job bulunmuyor." />}
        </div>
      </Panel>
    </ReportingShell>
  )
}

export function AdvancedScheduledReportsPage() {
  const [catalog, setCatalog] = useState<ReportDefinitionRecord[]>([])
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [schedules, setSchedules] = useState<ScheduledReport[]>([])
  const [reportKey, setReportKey] = useState('operations_risk_report')
  const [savedViewId, setSavedViewId] = useState('')
  const [scheduleName, setScheduleName] = useState('Haftalik Operasyon Risk Raporu')
  const [scheduleRule, setScheduleRule] = useState<ScheduledReport['schedule_rule']>('weekly')
  const [recipientEmail, setRecipientEmail] = useState('operations@example.com')
  const [format, setFormat] = useState<ScheduledReport['export_format']>('csv')
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const [catalogData, viewData, scheduleData] = await Promise.all([
        reportingReports.catalog().catch(() => reportingReports.list()),
        reportingSavedViews.list({ page_size: 100 }),
        reportingScheduledReports.list({ page_size: 100 }),
      ])
      setCatalog(catalogData)
      setSavedViews(viewData.items)
      setSchedules(scheduleData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zamanlanmis raporlar yuklenemedi.')
    } finally {
      setState('idle')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createSchedule() {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      await reportingScheduledReports.create({
        report_key: reportKey,
        saved_view_id: savedViewId || null,
        schedule_name: scheduleName,
        schedule_rule: scheduleRule,
        export_format: format,
        recipients_json: [
          {
            email: recipientEmail,
            delivery_channel: 'email',
            permission_check_required: true,
          },
        ],
        email_enabled: true,
      })
      setMessage('Zamanlanmis rapor olusturuldu.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zamanlanmis rapor olusturulamadi.')
    } finally {
      setState('idle')
    }
  }

  async function runAction(action: 'pause' | 'resume' | 'runNow', schedule: ScheduledReport) {
    setState('saving')
    setMessage(null)
    setError(null)
    try {
      if (action === 'pause') await reportingScheduledReports.pause(schedule.id)
      if (action === 'resume') await reportingScheduledReports.resume(schedule.id)
      if (action === 'runNow') await reportingScheduledReports.runNow(schedule.id)
      setMessage(action === 'runNow' ? 'Rapor calistirildi.' : 'Zamanlama guncellendi.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zamanlanmis rapor islemi tamamlanamadi.')
    } finally {
      setState('idle')
    }
  }

  return (
    <ReportingShell
      eyebrow="Scheduled Reports"
      title="Zamanlanmis Raporlar"
      description="Gunluk, haftalik ve aylik rapor gonderimlerini runtime permission check ve export job loglariyla yonetin."
      error={error}
      message={message}
      loading={state === 'loading'}
    >
      <Panel title="Schedule wizard" icon={<CalendarClock size={18} />}>
        <div className="grid gap-3 lg:grid-cols-3">
          <Field label="Rapor">
            <select className={inputClass} value={reportKey} onChange={event => setReportKey(event.target.value)}>
              {catalog.map(report => <option key={report.report_key} value={report.report_key}>{report.title}</option>)}
            </select>
          </Field>
          <Field label="Kayitli gorunum">
            <select className={inputClass} value={savedViewId} onChange={event => setSavedViewId(event.target.value)}>
              <option value="">Yok</option>
              {savedViews.map(view => <option key={view.id} value={view.id}>{view.view_name}</option>)}
            </select>
          </Field>
          <Field label="Frekans">
            <select className={inputClass} value={scheduleRule} onChange={event => setScheduleRule(event.target.value as ScheduledReport['schedule_rule'])}>
              <option value="daily">Gunluk</option>
              <option value="weekly">Haftalik</option>
              <option value="monthly">Aylik</option>
            </select>
          </Field>
          <Field label="Zamanlama adi">
            <input className={inputClass} value={scheduleName} onChange={event => setScheduleName(event.target.value)} />
          </Field>
          <Field label="Alici e-posta">
            <input className={inputClass} value={recipientEmail} onChange={event => setRecipientEmail(event.target.value)} />
          </Field>
          <Field label="Format">
            <select className={inputClass} value={format} onChange={event => setFormat(event.target.value as ScheduledReport['export_format'])}>
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="pdf">PDF future</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={primaryButtonClass} onClick={createSchedule} disabled={state === 'saving'}>
            {state === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Kaydet
          </button>
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            <ShieldCheck size={15} />
            Her run sirasinda alici permission ve scope kontrolu yeniden yapilir.
          </div>
        </div>
      </Panel>

      <Panel title="Aktif zamanlamalar" icon={<CalendarClock size={18} />}>
        <div className="space-y-2">
          {schedules.map(schedule => (
            <div key={schedule.id} className="rounded-md border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-slate-950/50">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{schedule.schedule_name}</h3>
                    <StatusPill status={schedule.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {schedule.report_key} / {schedule.schedule_rule} / next: {formatDate(schedule.next_run_at)}
                  </p>
                  {schedule.last_error && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{schedule.last_error}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondaryButtonClass} onClick={() => runAction('runNow', schedule)} disabled={state === 'saving'}>
                    <Play size={15} />
                    Simdi Calistir
                  </button>
                  {schedule.status === 'paused' ? (
                    <button type="button" className={secondaryButtonClass} onClick={() => runAction('resume', schedule)} disabled={state === 'saving'}>
                      <Play size={15} />
                      Devam
                    </button>
                  ) : (
                    <button type="button" className={secondaryButtonClass} onClick={() => runAction('pause', schedule)} disabled={state === 'saving'}>
                      <Pause size={15} />
                      Duraklat
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {schedules.length === 0 && <EmptyLine text="Zamanlanmis rapor yok." />}
        </div>
      </Panel>
    </ReportingShell>
  )
}

function ReportingShell({
  eyebrow,
  title,
  description,
  children,
  error,
  message,
  loading,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  error: string | null
  message: string | null
  loading: boolean
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              <ShieldCheck size={14} />
              {eyebrow}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">{title}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
          </div>
          {loading && (
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <Loader2 size={16} className="animate-spin" />
              Yukleniyor
            </div>
          )}
        </header>
        {error && <Banner tone="error" text={error} />}
        {message && <Banner tone="success" text={message} />}
        {children}
      </div>
    </main>
  )
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
      {label}
      {children}
    </label>
  )
}

function CompactRow({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'failed'
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200'
    : status === 'completed' || status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100'
      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>{status}</span>
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
      {text}
    </div>
  )
}

function Banner({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  const className = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100'
    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200'
  return <div className={`rounded-lg border px-4 py-3 text-sm ${className}`}>{text}</div>
}

function toReportKey(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `custom_${slug || 'report'}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function monthStart() {
  const value = new Date()
  value.setDate(1)
  return value.toISOString().slice(0, 10)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.slice(0, 16).replace('T', ' ')
}

const inputClass = 'min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-300/20'
const primaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]'
const iconButtonClass = 'inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200'
const dangerIconButtonClass = 'inline-flex size-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200'
