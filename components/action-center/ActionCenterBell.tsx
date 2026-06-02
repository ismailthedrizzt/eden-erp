'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { notificationService, type NotificationCounts, type NotificationRecord } from '@/lib/services/notifications'
import { ActionCenterPanel } from './ActionCenterPanel'

export function ActionCenterBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [counts, setCounts] = useState<NotificationCounts | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const count = counts?.pending_total ?? counts?.unread ?? 0
  const hasUrgent = Boolean((counts?.critical || 0) > 0 || (counts?.high_priority || 0) > 0)

  const refreshSummary = useCallback(async () => {
    try {
      setCounts(await notificationService.counts())
    } catch {
      setCounts(null)
    }
  }, [])

  const refreshItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await notificationService.list({ statusValues: ['unread', 'read'], pageSize: 30 })
      setItems(result.data)
      setCounts(await notificationService.counts())
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

  useEffect(() => {
    const onOpenActionCenter = () => setOpen(true)
    window.addEventListener('eden:open-action-center', onOpenActionCenter)
    return () => window.removeEventListener('eden:open-action-center', onOpenActionCenter)
  }, [])

  return (
    <div ref={containerRef} data-tour-id="action-center-bell" className="relative">
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${hasUrgent ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-eden-navy'}`}
        aria-label="Is merkezi"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <ActionCenterPanel
          items={items}
          counts={counts}
          loading={loading}
          error={error}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
