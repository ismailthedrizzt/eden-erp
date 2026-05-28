'use client'

import { AlertTriangle } from 'lucide-react'
import type { KpiCardRecord } from '@/lib/services/reporting'

export function RiskWarningCard({ cards, warnings }: { cards: KpiCardRecord[]; warnings: string[] }) {
  const riskCards = cards.filter(card => card.visible && ['warning', 'critical'].includes(card.status)).slice(0, 6)
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} />
        <h2 className="text-sm font-semibold">Risk ve uyarılar</h2>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        {riskCards.length === 0 && warnings.length === 0 && <p>Kritik uyarı yok.</p>}
        {riskCards.map(card => (
          <div key={card.key} className="rounded-md bg-white/70 px-3 py-2 dark:bg-white/10">
            <strong>{card.title}:</strong> {card.value ?? '-'} · {card.description}
          </div>
        ))}
        {warnings.slice(0, 4).map(warning => (
          <div key={warning} className="rounded-md bg-white/70 px-3 py-2 dark:bg-white/10">{warning}</div>
        ))}
      </div>
    </div>
  )
}
