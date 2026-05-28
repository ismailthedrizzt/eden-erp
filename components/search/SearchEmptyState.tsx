'use client'

import { FolderSearch, Sparkles } from 'lucide-react'
import type { SearchSuggestion } from '@/lib/services/search'

type SearchEmptyStateProps = {
  query: string
  suggestions: SearchSuggestion[]
  onPickSuggestion: (query: string) => void
}

export function SearchEmptyState({ query, suggestions, onPickSuggestion }: SearchEmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-500">
        <FolderSearch size={22} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {query.trim() ? 'Sonuc bulunamadi' : 'Ne aramak istiyorsunuz?'}
      </h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500 dark:text-gray-400">
        {query.trim()
          ? 'Farkli bir kelime deneyin veya yapmak istediginiz islemi yazin.'
          : 'Sirket, sube, gorev, belge, rapor veya bir islem adi yazarak baslayin.'}
      </p>
      {!!suggestions.length && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestions.slice(0, 5).map(suggestion => (
            <button
              key={`${suggestion.type}-${suggestion.text}`}
              type="button"
              onClick={() => onPickSuggestion(suggestion.text)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-eden-blue hover:text-eden-blue dark:border-gray-700 dark:bg-eden-navy-2 dark:text-gray-300 dark:hover:border-sky-500 dark:hover:text-white"
            >
              <Sparkles size={12} />
              {suggestion.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
