'use client'

import type { UnifiedActionItem } from '@/lib/action-center/actionCenter.types'
import { ActionCenterItem } from './ActionCenterItem'

type ActionCenterListProps = {
  items: UnifiedActionItem[]
  loading?: boolean
  error?: string | null
  compact?: boolean
  onNavigate?: () => void
}

export function ActionCenterList({ items, loading, error, compact, onNavigate }: ActionCenterListProps) {
  if (loading && !items.length) {
    return <div className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">Bekleyen isler yukleniyor...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </div>
    )
  }

  if (!items.length) {
    return <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Acilacak bekleyen is bulunmuyor.</div>
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <ActionCenterItem key={item.id} item={item} compact={compact} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
