'use client'

import type { SearchGroup, SearchResult } from '@/lib/services/search'
import { SearchResultItem } from './SearchResultItem'

type SearchResultGroupProps = {
  group: SearchGroup
  activeResultId?: string | null
  onSelect: (result: SearchResult) => void
}

export function SearchResultGroup({ group, activeResultId, onSelect }: SearchResultGroupProps) {
  if (!group.results.length) return null

  return (
    <section aria-label={group.label} className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
          {group.label}
        </h3>
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{group.total_count}</span>
      </div>
      <div className="space-y-1">
        {group.results.map(result => (
          <SearchResultItem
            key={result.id}
            result={result}
            active={result.id === activeResultId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}
