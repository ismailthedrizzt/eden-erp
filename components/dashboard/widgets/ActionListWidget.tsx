'use client'

import { DashboardWidgetShell } from '../DashboardWidgetShell'
import type { ActionListWidgetConfig, DashboardFilterEvent } from '../dashboard.types'
import { cn } from '@/lib/utils'

export function ActionListWidget({ config, onItemClick }: { config: ActionListWidgetConfig; onItemClick?: (event: DashboardFilterEvent) => void }) {
  return (
    <DashboardWidgetShell title={config.title} description={config.description}>
      <div className="space-y-1.5">
        {config.items.length === 0 ? (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800">Aksiyon yok</div>
        ) : config.items.slice(0, 5).map(item => (
          <button key={item.id} type="button" onClick={() => onItemClick?.({ module: config.module, filters: item.filter, widgetId: config.id, itemId: item.id })} className="flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-gray-800 dark:text-gray-100">{item.label}</span>
              {item.description && <span className="block truncate text-[11px] text-gray-500">{item.description}</span>}
            </span>
            {item.dueText && (
              <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-[10px]', item.severity === 'danger' ? 'bg-red-50 text-red-700' : item.severity === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}>
                {item.dueText}
              </span>
            )}
          </button>
        ))}
      </div>
    </DashboardWidgetShell>
  )
}
