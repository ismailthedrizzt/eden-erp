'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, Sparkles } from 'lucide-react'
import type { ActionGuideResult } from '@/lib/ai/actionGuide'
import { actionGuideExampleQueries } from '@/lib/action-guide/actionGuideExamples'
import { tenantRequestHeaders } from '@/lib/tenancy/client'
import { usePermissions } from '@/lib/security/permissionStore'
import { getCurrentReleaseEnvironment, type ReleaseEnvironment } from '@/lib/release/environment'
import { getRouteReleaseDecision } from '@/lib/release/releaseVisibility'
import { useActionGuideContext } from './ActionGuideContext'
import { ActionGuidePanel, type ActionGuideChatMessage } from './ActionGuidePanel'

interface ActionGuideSearchProps {
  onStartSystemTour?: () => void
  compact?: boolean
  headless?: boolean
}

export function ActionGuideSearch({ compact = false, headless = false }: ActionGuideSearchProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const permissions = usePermissions()
  const { pageContext } = useActionGuideContext()
  const releaseEnv = getCurrentReleaseEnvironment()
  const [query, setQuery] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ActionGuideResult | null>(null)
  const [messages, setMessages] = useState<ActionGuideChatMessage[]>([])

  const currentRoute = useMemo(() => {
    const queryString = searchParams.toString()
    return `${pathname}${queryString ? `?${queryString}` : ''}`
  }, [pathname, searchParams])

  const requestGuide = useCallback(async (value: string) => {
    const trimmedValue = value.trim()
    setOpen(true)
    if (!trimmedValue) return
    setError(null)
    setLoading(true)
    setMessages(previous => [
      ...previous,
      { id: `${Date.now()}-user`, role: 'user', text: trimmedValue },
    ])
    setQuery('')
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
      const guideResult = applyActionGuideReleaseVisibility(payload as ActionGuideResult, releaseEnv)
      const assistantText = guideResult.assistant_text || guideResult.explanation || guideResult.title || 'Rehber yaniti hazir.'
      const showAsChat = Boolean(guideResult.conversation_only)
      setResult(showAsChat ? null : guideResult)
      setMessages(previous => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: assistantText,
          result: showAsChat ? null : guideResult,
        },
      ])
    } catch (guideError) {
      const message = guideError instanceof Error ? guideError.message : 'Islem rehberi cevap veremedi.'
      setError(message)
      setResult(null)
      setMessages(previous => [
        ...previous,
        { id: `${Date.now()}-assistant-error`, role: 'assistant', text: message, error: message },
      ])
    } finally {
      setLoading(false)
    }
  }, [currentRoute, pageContext, pathname, permissions.permissions, releaseEnv])

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
    }
    window.addEventListener('eden:open-action-guide', onOpenGuide)
    return () => window.removeEventListener('eden:open-action-guide', onOpenGuide)
  }, [requestGuide])

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
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) {
      setOpen(true)
      return
    }
    await requestGuide(trimmed)
  }

  const panel = (
    <ActionGuidePanel
      open={open}
      result={result}
      messages={messages}
      loading={loading}
      error={error}
      query={query}
      onClose={() => setOpen(false)}
      onQueryChange={setQuery}
      onSubmitQuery={() => void submit()}
    />
  )

  if (headless) return panel

  return (
    <div data-tour-id="action-guide-search" className={compact ? 'relative flex-none' : 'relative min-w-0 flex-none md:min-w-[220px] md:max-w-[420px] md:flex-1'}>
      <form onSubmit={submit} className={compact ? 'hidden' : 'relative hidden md:block'}>
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          onFocus={() => {
            setOpen(true)
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
        }}
        title="AI Rehberine Sor"
        className={`${compact ? 'flex' : 'flex md:hidden'} h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-emerald-700 transition hover:bg-emerald-50 dark:border-gray-700 dark:bg-eden-navy dark:text-emerald-200 dark:hover:bg-emerald-950/40`}
        aria-label="AI rehberine sor"
      >
        <Sparkles size={16} />
      </button>
      {panel}
    </div>
  )
}
function applyActionGuideReleaseVisibility(result: ActionGuideResult, env: ReleaseEnvironment): ActionGuideResult {
  const routeDecision = getRouteReleaseDecision(result.target_page || '/app', env, 'action')
  const releaseBlockMessage = env === 'release'
    ? 'Bu islem henuz canli ortamda kullanima acilmadi.'
    : routeDecision.reason || 'Bu sayfa bu ortamda yayina alinmamis.'

  const suggestedActions = result.suggested_actions.map(action => {
    if (!action.target_page) return action
    const actionDecision = getRouteReleaseDecision(action.target_page, env, 'action')
    if (!actionDecision.visible || !actionDecision.enabled) {
      return {
        ...action,
        disabled: true,
        disabled_reason: env === 'release'
          ? 'Bu islem henuz canli ortamda kullanima acilmadi.'
          : actionDecision.reason || 'Bu sayfa bu ortamda yayina alinmamis.',
      }
    }
    return action
  })

  if (routeDecision.visible && routeDecision.enabled) {
    return {
      ...result,
      suggested_actions: suggestedActions,
    }
  }

  return {
    ...result,
    can_start_now: false,
    blocking_reasons: Array.from(new Set([...result.blocking_reasons, releaseBlockMessage])),
    suggested_actions: suggestedActions.map(action => ({ ...action, disabled: true, disabled_reason: action.disabled_reason || releaseBlockMessage })),
  }
}
