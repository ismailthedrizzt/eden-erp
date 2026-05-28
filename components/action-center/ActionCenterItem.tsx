'use client'

import { AlertCircle, CheckCircle2, Clock3, ExternalLink, ListChecks, ListTodo, ShieldCheck, Wrench } from 'lucide-react'
import type { UnifiedActionItem } from '@/lib/action-center/actionCenter.types'

type ActionCenterItemProps = {
  item: UnifiedActionItem
  compact?: boolean
  onNavigate?: () => void
}

export function ActionCenterItem({ item, compact = false, onNavigate }: ActionCenterItemProps) {
  const primaryAction = item.suggested_actions?.find(action => action.target_page && !action.disabled)
  const disabledAction = item.suggested_actions?.find(action => action.disabled)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass(item.severity)}`}>
          {sourceIcon(item)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h4 className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {item.title}
            </h4>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass(item.severity)}`}>
              {statusText(item)}
            </span>
          </div>
          {item.description && (
            <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
              {item.description}
            </p>
          )}
          {!compact && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span>{sourceText(item.source_type)}</span>
              <span>{moduleText(item.module_key)}</span>
              {item.record_label && <span>{item.record_label}</span>}
              {item.due_at && <span>Son tarih: {formatDate(item.due_at)}</span>}
            </div>
          )}
          {compact && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span>{sourceText(item.source_type)}</span>
              <span>{moduleText(item.module_key)}</span>
              {item.due_at && <span>Son tarih: {formatDate(item.due_at)}</span>}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {primaryAction && (
              <a
                href={primaryAction.target_page}
                onClick={onNavigate}
                className="inline-flex items-center gap-1 rounded-md bg-eden-blue px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-eden-blue-dk"
              >
                {primaryAction.label}
                <ExternalLink size={12} />
              </a>
            )}
            {disabledAction && (
              <button
                type="button"
                disabled
                title={disabledAction.disabled_reason}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500"
              >
                {disabledAction.label}
              </button>
            )}
          </div>
          {disabledAction?.disabled_reason && (
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">{disabledAction.disabled_reason}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function sourceIcon(item: UnifiedActionItem) {
  if (item.source_type === 'process_task') return <ListTodo size={16} />
  if (item.source_type === 'project_task') return <ListChecks size={16} />
  if (item.source_type === 'approval') return <ShieldCheck size={16} />
  if (item.source_type === 'operation') return <Wrench size={16} />
  if (item.source_type === 'outbox' || item.source_type === 'projection' || item.source_type === 'integrity_warning' || item.source_type === 'system') return <AlertCircle size={16} />
  if (item.status === 'completed') return <CheckCircle2 size={16} />
  return <Clock3 size={16} />
}

function sourceText(sourceType: UnifiedActionItem['source_type']) {
  const labels: Record<string, string> = {
    process_task: 'Surec Gorevi',
    project_task: 'Proje Gorevi',
    approval: 'Onay',
    operation: 'Tamamlanamayan islem',
    outbox: 'Sistem guncellemesi',
    projection: 'Liste uyarisi',
    integrity_warning: 'Dikkat gerektiren durum',
    module_readiness: 'Kurulum uyarisi',
    notification: 'Bildirim',
    system: 'Sistem uyarisi',
  }
  return labels[sourceType] || 'Is'
}

function iconClass(severity: UnifiedActionItem['severity']) {
  if (severity === 'critical' || severity === 'error') return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200'
  if (severity === 'warning') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200'
  return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200'
}

function badgeClass(severity: UnifiedActionItem['severity']) {
  if (severity === 'critical' || severity === 'error') return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200'
  if (severity === 'warning') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
}

function statusText(item: UnifiedActionItem) {
  if (item.status === 'failed') return 'Tamamlanamadi'
  if (item.status === 'waiting') return 'Bekliyor'
  if (item.status === 'in_progress') return 'Devam ediyor'
  if (item.status === 'completed') return 'Tamamlandi'
  return 'Acik'
}

function moduleText(moduleKey?: string | null) {
  const labels: Record<string, string> = {
    companies: 'Sirketlerimiz',
    branches: 'Subelerimiz',
    partners: 'Ortaklarimiz',
    representatives: 'Temsilcilerimiz',
    process: 'Surecler',
    project_management: 'Proje ve Gorevler',
    system: 'Sistem',
    settings: 'Sistem',
    sirket: 'Sirketlerimiz',
  }
  return labels[String(moduleKey || '')] || 'Eden ERP'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}
