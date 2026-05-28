'use client'

import { X } from 'lucide-react'
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
  onClose: () => void
  onStartSystemTour?: () => void
  onPickExample?: (query: string) => void
}

export function ActionGuidePanel({
  open,
  result,
  loading,
  error,
  currentPageTourKey,
  recentQueries = [],
  onClose,
  onStartSystemTour,
  onPickExample,
}: ActionGuidePanelProps) {
  if (!open) return null

  return (
    <div className="fixed left-3 right-3 top-16 z-50 mt-2 max-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 md:absolute md:left-auto md:right-0 md:top-full md:w-[min(92vw,460px)]">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div>
          <div className="text-sm font-semibold text-gray-950 dark:text-white">AI Islem Rehberi</div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Yapmak istediginiz isi dogru sayfa ve sihirbaza cevirir.</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200" aria-label="Rehberi kapat">
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[68vh] overflow-y-auto p-4">
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
