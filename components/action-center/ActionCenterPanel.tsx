'use client'

import { X } from 'lucide-react'
import type { ActionCenterSummary, UnifiedActionItem } from '@/lib/action-center/actionCenter.types'
import { ActionCenterList } from './ActionCenterList'

type ActionCenterPanelProps = {
  items: UnifiedActionItem[]
  summary?: ActionCenterSummary | null
  loading?: boolean
  error?: string | null
  onClose: () => void
}

export function ActionCenterPanel({ items, summary, loading, error, onClose }: ActionCenterPanelProps) {
  return (
    <div className="absolute right-0 top-10 z-50 w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-xl dark:border-gray-800 dark:bg-gray-950">
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
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200"
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

      <div className="max-h-[440px] overflow-y-auto p-2">
        <ActionCenterList items={items} loading={loading} error={error} compact onNavigate={onClose} />
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
