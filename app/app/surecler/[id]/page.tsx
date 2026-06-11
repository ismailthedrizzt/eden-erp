'use client'



import { appSureclerIdWizardContract } from '@/contracts/pages/generated/app-surecler-id.wizard.contract'
import { appSureclerIdLifecycleContract } from '@/contracts/pages/generated/app-surecler-id.lifecycle.contract'

void appSureclerIdWizardContract
void appSureclerIdLifecycleContract

import { appSureclerIdPageContract } from '@/contracts/pages/generated/app-surecler-id.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSureclerIdContractReady = requirePageContract(appSureclerIdPageContract)
void appSureclerIdContractReady

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  ListTodo,
  MessageSquare,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import {
  addTaskComment,
  approveApproval,
  cancelProcess,
  completeTask,
  getProcessDetail,
  rejectApproval,
  type ProcessApprovalRecord,
  type ProcessDetail,
  type ProcessEventRecord,
  type ProcessRecord,
  type ProcessTaskRecord,
} from '@/lib/services/processCenterService'

type DetailTab = 'summary' | 'steps' | 'tasks' | 'approvals' | 'record' | 'history' | 'debug'

export default function ProcessDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const processId = String(params?.id || '')
  const [detail, setDetail] = useState<ProcessDetail | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('summary')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [taskComment, setTaskComment] = useState('')

  const refresh = useCallback(async () => {
    if (!processId) return
    setLoading(true)
    setError(null)
    try {
      setDetail(await getProcessDetail(processId))
    } catch (fetchError: any) {
      setError(fetchError.message || 'Surec detayi alinamadi.')
    } finally {
      setLoading(false)
    }
  }, [processId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const process = detail?.process
  const openTasks = useMemo(
    () => (detail?.tasks || []).filter(task => !['completed', 'cancelled'].includes(String(task.status))),
    [detail?.tasks]
  )
  const pendingApprovals = useMemo(
    () => (detail?.approvals || []).filter(approval => approval.status === 'pending'),
    [detail?.approvals]
  )

  const runMutation = async (operation: () => Promise<unknown>, successMessage: string) => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await operation()
      setMessage(successMessage)
      await refresh()
    } catch (mutationError: any) {
      setError(mutationError.message || 'Islem tamamlanamadi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6">

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/app/surecler')}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
        >
          <ArrowLeft size={15} />
          Sureclere Don
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
        >
          <RefreshCcw size={15} />
          Yenile
        </button>
      </div>

      <header data-tour-id="process-detail-header" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Surec detayi yukleniyor...</p>}
        {!loading && process && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{processLabel(process)}</h1>
                <StatusBadge status={process.status || 'active'} />
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Mevcut adim: <strong>{stepLabel(process.current_step_key)}</strong>. Kaynak kayit ve operation sonucu bu ekrandan izlenir.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Modul: {moduleLabel(process.module_key)}</span>
                <span>Kayit: {recordLabel(process.entity_type, process.entity_id)}</span>
                {process.operation_id && <span>Operation: {process.operation_id}</span>}
                <span>Son guncelleme: {formatDate(process.updated_at || process.created_at)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={recordTargetPage(process)} className="inline-flex items-center gap-2 rounded-md bg-eden-blue px-3 py-2 text-sm font-semibold text-white">
                Kaynagi Gor
                <ExternalLink size={14} />
              </Link>
              {!['completed', 'cancelled'].includes(String(process.status)) && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void runMutation(() => cancelProcess(process.id, 'Kullanici tarafindan iptal edildi.'), 'Surec iptal edildi.')}
                  className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/20"
                >
                  <XCircle size={14} />
                  Iptal Et
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {message && <InfoPanel tone="success" text={message} />}
      {error && <InfoPanel tone="error" text={error} />}

      {process && (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <MetricCard label="Acik gorev" value={openTasks.length} icon={<ListTodo size={17} />} />
            <MetricCard label="Bekleyen onay" value={pendingApprovals.length} icon={<ClipboardCheck size={17} />} />
            <MetricCard label="Uyari" value={(process.warnings || []).length} icon={<AlertTriangle size={17} />} />
            <MetricCard label="Gecmis olayi" value={detail?.events.length || 0} icon={<MessageSquare size={17} />} />
          </section>

          <nav data-tour-id="process-detail-tabs" className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
            {DETAIL_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${activeTab === tab.key ? 'border-eden-blue text-eden-blue' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'summary' && <SummaryTab process={process} tasks={openTasks} approvals={pendingApprovals} />}
          {activeTab === 'steps' && <StepsTab process={process} events={detail?.events || []} />}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={detail?.tasks || []}
              saving={saving}
              comment={taskComment}
              onCommentChange={setTaskComment}
              onComplete={task => runMutation(() => completeTask(task.id, { completed_from: 'process_center' }), 'Gorev tamamlandi.')}
              onComment={task => runMutation(() => addTaskComment(task.id, taskComment), 'Gorev yorumu eklendi.').then(() => setTaskComment(''))}
            />
          )}
          {activeTab === 'approvals' && (
            <ApprovalsTab
              approvals={detail?.approvals || []}
              saving={saving}
              decisionNote={decisionNote}
              onDecisionNoteChange={setDecisionNote}
              onApprove={approval => runMutation(() => approveApproval(approval.id, decisionNote), 'Onay verildi.')}
              onReject={approval => runMutation(() => rejectApproval(approval.id, decisionNote || 'Uygun bulunmadi.'), 'Onay reddedildi.')}
            />
          )}
          {activeTab === 'record' && <RecordTab process={process} />}
          {activeTab === 'history' && <HistoryTab events={detail?.events || []} />}
          {activeTab === 'debug' && <DebugTab detail={detail} />}
        </>
      )}
    </main>
  )
}

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'summary', label: 'Genel' },
  { key: 'steps', label: 'Adimlar' },
  { key: 'tasks', label: 'Gorevler' },
  { key: 'approvals', label: 'Onaylar' },
  { key: 'record', label: 'Ilgili Kayit' },
  { key: 'history', label: 'Gecmis' },
  { key: 'debug', label: 'Teknik Detay' },
]

function SummaryTab({ process, tasks, approvals }: { process: ProcessRecord; tasks: ProcessTaskRecord[]; approvals: ProcessApprovalRecord[] }) {
  const blockingReasons = process.result_json?.blocking_reasons || process.payload_json?.blocking_reasons || []
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Surec ozeti">
        <dl className="space-y-3 text-sm">
          <KeyValue label="Surec" value={processLabel(process)} />
          <KeyValue label="Durum" value={statusLabel(process.status || 'active')} />
          <KeyValue label="Mevcut adim" value={stepLabel(process.current_step_key)} />
          <KeyValue label="Operation" value={process.operation_id || 'Operation henuz olusmadi'} />
        </dl>
      </Panel>
      <Panel title="Blocking / uyarilar">
        {blockingReasons.length || process.warnings?.length ? (
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            {[...blockingReasons, ...(process.warnings || [])].map((reason: string, index: number) => <li key={`${reason}-${index}`}>{reason}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Bu surec icin acik blocking reason yok.</p>
        )}
      </Panel>
      <Panel title="Onerilen aksiyonlar">
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>{tasks.length ? `${tasks.length} gorev tamamlanmayi bekliyor.` : 'Acik gorev yok.'}</p>
          <p>{approvals.length ? `${approvals.length} onay karari bekliyor.` : 'Bekleyen onay yok.'}</p>
        </div>
      </Panel>
    </section>
  )
}

function StepsTab({ process, events }: { process: ProcessRecord; events: ProcessEventRecord[] }) {
  const eventSteps = events.filter(event => event.step_key)
  const steps = eventSteps.length ? eventSteps : [{ id: 'current', step_key: process.current_step_key, event_type: 'current', new_status: process.status, created_at: process.updated_at }]
  return (
    <Panel title="Adim zaman cizelgesi">
      <ol className="space-y-3">
        {steps.map((event: any, index) => (
          <li key={event.id || index} className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{stepLabel(event.step_key)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{eventLabel(event.event_type)} - {formatDate(event.created_at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function TasksTab({ tasks, saving, comment, onCommentChange, onComplete, onComment }: { tasks: ProcessTaskRecord[]; saving: boolean; comment: string; onCommentChange: (value: string) => void; onComplete: (task: ProcessTaskRecord) => Promise<unknown>; onComment: (task: ProcessTaskRecord) => Promise<unknown> }) {
  if (!tasks.length) return <EmptyPanel text="Bu surecte gorev bulunmuyor." />
  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <Panel key={task.id} title={task.title || 'Gorev'}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">{task.description || 'Surec gorevi.'}</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Durum: {statusLabel(task.status || 'open')}</span>
              <span>Adim: {stepLabel(task.step_key)}</span>
              {task.due_at && <span>Son tarih: {formatDate(task.due_at)}</span>}
            </div>
            <textarea value={comment} onChange={event => onCommentChange(event.target.value)} placeholder="Gorev notu" className="min-h-20 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
            <div className="flex flex-wrap gap-2">
              {!['completed', 'cancelled'].includes(String(task.status)) && (
                <button disabled={saving} onClick={() => void onComplete(task)} className="inline-flex items-center gap-2 rounded-md bg-eden-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <CheckCircle2 size={14} />
                  Gorevi Tamamla
                </button>
              )}
              <button disabled={saving || !comment.trim()} onClick={() => void onComment(task)} className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200">
                <MessageSquare size={14} />
                Yorum Ekle
              </button>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  )
}

function ApprovalsTab({ approvals, saving, decisionNote, onDecisionNoteChange, onApprove, onReject }: { approvals: ProcessApprovalRecord[]; saving: boolean; decisionNote: string; onDecisionNoteChange: (value: string) => void; onApprove: (approval: ProcessApprovalRecord) => Promise<unknown>; onReject: (approval: ProcessApprovalRecord) => Promise<unknown> }) {
  if (!approvals.length) return <EmptyPanel text="Bu surecte onay kaydi bulunmuyor." />
  return (
    <div className="space-y-3">
      <textarea value={decisionNote} onChange={event => onDecisionNoteChange(event.target.value)} placeholder="Karar notu" className="min-h-20 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
      {approvals.map(approval => (
        <Panel key={approval.id} title="Onay bekleyen islem">
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">{moduleLabel(approval.module_key)} icin {approval.approval_type || 'islem'} karari bekliyor.</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Durum: {statusLabel(approval.status || 'pending')}</span>
              {approval.approver_role && <span>Rol: {approval.approver_role}</span>}
              {approval.requested_at && <span>Talep: {formatDate(approval.requested_at)}</span>}
            </div>
            {approval.status === 'pending' && (
              <div className="flex flex-wrap gap-2">
                <button disabled={saving} onClick={() => void onApprove(approval)} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <ShieldCheck size={14} />
                  Onayla
                </button>
                <button disabled={saving} onClick={() => void onReject(approval)} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60 dark:border-red-900 dark:text-red-200">
                  <XCircle size={14} />
                  Reddet
                </button>
              </div>
            )}
          </div>
        </Panel>
      ))}
    </div>
  )
}

function RecordTab({ process }: { process: ProcessRecord }) {
  return (
    <Panel title="Ilgili kayit">
      <p className="text-sm text-gray-600 dark:text-gray-300">{recordLabel(process.entity_type, process.entity_id)}</p>
      <Link href={recordTargetPage(process)} className="mt-3 inline-flex items-center gap-2 rounded-md bg-eden-blue px-3 py-2 text-sm font-semibold text-white">
        Kaynagi Ac
        <ExternalLink size={14} />
      </Link>
    </Panel>
  )
}

function HistoryTab({ events }: { events: ProcessEventRecord[] }) {
  if (!events.length) return <EmptyPanel text="Surec gecmisi henuz olusmadi." />
  return (
    <Panel title="Surec gecmisi">
      <ol className="space-y-3">
        {events.map(event => (
          <li key={event.id} className="border-l-2 border-gray-200 pl-3 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{eventLabel(event.event_type)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stepLabel(event.step_key)} - {formatDate(event.created_at)}</p>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function DebugTab({ detail }: { detail: ProcessDetail | null }) {
  return (
    <Panel title="Teknik Detay / Debug">
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Bu bolum sadece admin/urun destek akisi icin kullanilir; normal kullaniciya teknik hata detayi gosterilmez.</p>
      <pre className="max-h-[420px] overflow-auto rounded-md bg-gray-950 p-3 text-xs text-gray-100">{JSON.stringify(detail, null, 2)}</pre>
    </Panel>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-blue-700 dark:text-blue-200">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      {children}
    </section>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-semibold text-gray-900 dark:text-white">{value}</dd>
    </div>
  )
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
      {text}
    </div>
  )
}

function InfoPanel({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  const classes = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200'
    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200'
  return <div className={`rounded-lg border p-3 text-sm ${classes}`}>{text}</div>
}

function StatusBadge({ status }: { status: string }) {
  const tone = ['failed', 'overdue', 'rejected'].includes(status)
    ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200'
    : ['waiting_approval', 'pending', 'in_progress', 'open'].includes(status)
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{statusLabel(status)}</span>
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Taslak',
    active: 'Aktif',
    waiting_approval: 'Onay bekliyor',
    completed: 'Tamamlandi',
    cancelled: 'Iptal',
    failed: 'Hata',
    open: 'Acik',
    in_progress: 'Devam ediyor',
    overdue: 'Gecikmis',
    pending: 'Bekliyor',
    approved: 'Onaylandi',
    rejected: 'Reddedildi',
  }
  return labels[status] || status
}

function processLabel(process: ProcessRecord) {
  return operationLabel(process.operation_key || process.process_key) || 'Surec'
}

function operationLabel(value?: string | null) {
  const labels: Record<string, string> = {
    company_branch_opening_process: 'Sube Acilisi',
    company_branch_closing_process: 'Sube Kapanisi',
    branch_opening: 'Sube Acilisi',
    branch_closing: 'Sube Kapanisi',
    capital_increase: 'Sermaye Artirimi',
    representative_authority: 'Temsil Yetkisi',
    ownership_transaction: 'Ortaklik Islemi',
  }
  const key = String(value || '')
  return labels[key] || key.replace(/_/g, ' ')
}

function moduleLabel(value?: string | null) {
  const labels: Record<string, string> = {
    companies: 'Sirketlerimiz',
    branches: 'Subelerimiz',
    partners: 'Ortaklarimiz',
    representatives: 'Temsilcilerimiz',
    process: 'Surecler',
    system: 'Sistem',
  }
  return labels[String(value || '')] || 'Eden ERP'
}

function recordLabel(entityType?: string | null, entityId?: string | null) {
  if (!entityId) return 'Kayit baglantisi yok'
  const labels: Record<string, string> = {
    company: 'Sirket',
    company_branch: 'Sube',
    branch: 'Sube',
    company_partner: 'Ortak',
    partner: 'Ortak',
    company_representative: 'Temsilci',
    representative: 'Temsilci',
  }
  return `${labels[String(entityType || '')] || 'Kayit'}: ${entityId}`
}

function recordTargetPage(process: ProcessRecord) {
  const id = process.entity_id || process.company_id || ''
  if (process.entity_type === 'company') return `/app/sirket/companies${id ? `?id=${id}` : ''}`
  if (process.entity_type === 'company_branch' || process.entity_type === 'branch') return `/app/sirket/companies/branches${id ? `?id=${id}` : ''}`
  if (process.entity_type === 'company_partner' || process.entity_type === 'partner') return `/app/sirket/companies/partners${id ? `?id=${id}` : ''}`
  if (process.entity_type === 'company_representative' || process.entity_type === 'representative') return `/app/sirket/companies/representatives${id ? `?id=${id}` : ''}`
  return '/app'
}

function stepLabel(step?: string | null) {
  if (!step) return 'Bekliyor'
  const labels: Record<string, string> = {
    precheck: 'On kontrol',
    document_check: 'Belge kontrolu',
    approval: 'Onay',
    execution: 'Islem',
    completed: 'Tamamlandi',
  }
  return labels[step] || step.replace(/_/g, ' ')
}

function eventLabel(eventType?: string | null) {
  const labels: Record<string, string> = {
    started: 'Surec baslatildi',
    task_created: 'Gorev olusturuldu',
    task_completed: 'Gorev tamamlandi',
    task_commented: 'Goreve yorum eklendi',
    approval_requested: 'Onay istendi',
    approval_approved: 'Onay verildi',
    approval_rejected: 'Onay reddedildi',
    step_completed: 'Adim tamamlandi',
    completed: 'Surec tamamlandi',
    cancelled: 'Surec iptal edildi',
    current: 'Guncel adim',
  }
  return labels[String(eventType || '')] || String(eventType || 'Surec olayi')
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}
