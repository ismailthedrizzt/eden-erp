'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { tenantRequestHeaders } from '@/lib/tenancy/client'
import type { UnifiedActionItem } from '@/lib/action-center/actionCenter.types'
import { ActionCenterList } from './ActionCenterList'

type RecordPendingActionsPanelProps = {
  entityType: string
  entityId?: string | null
  title?: string
}

export function RecordPendingActionsPanel({ entityType, entityId, title = 'Bu kayit icin bekleyen isler' }: RecordPendingActionsPanelProps) {
  const [items, setItems] = useState<UnifiedActionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!entityId) {
      setItems([])
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ entity_type: entityType, entity_id: entityId })
    fetch(`/api/action-center/by-record?${params.toString()}`, {
      cache: 'no-store',
      headers: tenantRequestHeaders(),
      signal: controller.signal,
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Bekleyen isler alinamadi.')
        setItems(Array.isArray(payload.data) ? payload.data : [])
      })
      .catch(fetchError => {
        if (controller.signal.aborted) return
        setError(fetchError.message || 'Bekleyen isler alinamadi.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [entityType, entityId])

  if (!entityId || (!loading && !error && items.length === 0)) return null

  return (
    <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 text-amber-700 dark:text-amber-200"><AlertCircle size={18} /></span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Bu kayitla ilgili gorev, onay veya tamamlanamayan islem varsa burada gorunur.
          </p>
        </div>
      </div>
      <ActionCenterList items={items} loading={loading} error={error} compact />
    </section>
  )
}
