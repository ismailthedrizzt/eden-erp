'use client'

import Link from 'next/link'
import { Archive, Check, ExternalLink, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationRecord } from '@/lib/services/notifications'

type Props = {
  notification: NotificationRecord
  compact?: boolean
  onRead?: (id: string) => void
  onDismiss?: (id: string) => void
  onArchive?: (id: string) => void
  onNavigate?: () => void
}

export function NotificationItem({ notification, compact, onRead, onDismiss, onArchive, onNavigate }: Props) {
  const target = notification.target_page || ''
  const unread = notification.status === 'unread'
  return (
    <article
      className={cn(
        'rounded-md border border-border bg-card p-3',
        unread && 'border-eden-blue/40 bg-eden-blue/5',
        compact && 'p-2.5'
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', severityDot(notification.severity))} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-sm font-semibold text-foreground">{notification.title}</h3>
            <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {moduleLabel(notification.module_key)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{formatDate(notification.created_at)}</span>
            {notification.related_record_label && <span>{notification.related_record_label}</span>}
            {notification.action_required && <span className="font-semibold text-amber-600">Aksiyon</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5">
        {target && (
          <Link
            href={target}
            onClick={onNavigate}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink size={13} />
            {notification.action_label || 'Ac'}
          </Link>
        )}
        {unread && (
          <button type="button" onClick={() => onRead?.(notification.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted" title="Okundu">
            <Check size={13} />
          </button>
        )}
        <button type="button" onClick={() => onDismiss?.(notification.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted" title="Gizle">
          <X size={13} />
        </button>
        <button type="button" onClick={() => onArchive?.(notification.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted" title="Arsivle">
          <Archive size={13} />
        </button>
      </div>
    </article>
  )
}

function severityDot(severity: string) {
  if (severity === 'critical' || severity === 'error') return 'bg-red-500'
  if (severity === 'warning') return 'bg-amber-500'
  if (severity === 'success') return 'bg-emerald-500'
  return 'bg-eden-blue'
}

function moduleLabel(moduleKey: string) {
  const labels: Record<string, string> = {
    project_management: 'Gorev',
    process: 'Onay',
    documents: 'Belge',
    after_sales: 'Servis',
    importExport: 'Veri',
    security: 'Guvenlik',
    settings: 'Sistem',
  }
  return labels[moduleKey] || moduleKey
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

