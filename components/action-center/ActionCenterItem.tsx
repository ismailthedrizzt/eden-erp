'use client'

import { ExternalLink } from 'lucide-react'
import type { UnifiedActionItem } from '@/lib/action-center/actionCenter.types'
import { notificationCardParts, notificationStatusLabel } from '@/lib/notifications/notificationPresentation'
import { notificationService, type NotificationRecord } from '@/lib/services/notifications'

type ActionCenterDisplayItem = NotificationRecord | UnifiedActionItem

type ActionCenterItemProps = {
  item: ActionCenterDisplayItem
  compact?: boolean
  onNavigate?: () => void
}

export function ActionCenterItem({ item, onNavigate }: ActionCenterItemProps) {
  const parts = isNotificationRecord(item) ? notificationCardParts(item) : actionItemParts(item)
  const statusLabel = isNotificationRecord(item) ? notificationStatusLabel(item.status) : actionItemStatusLabel(item.status)

  async function openItem() {
    try {
      if (isNotificationRecord(item) && item.status === 'unread') await notificationService.markRead(item.id)
    } finally {
      onNavigate?.()
      window.location.href = parts.targetPage
    }
  }

  return (
    <button
      type="button"
      onClick={openItem}
      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:border-eden-blue/40 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-eden-blue/50 dark:hover:bg-eden-navy/50"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {parts.recordLabel}
          </div>
          <div className="mt-0.5 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
            {parts.cardType}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
          {statusLabel}
        </span>
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-gray-700 dark:text-gray-200">
        <span className="truncate">{parts.pendingAction}</span>
        <ExternalLink size={12} className="shrink-0 text-gray-400" />
      </div>
    </button>
  )
}

function isNotificationRecord(item: ActionCenterDisplayItem): item is NotificationRecord {
  return 'notification_type' in item && 'user_id' in item
}

function actionItemParts(item: UnifiedActionItem) {
  const firstSuggestedTarget = item.suggested_actions?.find(action => action.target_page)?.target_page
  return {
    recordLabel: item.record_label || item.title || 'Bekleyen iş',
    cardType: actionItemTypeLabel(item.source_type),
    pendingAction: item.description || item.title || 'İşlem bekliyor',
    targetPage: item.target_page || firstSuggestedTarget || item.suggested_actions?.[0]?.target_page || '/app/surecler',
  }
}

function actionItemTypeLabel(sourceType: UnifiedActionItem['source_type']) {
  const labels: Partial<Record<UnifiedActionItem['source_type'], string>> = {
    process_task: 'Görev',
    project_task: 'Görev',
    approval: 'Onay',
    operation: 'İşlem',
    outbox: 'Sistem işi',
    projection: 'Sistem işi',
    integrity_warning: 'Uyarı',
    module_readiness: 'Kurulum',
    notification: 'Bildirim',
    system: 'Sistem',
  }
  return labels[sourceType] || 'Bekleyen iş'
}

function actionItemStatusLabel(status: UnifiedActionItem['status']) {
  const labels: Record<UnifiedActionItem['status'], string> = {
    open: 'Açık',
    in_progress: 'İşlemde',
    waiting: 'Bekliyor',
    failed: 'Başarısız',
    completed: 'Tamamlandı',
    dismissed: 'Tamamlandı',
  }
  return labels[status] || status
}
