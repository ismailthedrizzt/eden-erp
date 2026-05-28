'use client'

import type { ChartDatasetRecord } from '@/lib/services/reporting'

export function StatusDistributionChart({ chart }: { chart: ChartDatasetRecord }) {
  const rows = chart.data.map(item => ({
    label: String(item.label ?? ''),
    value: Number(item.value ?? 0),
  }))
  const total = rows.reduce((sum, item) => sum + item.value, 0) || 1
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{chart.title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map(item => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
              <div className={`h-2 rounded-full ${barTone(item.label)}`} style={{ width: `${Math.min(100, (item.value / total) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function barTone(label: string) {
  if (label === 'critical') return 'bg-red-500'
  if (label === 'warning') return 'bg-amber-500'
  if (label === 'normal') return 'bg-emerald-500'
  return 'bg-sky-500'
}
