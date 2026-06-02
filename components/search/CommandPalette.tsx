'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Command, CornerDownLeft, Loader2, Search, X } from 'lucide-react'
import { useActionGuideContext } from '@/components/ai/ActionGuideContext'
import { cn } from '@/lib/utils'
import { commandPaletteService } from '@/lib/services/search'
import { searchService, type SearchGroup, type SearchResult, type SearchSuggestion } from '@/lib/services/search'
import { getCurrentReleaseEnvironment, type ReleaseEnvironment } from '@/lib/release/environment'
import { getRouteReleaseDecision } from '@/lib/release/releaseVisibility'
import { QuickActions } from './QuickActions'
import { RecentItems } from './RecentItems'
import { SearchEmptyState } from './SearchEmptyState'
import { SearchResultGroup } from './SearchResultGroup'

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MIN_QUERY_LENGTH = 2

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { pageContext } = useActionGuideContext()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [quickActions, setQuickActions] = useState<SearchResult[]>([])
  const [recentItems, setRecentItems] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const releaseEnv = getCurrentReleaseEnvironment()
  const showDiscoveryLists = query.trim().length < MIN_QUERY_LENGTH
  const visibleGroups = useMemo(
    () => showDiscoveryLists ? groups.filter(group => group.key !== 'actions') : groups,
    [groups, showDiscoveryLists]
  )

  const flatResults = useMemo(
    () => [
      ...visibleGroups.flatMap(group => group.results),
      ...(showDiscoveryLists ? recentItems : []),
      ...(showDiscoveryLists ? quickActions : []),
    ],
    [quickActions, recentItems, showDiscoveryLists, visibleGroups]
  )
  const activeResult = flatResults[activeIndex] || null

  const runSearch = useCallback(async (value: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await commandPaletteService.query({
        query: value,
        current_page: pageContext.currentPage || pathname,
        selected_record_type: pageContext.selectedRecordType || null,
        selected_record_id: pageContext.selectedRecordId || null,
        limit: 30,
      })
      setGroups(filterSearchGroupsForRelease(response.grouped_results || [], releaseEnv))
      setQuickActions(filterSearchResultsForRelease(response.quick_actions || [], releaseEnv))
      setRecentItems(filterSearchResultsForRelease(response.recent_items || [], releaseEnv))
      setSuggestions(response.suggestions || [])
      setWarnings(response.warnings || [])
      setActiveIndex(0)
    } catch (searchError) {
      setGroups([])
      setQuickActions([])
      setRecentItems([])
      setSuggestions([])
      setWarnings([])
      setError(searchError instanceof Error ? searchError.message : 'Arama servisi cevap veremedi.')
    } finally {
      setLoading(false)
    }
  }, [pageContext.currentPage, pageContext.selectedRecordId, pageContext.selectedRecordType, pathname, releaseEnv])

  const selectResult = useCallback((result: SearchResult) => {
    if (result.disabled) return

    if (result.entity_type && result.entity_id) {
      searchService.recordRecent({
        entity_type: result.entity_type,
        entity_id: result.entity_id,
        title: result.title,
        target_page: result.target_page,
        module_key: result.module_key,
      }).catch(() => undefined)
    }

    if (result.action_key) {
      window.dispatchEvent(new CustomEvent('eden:action-guide-command', {
        detail: {
          actionKey: result.action_key,
          wizardKey: typeof result.metadata?.wizard_key === 'string' ? result.metadata.wizard_key : undefined,
          source: 'command_palette',
        },
      }))
    }

    onOpenChange(false)
    router.push(result.target_page || '/app')
  }, [onOpenChange, router])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH) {
      setGroups([])
      setActiveIndex(0)
      return
    }
    const timer = window.setTimeout(() => {
      void runSearch(trimmed)
    }, trimmed ? 220 : 0)
    return () => window.clearTimeout(timer)
  }, [open, query, runSearch])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex(index => flatResults.length ? (index + 1) % flatResults.length : 0)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex(index => flatResults.length ? (index - 1 + flatResults.length) % flatResults.length : 0)
        return
      }
      if (event.key === 'Enter' && activeResult) {
        event.preventDefault()
        selectResult(activeResult)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeResult, flatResults.length, onOpenChange, open, selectResult])

  useEffect(() => {
    if (activeIndex >= flatResults.length) setActiveIndex(0)
  }, [activeIndex, flatResults.length])

  const pickSuggestion = (value: string) => {
    setQuery(value)
    inputRef.current?.focus()
  }

  if (!open) return null

  const tooShort = query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH
  const hasResults = flatResults.length > 0

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Global arama">
      <button
        type="button"
        aria-label="Aramayi kapat"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute inset-x-0 top-0 mx-auto flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-eden-navy-2 sm:top-8 sm:h-[min(760px,calc(100vh-4rem))] sm:max-w-3xl sm:rounded-xl sm:border sm:border-gray-200 dark:sm:border-gray-700">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-eden-blue/10 text-eden-blue dark:bg-sky-950/50 dark:text-sky-200">
            <Command size={17} />
          </span>
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              role="combobox"
              aria-expanded="true"
              aria-controls="global-search-results"
              aria-activedescendant={activeResult?.id}
              placeholder="Sirket, sube, gorev veya belge ara..."
              className="h-10 w-full bg-transparent pl-7 pr-3 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
            />
          </div>
          {loading && <Loader2 size={18} className="shrink-0 animate-spin text-gray-400" />}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-eden-navy dark:hover:text-gray-100"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div id="global-search-results" className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" role="listbox">
          {error && (
            <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-200">
              {error}
            </div>
          )}
          {tooShort && (
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-400">
              En az 2 karakter yazin veya hizli islemlerden birini secin.
            </div>
          )}
          {!!warnings.length && !error && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
              Bazi kaynaklar su anda sinirli sonuc dondurdu.
            </div>
          )}

          <div className={cn('space-y-5', loading && !hasResults && 'opacity-60')}>
            {visibleGroups.map(group => (
              <SearchResultGroup
                key={group.key}
                group={group}
                activeResultId={activeResult?.id}
                onSelect={selectResult}
              />
            ))}

            {showDiscoveryLists && (
              <>
                <RecentItems items={recentItems} activeResultId={activeResult?.id} onSelect={selectResult} />
                <QuickActions actions={quickActions} activeResultId={activeResult?.id} onSelect={selectResult} />
              </>
            )}

            {!loading && !hasResults && (
              <SearchEmptyState query={query} suggestions={suggestions} onPickSuggestion={pickSuggestion} />
            )}
          </div>
        </div>

        <div className="hidden items-center justify-between border-t border-gray-200 px-4 py-2 text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500 sm:flex">
          <span>Ok tuslari ile gezin</span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft size={13} />
            Sec
          </span>
        </div>
      </div>
    </div>
  )
}

function filterSearchGroupsForRelease(groups: SearchGroup[], env: ReleaseEnvironment): SearchGroup[] {
  return groups
    .map(group => {
      const results = filterSearchResultsForRelease(group.results, env)
      return {
        ...group,
        results,
        total_count: results.length,
      }
    })
    .filter(group => group.results.length > 0)
}

function filterSearchResultsForRelease(results: SearchResult[], env: ReleaseEnvironment): SearchResult[] {
  const visibleResults: SearchResult[] = []

  for (const result of results) {
    const decision = getRouteReleaseDecision(result.target_page || '/app', env, 'commandPalette')
    if (!decision.visible) continue

    visibleResults.push({
      ...result,
      badge: decision.badgeLabel || result.badge,
      disabled: result.disabled || !decision.enabled,
      disabled_reason: !decision.enabled
        ? decision.reason
        : result.disabled_reason,
    })
  }

  return visibleResults
}
