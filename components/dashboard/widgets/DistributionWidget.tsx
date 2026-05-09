'use client'

import { DashboardWidgetShell } from '../DashboardWidgetShell'
import type { DashboardFilterEvent, DistributionWidgetConfig } from '../dashboard.types'

export function DistributionWidget({ config, onItemClick }: { config: DistributionWidgetConfig; onItemClick?: (event: DashboardFilterEvent) => void }) {
  const total = Math.max(config.items.reduce((sum, item) => sum + item.value, 0), 1)

  return (
    <DashboardWidgetShell title={config.title} description={config.description}>
      <div className="space-y-2">
        {config.items.slice(0, 6).map(item => {
          const pct = Math.round((item.value / total) * 100)
          return (
            <button key={item.label} type="button" onClick={() => onItemClick?.({ module: config.module, filters: item.filter, widgetId: config.id, itemId: item.label })} className="w-full text-left">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-gray-700 dark:text-gray-200">{item.label}</span>
                <span className="text-gray-500">{item.count ?? item.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%`, backgroundColor: item.color }} />
              </div>
            </button>
          )
        })}
      </div>
    </DashboardWidgetShell>
  )
}
