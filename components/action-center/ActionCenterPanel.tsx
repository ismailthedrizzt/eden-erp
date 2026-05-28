'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { ActionCenterSourceType, ActionCenterSummary, UnifiedActionItem } from '@/lib/action-center/actionCenter.types'
import { ActionCenterList } from './ActionCenterList'

type ActionCenterPanelProps = {
  items: UnifiedActionItem[]
  summary?: ActionCenterSummary | null
  loading?: boolean
  error?: string | null
  onClose: () => void
}

export function ActionCenterPanel({ items, summary, loading, error, onClose }: ActionCenterPanelProps) {
  const [activeTab, setActiveTab] = useState<ActionCenterTab>('all')
  const visibleItems = useMemo(
    () => items.filter(item => tabMatchesItem(activeTab, item)),
    [activeTab, items]
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Is merkezi"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-1rem)] overflow-hidden rounded-t-2xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-gray-800 dark:bg-gray-950 md:absolute md:inset-auto md:right-0 md:top-10 md:w-[min(420px,calc(100vw-24px))] md:rounded-lg"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Is Merkezi</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {summary?.total_open ? `${summary.total_open} acik is, ${summary.approval_count} onay, ${summary.task_count} gorev` : 'Bekleyen is yok'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200 md:h-7 md:w-7"
          aria-label="Kapat"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 border-b border-gray-200 bg-white px-3 py-3 text-center dark:border-gray-800 dark:bg-gray-950">
        <MiniStat label="Gorev" value={summary?.task_count || 0} />
        <MiniStat label="Onay" value={summary?.approval_count || 0} />
        <MiniStat label="Islem" value={summary?.failed_operation_count || 0} />
        <MiniStat label="Uyari" value={summary?.system_warning_count || 0} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
        {ACTION_CENTER_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-11 shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors md:min-h-0 md:px-2.5 ${activeTab === tab.key ? 'bg-eden-blue text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[min(62dvh,520px)] overflow-y-auto p-2 md:max-h-[440px]">
        <ActionCenterList items={visibleItems} loading={loading} error={error} compact onNavigate={onClose} />
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-gray-50 px-2 py-2 dark:bg-gray-900">
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
      <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}

type ActionCenterTab = 'all' | 'tasks' | 'approvals' | 'operations' | 'warnings'

const ACTION_CENTER_TABS: Array<{ key: ActionCenterTab; label: string }> = [
  { key: 'all', label: 'Tum Isler' },
  { key: 'tasks', label: 'Gorevler' },
  { key: 'approvals', label: 'Onaylar' },
  { key: 'operations', label: 'Islemler' },
  { key: 'warnings', label: 'Uyarilar' },
]

function tabMatchesItem(tab: ActionCenterTab, item: UnifiedActionItem) {
  if (tab === 'all') return true
  if (tab === 'tasks') return item.source_type === 'process_task'
  if (tab === 'approvals') return item.source_type === 'approval'
  if (tab === 'operations') return item.source_type === 'operation'
  return SYSTEM_WARNING_SOURCE_TYPES.has(item.source_type)
}

const SYSTEM_WARNING_SOURCE_TYPES = new Set<ActionCenterSourceType>([
  'outbox',
  'projection',
  'integrity_warning',
  'module_readiness',
  'system',
])
