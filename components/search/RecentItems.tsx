'use client'

import { Clock } from 'lucide-react'
import type { SearchResult } from '@/lib/services/search'
import { SearchResultItem } from './SearchResultItem'

type RecentItemsProps = {
  items: SearchResult[]
  activeResultId?: string | null
  onSelect: (result: SearchResult) => void
}

export function RecentItems({ items, activeResultId, onSelect }: RecentItemsProps) {
  if (!items.length) return null

  return (
    <section className="space-y-2" aria-label="Son acilanlar">
      <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
        <Clock size={13} />
        Son acilanlar
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <SearchResultItem
            key={item.id}
            result={item}
            active={item.id === activeResultId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}
