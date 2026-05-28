'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock3, ExternalLink } from 'lucide-react'
import type { AuditLogRecord } from '@/lib/audit/audit.types'
import { fetchAuditByRecord, normalizeAuditRow } from '@/lib/audit/auditClient'
import { cn } from '@/lib/utils'
import { AuditDetailDrawer } from './AuditDetailDrawer'

export interface AuditTimelineItem {
  id: string
  summary?: string | null
  action_type?: string | null
  user_label?: string | null
  user_id?: string | null
  created_at?: string | null
  severity?: 'info' | 'warning' | 'error' | 'critical' | string
  reason?: string | null
  result_status?: string | null
  entity_type?: string | null
  entity_id?: string | null
  metadata_json?: Record<string, unknown>
}

export interface AuditTimelineProps {
  items?: AuditTimelineItem[]
  entity_type?: string
  entity_id?: string
  company_id?: string
  branch_id?: string
  max_items?: number
  show_filters?: boolean
  compact?: boolean
  className?: string
}

export function AuditTimeline({
  items,
  entity_type,
  entity_id,
  max_items = 10,
  show_filters = false,
  compact = false,
  className,
}: AuditTimelineProps) {
  const [loadedItems, setLoadedItems] = useState<AuditTimelineItem[]>(items || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AuditLogRecord | null>(null)

  useEffect(() => {
    if (items) {
      setLoadedItems(items)
      return
    }
    if (!entity_type || !entity_id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAuditByRecord(entity_type, entity_id, { pageSize: max_items })
      .then(result => {
        if (!cancelled) setLoadedItems(result.data)
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || 'Denetim izi okunamadi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [entity_id, entity_type, items, max_items])

  const visibleItems = useMemo(() => loadedItems.slice(0, max_items), [loadedItems, max_items])

  if (loading) {
    return (
      <div className={cn('rounded-md border border-border p-4 text-sm text-muted-foreground', className)}>
        Denetim izi yukleniyor...
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200', className)}>
        {error}
      </div>
    )
  }

  if (!visibleItems.length) {
    return (
      <div className={cn('rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground', className)}>
        Bu kayit icin henuz denetim kaydi yok.
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {show_filters ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
          <span className="font-medium">Son {visibleItems.length} denetim kaydi</span>
          {entity_type && entity_id ? (
            <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={`/app/sistem/audit?entity_type=${entity_type}&entity_id=${entity_id}`}>
              Tumunu gor
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
      {visibleItems.map(item => (
        <button
          type="button"
          key={item.id}
          onClick={() => setSelected(normalizeAuditRow(item))}
          className={cn(
            'flex w-full gap-3 rounded-md border border-border bg-card p-3 text-left hover:bg-muted/50',
            compact && 'p-2'
          )}
        >
          <span className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneClass(item.severity))}>
            <Clock3 size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">{item.summary || actionLabel(item.action_type)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {[item.user_label || item.user_id || 'Sistem', formatDate(item.created_at), resultLabel(item.result_status)].filter(Boolean).join(' - ')}
            </div>
            {item.reason && !compact ? <div className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</div> : null}
          </div>
        </button>
      ))}
      <AuditDetailDrawer record={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function actionLabel(action?: string | null) {
  if (!action) return 'Denetim kaydi'
  return action.replace(/_/g, ' ')
}

function resultLabel(value?: string | null) {
  if (value === 'denied') return 'Reddedildi'
  if (value === 'failed') return 'Basarisiz'
  if (value === 'pending') return 'Bekliyor'
  return 'Basarili'
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
