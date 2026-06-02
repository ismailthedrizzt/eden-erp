'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import type { NotificationCounts, NotificationRecord } from '@/lib/services/notifications'
import { isTaskNotification } from '@/lib/notifications/notificationPresentation'
import { ActionCenterList } from './ActionCenterList'

type ActionCenterPanelProps = {
  items: NotificationRecord[]
  counts?: NotificationCounts | null
  loading?: boolean
  error?: string | null
  onClose: () => void
}

export function ActionCenterPanel({ items, counts, loading, error, onClose }: ActionCenterPanelProps) {
  const [activeTab, setActiveTab] = useState<ActionCenterTab>('all')
  const visibleItems = useMemo(
    () => items.filter(item => tabMatchesItem(activeTab, item)),
    [activeTab, items]
  )
  const taskCount = counts?.pending_tasks ?? items.filter(isTaskNotification).length
  const allCount = counts?.pending_total ?? items.length
  const tabCounts: Record<ActionCenterTab, number> = { all: allCount, tasks: taskCount }

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

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
        {ACTION_CENTER_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative min-h-11 shrink-0 rounded-md px-3 py-1.5 pr-7 text-xs font-semibold transition-colors md:min-h-0 md:px-2.5 md:pr-7 ${activeTab === tab.key ? 'bg-eden-blue text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900'}`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                {tabCounts[tab.key] > 9 ? '9+' : tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-h-[min(62dvh,520px)] overflow-y-auto p-2 md:max-h-[440px]">
        <ActionCenterList items={visibleItems} loading={loading} error={error} compact onNavigate={onClose} />
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3 text-right dark:border-gray-800 dark:bg-gray-950">
        <Link
          href="/app/ayarlar/bildirimler"
          onClick={onClose}
          className="text-xs font-semibold text-eden-blue hover:text-eden-blue-dk dark:text-eden-blue-lt"
        >
          Tümünü Gör
        </Link>
      </div>
    </div>
  )
}

type ActionCenterTab = 'all' | 'tasks'

const ACTION_CENTER_TABS: Array<{ key: ActionCenterTab; label: string }> = [
  { key: 'all', label: 'Tüm İşler' },
  { key: 'tasks', label: 'Görevler' },
]

function tabMatchesItem(tab: ActionCenterTab, item: NotificationRecord) {
  if (tab === 'all') return true
  return isTaskNotification(item)
}
