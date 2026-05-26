'use client'

import { Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AuditTimelineItem {
  id: string
  summary?: string | null
  action_type?: string | null
  user_label?: string | null
  user_id?: string | null
  created_at?: string | null
  severity?: 'info' | 'warning' | 'error' | 'critical' | string
  reason?: string | null
}

export function AuditTimeline({ items, className }: { items: AuditTimelineItem[]; className?: string }) {
  if (!items.length) {
    return (
      <div className={cn('rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400', className)}>
        Denetim izi bulunmuyor.
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {items.map(item => (
        <div key={item.id} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
          <span className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneClass(item.severity))}>
            <Clock3 size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-950 dark:text-white">{item.summary || actionLabel(item.action_type)}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {[item.user_label || item.user_id || 'Sistem', formatDate(item.created_at)].filter(Boolean).join(' - ')}
            </div>
            {item.reason ? <div className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-300">{item.reason}</div> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function actionLabel(action?: string | null) {
  if (!action) return 'Denetim kaydi'
  return action.replace(/_/g, ' ')
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString('tr-TR')
}

function toneClass(severity?: string | null) {
  if (severity === 'critical' || severity === 'error') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
  if (severity === 'warning') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
}
