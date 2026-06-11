'use client'



import { appSureclerListContract } from '@/contracts/pages/generated/app-surecler.list.contract'
import { appSureclerWizardContract } from '@/contracts/pages/generated/app-surecler.wizard.contract'
import { appSureclerLifecycleContract } from '@/contracts/pages/generated/app-surecler.lifecycle.contract'

void appSureclerListContract
void appSureclerWizardContract
void appSureclerLifecycleContract

import { appSureclerPageContract } from '@/contracts/pages/generated/app-surecler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSureclerContractReady = requirePageContract(appSureclerPageContract)
void appSureclerContractReady

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Filter,
  ListTodo,
  RefreshCcw,
  Workflow,
} from 'lucide-react'
import { ActionCenterList } from '@/components/action-center/ActionCenterList'
import { ActionCenterSummaryCards } from '@/components/action-center/ActionCenterSummaryCards'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { OperationHint } from '@/components/onboarding/OperationHint'
import { unwrapActionCenterListPayload } from '@/lib/action-center/actionCenterClient'
import type { UnifiedActionItem } from '@/lib/action-center/actionCenter.types'
import {
  listApprovals,
  listProcesses,
  listTasks,
  type ProcessApprovalRecord,
  type ProcessRecord,
  type ProcessTaskRecord,
} from '@/lib/services/processCenterService'
import { tenantRequestHeaders } from '@/lib/tenancy/client'

type ProcessTab = 'overview' | 'processes' | 'tasks' | 'approvals' | 'warnings'

export default function ProcessesPage() {
  const [activeTab, setActiveTab] = useState<ProcessTab>('overview')
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [tasks, setTasks] = useState<ProcessTaskRecord[]>([])
  const [approvals, setApprovals] = useState<ProcessApprovalRecord[]>([])
  const [actionItems, setActionItems] = useState<UnifiedActionItem[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [assignedOnly, setAssignedOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useRegisterActionGuideContext({
    currentPage: 'process-center',
    route: '/app/surecler',
    availableModules: ['process', 'action-center'],
    context: {
      warning,
      enabledActions: ['open_process', 'complete_task', 'approve_process', 'reject_process'],
    },
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    setWarning(null)
    try {
      const processParams = new URLSearchParams({ pageSize: '50' })
      if (statusFilter) processParams.set('status', statusFilter)
      if (moduleFilter) processParams.set('module_key', moduleFilter)

      const taskParams = new URLSearchParams({ pageSize: '50' })
      if (assignedOnly) taskParams.set('assigned_to_me', 'true')

      const actionParams = new URLSearchParams({ pageSize: '50' })
      if (moduleFilter) actionParams.set('module_key', moduleFilter)

      const [processResult, taskResult, approvalResult, actionResponse] = await Promise.all([
        listProcesses(processParams),
        listTasks(taskParams),
        listApprovals(new URLSearchParams({ pageSize: '50' })),
        fetch(`/api/action-center?${actionParams.toString()}`, {
          cache: 'no-store',
          headers: tenantRequestHeaders(),
        }),
      ])
      const actionPayload = await actionResponse.json().catch(() => ({}))
      if (!actionResponse.ok) throw new Error(actionPayload.error || 'Is merkezi alinamadi.')
      const actionResult = unwrapActionCenterListPayload(actionPayload)
      setProcesses(processResult.data)
      setTasks(taskResult.data)
      setApprovals(approvalResult.data)
      setActionItems(actionResult.data)
      setWarning(processResult.warning || taskResult.warning || approvalResult.warning || actionResult.warnings?.[0] || null)
    } catch (fetchError: any) {
      setError(fetchError.message || 'Surec merkezi yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [assignedOnly, moduleFilter, statusFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openTasks = useMemo(() => tasks.filter(task => !['completed', 'cancelled'].includes(String(task.status))), [tasks])
  const pendingApprovals = useMemo(() => approvals.filter(approval => approval.status === 'pending'), [approvals])
  const failedItems = useMemo(() => actionItems.filter(item => item.status === 'failed' || item.severity === 'error'), [actionItems])
  const systemWarnings = useMemo(
    () => actionItems.filter(item => ['outbox', 'projection', 'integrity_warning', 'module_readiness', 'system'].includes(item.source_type)),
    [actionItems]
  )

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6">

      <header data-tour-id="process-center-header" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
              <Workflow size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Surec ve Is Merkezi</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                Acik surecler, gorevler, onaylar, tamamlanamayan islemler ve sistem uyarilari tek is merkezinde izlenir.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            <RefreshCcw size={15} />
            Yenile
          </button>
        </div>
      </header>

      <OperationHint
        id="process-action-center-product-context"
        title="Action Center teknik bildirim degil, gunluk is merkezidir"
        message="Gorevler, onaylar, tamamlanamayan islemler ve kayit bazli uyarilar kullaniciya is diliyle gosterilir. Teknik outbox detayi yalnizca yetkili/admin rollere acilir."
        variant="info"
        actionLabel="Isleri goster"
        onAction={() => setActiveTab('overview')}
      />

      <ActionCenterSummaryCards />

      <section data-tour-id="process-center-filters" className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[180px] flex-col gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Surec durumu
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option value="">Tum durumlar</option>
              <option value="active">Aktif</option>
              <option value="waiting_approval">Onay bekliyor</option>
              <option value="failed">Hata</option>
              <option value="completed">Tamamlandi</option>
              <option value="cancelled">Iptal</option>
            </select>
          </label>
          <label className="flex min-w-[180px] flex-col gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Modul
            <select value={moduleFilter} onChange={event => setModuleFilter(event.target.value)} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option value="">Tum moduller</option>
              <option value="branches">Subelerimiz</option>
              <option value="companies">Sirketlerimiz</option>
              <option value="partners">Ortaklarimiz</option>
              <option value="representatives">Temsilcilerimiz</option>
              <option value="process">Surecler</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={assignedOnly} onChange={event => setAssignedOnly(event.target.checked)} />
            Bana atananlar
          </label>
          <span className="ml-auto inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Filter size={14} />
            Listeler server-side kaynaklardan beslenir.
          </span>
        </div>
      </section>

      {warning && <InfoPanel tone="warning" title="Kaynak uyarisi" text={warning} />}
      {error && <InfoPanel tone="error" title="Surec merkezi yuklenemedi" text={error} />}

      <nav data-tour-id="process-center-tabs" className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        {PROCESS_TABS.map(tab => (
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

      {loading && <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950">Surec merkezi yukleniyor...</div>}

      {!loading && activeTab === 'overview' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <OverviewCard icon={<ListTodo size={18} />} title="Bana Atanan Gorevler" value={openTasks.length} items={openTasks.slice(0, 4).map(task => task.title || 'Gorev')} targetTab={() => setActiveTab('tasks')} />
          <OverviewCard icon={<ClipboardCheck size={18} />} title="Onay Bekleyenler" value={pendingApprovals.length} items={pendingApprovals.slice(0, 4).map(approval => approval.approval_type || 'Onay')} targetTab={() => setActiveTab('approvals')} />
          <OverviewCard icon={<AlertTriangle size={18} />} title="Dikkat Gerektirenler" value={failedItems.length + systemWarnings.length} items={[...failedItems, ...systemWarnings].slice(0, 4).map(item => item.title)} targetTab={() => setActiveTab('warnings')} />
          <div className="xl:col-span-3">
            <SectionTitle title="Tum bekleyen isler" subtitle="Gorev, onay, operasyon ve sistem uyarilari birlikte listelenir." />
            <ActionCenterList items={actionItems} loading={loading} error={error} />
          </div>
        </section>
      )}

      {!loading && activeTab === 'processes' && <ProcessTable processes={processes} />}
      {!loading && activeTab === 'tasks' && <TaskTable tasks={openTasks} />}
      {!loading && activeTab === 'approvals' && <ApprovalTable approvals={pendingApprovals} />}
      {!loading && activeTab === 'warnings' && (
        <section>
          <SectionTitle title="Tamamlanamayan islemler ve sistem uyarilari" subtitle="Teknik kaynaklar kullaniciya is diliyle sadelestirilir." />
          <ActionCenterList items={[...failedItems, ...systemWarnings]} loading={loading} error={error} />
        </section>
      )}
    </main>
  )
}

const PROCESS_TABS: Array<{ key: ProcessTab; label: string }> = [
  { key: 'overview', label: 'Genel' },
  { key: 'processes', label: 'Surecler' },
  { key: 'tasks', label: 'Gorevler' },
  { key: 'approvals', label: 'Onaylar' },
  { key: 'warnings', label: 'Islem/Uyari' },
]

function ProcessTable({ processes }: { processes: ProcessRecord[] }) {
  if (!processes.length) return <EmptyState text="Acik surec bulunmuyor." />
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3">Surec</th>
            <th className="px-4 py-3">Modul</th>
            <th className="px-4 py-3">Kayit</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3">Mevcut adim</th>
            <th className="px-4 py-3">Son guncelleme</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
          {processes.map(process => (
            <tr key={process.id}>
              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{processLabel(process)}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{moduleLabel(process.module_key)}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{recordLabel(process.entity_type, process.entity_id)}</td>
              <td className="px-4 py-3"><StatusBadge status={process.status || 'active'} /></td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{stepLabel(process.current_step_key)}</td>
              <td className="px-4 py-3 text-gray-500">{formatDate(process.updated_at || process.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <Link className="inline-flex items-center gap-1 rounded-md bg-eden-blue px-2.5 py-1.5 text-xs font-semibold text-white" href={`/app/surecler/${process.id}`}>
                  Ac
                  <ExternalLink size={12} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TaskTable({ tasks }: { tasks: ProcessTaskRecord[] }) {
  if (!tasks.length) return <EmptyState text="Acik gorev bulunmuyor." />
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {tasks.map(task => (
        <WorkCard
          key={task.id}
          icon={<ListTodo size={16} />}
          title={task.title || 'Gorev'}
          description={task.description || 'Surec gorevi tamamlanmayi bekliyor.'}
          status={task.status || 'open'}
          meta={[moduleLabel(task.module_key), recordLabel(task.entity_type, task.entity_id), task.due_at ? `Son tarih: ${formatDate(task.due_at)}` : null]}
          href={task.process_instance_id ? `/app/surecler/${task.process_instance_id}` : '/app/surecler'}
        />
      ))}
    </div>
  )
}

function ApprovalTable({ approvals }: { approvals: ProcessApprovalRecord[] }) {
  if (!approvals.length) return <EmptyState text="Onay bekleyen islem bulunmuyor." />
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {approvals.map(approval => (
        <WorkCard
          key={approval.id}
          icon={<ClipboardCheck size={16} />}
          title="Onay bekleyen islem"
          description={`${moduleLabel(approval.module_key)} icin ${approval.approval_type || 'islem'} karari bekliyor.`}
          status={approval.status || 'pending'}
          meta={[approval.approver_role ? `Rol: ${approval.approver_role}` : null, approval.requested_at ? `Talep: ${formatDate(approval.requested_at)}` : null]}
          href={approval.process_instance_id ? `/app/surecler/${approval.process_instance_id}` : '/app/surecler'}
        />
      ))}
    </div>
  )
}

function OverviewCard({ icon, title, value, items, targetTab }: { icon: ReactNode; title: string; value: number; items: string[]; targetTab: () => void }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">{icon}</span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <span className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</span>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
        {items.length ? items.map((item, index) => <li key={`${item}-${index}`} className="truncate">{item}</li>) : <li>Bekleyen kayit yok.</li>}
      </ul>
      <button type="button" onClick={targetTab} className="mt-4 text-xs font-semibold text-eden-blue hover:underline">Listeyi ac</button>
    </article>
  )
}

function WorkCard({ icon, title, description, status, meta, href }: { icon: ReactNode; title: string; description: string; status: string; meta: Array<string | null>; href: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">{description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            {meta.filter(Boolean).map(item => <span key={item || ''}>{item}</span>)}
          </div>
          <Link href={href} className="mt-3 inline-flex items-center gap-1 rounded-md bg-eden-blue px-2.5 py-1.5 text-xs font-semibold text-white">
            Sureci Ac
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </article>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
      {text}
    </div>
  )
}

function InfoPanel({ tone, title, text }: { tone: 'warning' | 'error'; title: string; text: string }) {
  const classes = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200'
    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200'
  return (
    <div className={`rounded-lg border p-3 text-sm ${classes}`}>
      <strong>{title}: </strong>{text}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const label = statusLabel(status)
  const tone = ['failed', 'overdue', 'rejected'].includes(status)
    ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200'
    : ['waiting_approval', 'pending', 'in_progress', 'open'].includes(status)
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
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

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}
