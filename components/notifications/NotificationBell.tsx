'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BellRing } from 'lucide-react'
import { notificationService, type NotificationCounts, type NotificationRecord } from '@/lib/services/notifications'
import { NotificationPanel } from './NotificationPanel'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState<NotificationCounts | null>(null)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const count = counts?.unread || 0
  const urgent = Boolean((counts?.critical || 0) > 0 || (counts?.high_priority || 0) > 0)

  const refreshCounts = useCallback(async () => {
    try {
      setCounts(await notificationService.counts())
    } catch {
      setCounts(null)
    }
  }, [])

  const refreshNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await notificationService.list({ pageSize: 40 })
      setNotifications(result.data)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Bildirimler alinamadi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCounts()
    const timer = window.setInterval(refreshCounts, 60_000)
    return () => window.clearInterval(timer)
  }, [refreshCounts])

  useEffect(() => {
    if (!open) return
    void refreshNotifications()
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, refreshNotifications])

  async function mutate(action: () => Promise<unknown>) {
    await action().catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : 'Islem tamamlanamadi.'))
    await Promise.all([refreshCounts(), refreshNotifications()])
  }

  return (
    <div ref={containerRef} data-tour-id="notification-bell" className="relative">
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${urgent ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/30' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-eden-navy'}`}
        aria-label="Bildirimler"
      >
        <BellRing size={16} />
        {count > 0 && (
          <span className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ${urgent ? 'bg-amber-600' : 'bg-eden-blue'}`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel
          notifications={notifications}
          counts={counts}
          loading={loading}
          error={error}
          onRead={id => void mutate(() => notificationService.markRead(id))}
          onReadAll={() => void mutate(() => notificationService.readAll())}
          onDismiss={id => void mutate(() => notificationService.dismiss(id))}
          onArchive={id => void mutate(() => notificationService.archive(id))}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
