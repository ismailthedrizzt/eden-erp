'use client'

import { Sparkles } from 'lucide-react'

interface RecordSummaryCardProps {
  label?: string | null
  entityType?: string | null
  entityId?: string | null
}

export function RecordSummaryCard({ label, entityType, entityId }: RecordSummaryCardProps) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('eden:open-ai-copilot', {
        detail: { query: `${label || entityType || entityId || 'Bu kayit'} icin ozet ver`, mode: 'record_summary' },
      }))}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-300/20 dark:text-blue-200 dark:hover:bg-blue-400/10"
    >
      <Sparkles size={15} />
      AI ile ozetle
    </button>
  )
}
