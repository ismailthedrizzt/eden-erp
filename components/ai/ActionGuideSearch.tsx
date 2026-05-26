'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, Sparkles } from 'lucide-react'
import type { ActionGuideResult } from '@/lib/ai/actionGuide'
import { tenantRequestHeaders } from '@/lib/tenancy/client'
import { usePermissions } from '@/lib/security/permissionStore'
import { useActionGuideContext } from './ActionGuideContext'
import { ActionGuidePanel } from './ActionGuidePanel'

interface ActionGuideSearchProps {
  onStartSystemTour?: () => void
}

export function ActionGuideSearch({ onStartSystemTour }: ActionGuideSearchProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const permissions = usePermissions()
  const { pageContext } = useActionGuideContext()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ActionGuideResult | null>(null)

  const currentRoute = useMemo(() => {
    const queryString = searchParams.toString()
    return `${pathname}${queryString ? `?${queryString}` : ''}`
  }, [pathname, searchParams])

  useEffect(() => {
    const onOpenGuide = () => setOpen(true)
    window.addEventListener('eden:open-action-guide', onOpenGuide)
    return () => window.removeEventListener('eden:open-action-guide', onOpenGuide)
  }, [])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = query.trim()
    setOpen(true)
    setError(null)
    if (!trimmed) {
      setResult(null)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ai/action-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tenantRequestHeaders(),
        },
        body: JSON.stringify({
          query: trimmed,
          context: {
            ...pageContext,
            route: currentRoute,
            currentPage: pageContext.currentPage || pathname,
            userPermissions: Array.from(permissions.permissions),
          },
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'İşlem rehberi cevap veremedi.')
      setResult(payload as ActionGuideResult)
    } catch (guideError) {
      setError(guideError instanceof Error ? guideError.message : 'İşlem rehberi cevap veremedi.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-tour-id="action-guide-search" className="relative hidden min-w-[220px] max-w-[420px] flex-1 md:block">
      <form onSubmit={submit} className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Ne yapmak istiyorsunuz?"
          className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-100 dark:focus:border-emerald-700 dark:focus:ring-emerald-950"
        />
        <button type="submit" className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40" aria-label="İşlem rehberine sor">
          <Sparkles size={14} />
        </button>
      </form>
      <ActionGuidePanel
        open={open}
        result={result}
        loading={loading}
        error={error}
        currentPageTourKey={pageContext.currentPage || null}
        onClose={() => setOpen(false)}
        onStartSystemTour={onStartSystemTour}
      />
    </div>
  )
}
