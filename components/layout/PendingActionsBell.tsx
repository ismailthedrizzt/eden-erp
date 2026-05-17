'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Building2, CheckSquare, Loader2, Users, X } from 'lucide-react'

type PendingActionItem = {
  id: string
  type: string
  title: string
  subtitle: string
  statusLabel: string
  href: string
  severity: 'info' | 'warning'
  createdAt?: string
}

export function PendingActionsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<PendingActionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const count = items.length
  const grouped = useMemo(() => ({
    warning: items.filter(item => item.severity === 'warning').length,
    info: items.filter(item => item.severity === 'info').length,
  }), [items])

  useEffect(() => {
    fetchPendingActions()
    const timer = window.setInterval(fetchPendingActions, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  async function fetchPendingActions() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications/pending-actions', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Bildirimler alınamadı')
      setItems(Array.isArray(payload.data?.items) ? payload.data.items : [])
    } catch (fetchError: any) {
      setError(fetchError.message || 'Bildirimler alınamadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-eden-navy"
        aria-label="Bekleyen işlemler"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Bekleyen İşlemler</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {count ? `${grouped.warning} onay/kapama, ${grouped.info} taslak` : 'Bekleyen kayıt yok'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200"
              aria-label="Kapat"
            >
              <X size={15} />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {loading && !items.length && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                Bildirimler yükleniyor
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Taslak veya onay bekleyen işlem bulunmuyor.
              </div>
            )}

            {items.map(item => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex gap-3 rounded-lg px-3 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.severity === 'warning' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-200' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200'}`}>
                  {notificationIcon(item.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900 dark:text-gray-100">{item.title}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</span>
                  <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                    {item.statusLabel}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function notificationIcon(type: string) {
  if (type === 'company_lifecycle') return <Building2 size={15} />
  if (type === 'employee_entry') return <Users size={15} />
  return <CheckSquare size={15} />
}
