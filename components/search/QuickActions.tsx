'use client'

import type { SearchResult } from '@/lib/services/search'
import { SearchResultItem } from './SearchResultItem'

type QuickActionsProps = {
  actions: SearchResult[]
  activeResultId?: string | null
  onSelect: (result: SearchResult) => void
}

export function QuickActions({ actions, activeResultId, onSelect }: QuickActionsProps) {
  if (!actions.length) return null

  return (
    <section className="space-y-2" aria-label="Hizli islemler">
      <div className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
        Hizli islemler
      </div>
      <div className="grid gap-1 md:grid-cols-2">
        {actions.map(action => (
          <SearchResultItem
            key={action.id}
            result={action}
            active={action.id === activeResultId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}
