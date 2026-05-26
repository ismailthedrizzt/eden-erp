'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { tenantRequestHeaders } from '@/lib/tenancy/client'
import type { ActionCenterSummary, UnifiedActionItem } from '@/lib/action-center/actionCenter.types'
import { ActionCenterPanel } from './ActionCenterPanel'

export function ActionCenterBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<UnifiedActionItem[]>([])
  const [summary, setSummary] = useState<ActionCenterSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const count = summary?.total_open || 0
  const hasUrgent = Boolean((summary?.urgent_count || 0) > 0 || (summary?.failed_operation_count || 0) > 0)

  const refreshSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/action-center/summary', {
        cache: 'no-store',
        headers: tenantRequestHeaders(),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Is merkezi ozet bilgisi alinamadi.')
      setSummary(payload.data || null)
    } catch {
      setSummary(null)
    }
  }, [])

  const refreshItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/action-center?pageSize=30', {
        cache: 'no-store',
        headers: tenantRequestHeaders(),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Bekleyen isler alinamadi.')
      setItems(Array.isArray(payload.data) ? payload.data : [])
      setSummary(previous => payload.summary || previous)
    } catch (fetchError: any) {
      setError(fetchError.message || 'Bekleyen isler alinamadi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSummary()
    const timer = window.setInterval(refreshSummary, 60_000)
    return () => window.clearInterval(timer)
  }, [refreshSummary])

  useEffect(() => {
    if (!open) return
    void refreshItems()
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, refreshItems])

  return (
    <div ref={containerRef} data-tour-id="action-center-bell" className="relative">
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${hasUrgent ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-eden-navy'}`}
        aria-label="Is merkezi"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ${hasUrgent ? 'bg-red-600' : 'bg-eden-blue'}`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <ActionCenterPanel
          items={items}
          summary={summary}
          loading={loading}
          error={error}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
