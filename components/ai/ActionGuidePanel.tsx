'use client'

import { Search, Sparkles, X } from 'lucide-react'
import type { ActionGuideResult } from '@/lib/ai/actionGuide'
import { ActionGuideEmptyState } from './ActionGuideEmptyState'
import { ActionGuideResultCard } from './ActionGuideResultCard'

interface ActionGuidePanelProps {
  open: boolean
  result: ActionGuideResult | null
  loading?: boolean
  error?: string | null
  currentPageTourKey?: string | null
  recentQueries?: string[]
  query?: string
  onClose: () => void
  onStartSystemTour?: () => void
  onPickExample?: (query: string) => void
  onQueryChange?: (query: string) => void
  onSubmitQuery?: () => void
}

export function ActionGuidePanel({
  open,
  result,
  loading,
  error,
  currentPageTourKey,
  recentQueries = [],
  query = '',
  onClose,
  onStartSystemTour,
  onPickExample,
  onQueryChange,
  onSubmitQuery,
}: ActionGuidePanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full md:mt-2 md:w-[min(92vw,460px)] md:rounded-xl">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div>
          <div className="text-sm font-semibold text-gray-950 dark:text-white">AI Islem Rehberi</div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Yapmak istediginiz isi dogru sayfa ve sihirbaza cevirir.</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200" aria-label="Rehberi kapat">
          <X size={16} />
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmitQuery?.()
        }}
        className="border-b border-gray-100 px-4 py-3 dark:border-gray-800 md:hidden"
      >
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={event => onQueryChange?.(event.target.value)}
            placeholder="Ne yapmak istiyorsunuz?"
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-11 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-100 dark:focus:border-emerald-700 dark:focus:ring-emerald-950"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40" aria-label="Islem rehberine sor">
            <Sparkles size={14} />
          </button>
        </div>
      </form>

      <div className="max-h-[calc(88dvh-9.5rem)] overflow-y-auto p-4 md:max-h-[68vh]">
        {loading && <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">Yol haritasi hazirlaniyor...</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">{error}</div>}
        {!loading && !error && result && <ActionGuideResultCard result={result} onActionExecuted={onClose} />}
        {!loading && !error && !result && (
          <ActionGuideEmptyState
            currentPageTourKey={currentPageTourKey}
            recentQueries={recentQueries}
            onPickExample={onPickExample}
            onStartSystemTour={onStartSystemTour}
          />
        )}
      </div>
    </div>
  )
}
