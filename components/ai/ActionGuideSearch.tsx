'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, Sparkles } from 'lucide-react'
import type { ActionGuideResult } from '@/lib/ai/actionGuide'
import { actionGuideExampleQueries } from '@/lib/action-guide/actionGuideExamples'
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
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ActionGuideResult | null>(null)

  const currentRoute = useMemo(() => {
    const queryString = searchParams.toString()
    return `${pathname}${queryString ? `?${queryString}` : ''}`
  }, [pathname, searchParams])

  const requestGuide = useCallback(async (value: string) => {
    setOpen(true)
    setError(null)
    setLoading(true)
    try {
      const response = await fetch('/api/ai/action-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tenantRequestHeaders(),
        },
        body: JSON.stringify({
          query: value,
          currentPage: pageContext.currentPage || pathname,
          selectedRecordType: pageContext.selectedRecordType,
          selectedRecordId: pageContext.selectedRecordId,
          selectedRecordStatus: pageContext.selectedRecordStatus,
          companyId: pageContext.companyId || pageContext.activeCompanyId,
          branchId: pageContext.branchId || pageContext.activeBranchId,
          context: {
            ...pageContext,
            route: currentRoute,
            currentPage: pageContext.currentPage || pathname,
            userPermissions: Array.from(permissions.permissions),
          },
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Islem rehberi cevap veremedi.')
      setResult(payload as ActionGuideResult)
    } catch (guideError) {
      setError(guideError instanceof Error ? guideError.message : 'Islem rehberi cevap veremedi.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [currentRoute, pageContext, pathname, permissions.permissions])

  useEffect(() => {
    const onOpenGuide = () => {
      setOpen(true)
      if (!result && !query.trim()) void requestGuide('')
    }
    window.addEventListener('eden:open-action-guide', onOpenGuide)
    return () => window.removeEventListener('eden:open-action-guide', onOpenGuide)
  }, [query, requestGuide, result])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex(index => (index + 1) % actionGuideExampleQueries.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!open || trimmed.length < 3) return
    const timer = window.setTimeout(() => {
      void requestGuide(trimmed)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [query, open, requestGuide])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    await requestGuide(query.trim())
  }

  const pickExample = (value: string) => {
    setQuery(value)
    void requestGuide(value)
  }

  return (
    <div data-tour-id="action-guide-search" className="relative min-w-0 flex-none md:min-w-[220px] md:max-w-[420px] md:flex-1">
      <form onSubmit={submit} className="relative hidden md:block">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          onFocus={() => {
            setOpen(true)
            if (!result && !query.trim()) void requestGuide('')
          }}
          placeholder={actionGuideExampleQueries[placeholderIndex] || 'Ne yapmak istiyorsunuz?'}
          className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-100 dark:focus:border-emerald-700 dark:focus:ring-emerald-950"
        />
        <button type="submit" className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40" aria-label="Islem rehberine sor">
          <Sparkles size={14} />
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          if (!result && !query.trim()) void requestGuide('')
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-emerald-700 transition hover:bg-emerald-50 dark:border-gray-700 dark:bg-eden-navy dark:text-emerald-200 dark:hover:bg-emerald-950/40 md:hidden"
        aria-label="AI islem rehberini ac"
      >
        <Sparkles size={16} />
      </button>
      <ActionGuidePanel
        open={open}
        result={result}
        loading={loading}
        error={error}
        currentPageTourKey={pageContext.currentPage || null}
        onClose={() => setOpen(false)}
        onStartSystemTour={onStartSystemTour}
        onPickExample={pickExample}
      />
    </div>
  )
}
