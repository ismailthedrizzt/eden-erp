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
  compact?: boolean
}

const RECENT_QUERIES_STORAGE_KEY = 'eden.actionGuide.recentQueries'

export function ActionGuideSearch({ onStartSystemTour, compact = false }: ActionGuideSearchProps) {
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
  const [recentQueries, setRecentQueries] = useState<string[]>([])

  const currentRoute = useMemo(() => {
    const queryString = searchParams.toString()
    return `${pathname}${queryString ? `?${queryString}` : ''}`
  }, [pathname, searchParams])

  const requestGuide = useCallback(async (value: string) => {
    const trimmedValue = value.trim()
    setOpen(true)
    setError(null)
    setLoading(true)
    try {
      const extraContext = pageContext.context && typeof pageContext.context === 'object'
        ? pageContext.context
        : {}
      const response = await fetch('/api/ai/action-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tenantRequestHeaders(),
        },
        body: JSON.stringify({
          query: trimmedValue,
          currentPage: pageContext.currentPage || pathname,
          selectedRecordType: pageContext.selectedRecordType,
          selectedRecordId: pageContext.selectedRecordId,
          selectedRecordStatus: pageContext.selectedRecordStatus,
          companyId: pageContext.companyId || pageContext.activeCompanyId,
          branchId: pageContext.branchId || pageContext.activeBranchId,
          context: {
            ...pageContext,
            ...extraContext,
            route: currentRoute,
            currentPage: pageContext.currentPage || pathname,
            userPermissions: Array.from(permissions.permissions),
          },
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Islem rehberi cevap veremedi.')
      setResult(payload as ActionGuideResult)
      if (trimmedValue) {
        setRecentQueries(previous => writeRecentQueries(trimmedValue, previous))
      }
    } catch (guideError) {
      setError(guideError instanceof Error ? guideError.message : 'Islem rehberi cevap veremedi.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [currentRoute, pageContext, pathname, permissions.permissions])

  useEffect(() => {
    setRecentQueries(readRecentQueries())
  }, [])

  useEffect(() => {
    const onOpenGuide = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string; actionKey?: string; wizardKey?: string }>).detail
      const nextQuery = detail?.query?.trim()
      setOpen(true)
      if (nextQuery) {
        setQuery(nextQuery)
        void requestGuide(nextQuery)
        return
      }
      if (detail?.actionKey) {
        const actionQuery = detail.actionKey.replace(/_/g, ' ')
        setQuery(actionQuery)
        void requestGuide(actionQuery)
        return
      }
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
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        if (!result && !query.trim()) void requestGuide('')
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [query, requestGuide, result])

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
    <div data-tour-id="action-guide-search" className={compact ? 'relative flex-none' : 'relative min-w-0 flex-none md:min-w-[220px] md:max-w-[420px] md:flex-1'}>
      <form onSubmit={submit} className={compact ? 'hidden' : 'relative hidden md:block'}>
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          onFocus={() => {
            setOpen(true)
            if (!result && !query.trim()) void requestGuide('')
          }}
          placeholder={placeholderIndex === 0 ? 'Ne yapmak istiyorsunuz?' : actionGuideExampleQueries[placeholderIndex] || 'Ne yapmak istiyorsunuz?'}
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
        className={`${compact ? 'flex' : 'flex md:hidden'} h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-emerald-700 transition hover:bg-emerald-50 dark:border-gray-700 dark:bg-eden-navy dark:text-emerald-200 dark:hover:bg-emerald-950/40`}
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
        recentQueries={recentQueries}
        query={query}
        onClose={() => setOpen(false)}
        onStartSystemTour={onStartSystemTour}
        onPickExample={pickExample}
        onQueryChange={setQuery}
        onSubmitQuery={() => void submit()}
      />
    </div>
  )
}

function readRecentQueries() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_QUERIES_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 6) : []
  } catch {
    return []
  }
}

function writeRecentQueries(query: string, previous: string[]) {
  const next = [query, ...previous.filter(item => item.toLocaleLowerCase('tr-TR') !== query.toLocaleLowerCase('tr-TR'))].slice(0, 6)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RECENT_QUERIES_STORAGE_KEY, JSON.stringify(next))
  }
  return next
}
