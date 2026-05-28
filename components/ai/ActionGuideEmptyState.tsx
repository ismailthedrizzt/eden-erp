'use client'

import { HelpCircle, PlayCircle } from 'lucide-react'
import { actionGuideExampleQueries } from '@/lib/action-guide/actionGuideExamples'

interface ActionGuideEmptyStateProps {
  currentPageTourKey?: string | null
  recentQueries?: string[]
  onPickExample?: (query: string) => void
  onStartSystemTour?: () => void
}

export function ActionGuideEmptyState({
  currentPageTourKey,
  recentQueries = [],
  onPickExample,
  onStartSystemTour,
}: ActionGuideEmptyStateProps) {
  const startPageTour = () => {
    window.dispatchEvent(new CustomEvent('eden:start-page-tour', { detail: { tourKey: currentPageTourKey || undefined } }))
  }

  return (
    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        Ne yapmak istediginizi yazin; rehber sizi dogru sayfaya ve varsa dogru sihirbaza yonlendirir.
      </div>
      {!!recentQueries.length && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase text-gray-400 dark:text-gray-500">Son aramalar</div>
          <div className="flex flex-wrap gap-2">
            {recentQueries.map(query => (
              <button
                key={query}
                type="button"
                onClick={() => onPickExample?.(query)}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-2">
        {actionGuideExampleQueries.filter(example => example !== 'Ne yapmak istiyorsunuz?').slice(0, 4).map(example => (
          <button
            key={example}
            type="button"
            onClick={() => onPickExample?.(example)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            {example}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={startPageTour} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
          <HelpCircle size={15} />
          Bu sayfanin turu
        </button>
        <button type="button" onClick={onStartSystemTour} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
          <PlayCircle size={15} />
          Genel tur
        </button>
      </div>
    </div>
  )
}
