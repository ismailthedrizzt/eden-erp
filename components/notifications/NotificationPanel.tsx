'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { NotificationCounts, NotificationRecord } from '@/lib/services/notifications'
import { NotificationItem } from './NotificationItem'

type Props = {
  notifications: NotificationRecord[]
  counts: NotificationCounts | null
  loading?: boolean
  error?: string | null
  onRead: (id: string) => void
  onReadAll: () => void
  onDismiss: (id: string) => void
  onArchive: (id: string) => void
  onClose?: () => void
}

type TabKey = 'unread' | 'all' | 'tasks' | 'documents' | 'system'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'unread', label: 'Okunmamis' },
  { key: 'all', label: 'Tum' },
  { key: 'tasks', label: 'Gorev/Onay' },
  { key: 'documents', label: 'Belge' },
  { key: 'system', label: 'Sistem' },
]

export function NotificationPanel({ notifications, counts, loading, error, onRead, onReadAll, onDismiss, onArchive, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('unread')
  const visible = useMemo(() => notifications.filter(item => tabMatches(tab, item)), [notifications, tab])
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-popover p-3 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Bildirimler</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{counts?.unread || 0} okunmamis</p>
        </div>
        <button type="button" onClick={onReadAll} className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted">
          Tumunu okundu yap
        </button>
      </div>
      <div className="mt-3 flex gap-1 overflow-x-auto">
        {tabs.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-md px-2 py-1 text-xs font-medium ${tab === item.key ? 'bg-eden-blue text-white' : 'border border-border text-muted-foreground hover:bg-muted'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
        {loading && (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}
        {!loading && error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Bildirim yok.</div>
        )}
        {!loading && !error && visible.map(item => (
          <NotificationItem
            key={item.id}
            notification={item}
            compact
            onRead={onRead}
            onDismiss={onDismiss}
            onArchive={onArchive}
            onNavigate={onClose}
          />
        ))}
      </div>
    </div>
  )
}

function tabMatches(tab: TabKey, item: NotificationRecord) {
  if (tab === 'all') return item.status !== 'archived'
  if (tab === 'unread') return item.status === 'unread'
  if (tab === 'tasks') return item.notification_type.startsWith('task_') || item.notification_type.startsWith('approval_')
  if (tab === 'documents') return item.notification_type.startsWith('document_')
  return ['system', 'security', 'module'].some(prefix => item.notification_type.startsWith(prefix))
}

