'use client'

import { DashboardWidgetShell } from '../DashboardWidgetShell'
import type { DashboardFilterEvent, StackedBarWidgetConfig } from '../dashboard.types'

const DEFAULT_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#64748b']

interface StackedBarWidgetProps {
  config: StackedBarWidgetConfig
  onSegmentClick?: (event: DashboardFilterEvent) => void
}

export function StackedBarWidget({ config, onSegmentClick }: StackedBarWidgetProps) {
  const rawTotal = config.total ?? config.items.reduce((sum, item) => sum + item.value, 0)
  const total = rawTotal > 0 ? rawTotal : 1
  const normalizedItems = config.items.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    percentage: config.normalize === false ? item.value : (item.value / total) * 100,
  })).filter(item => item.value > 0)

  return (
    <DashboardWidgetShell title={config.title} description={config.description}>
      <div className="flex h-full min-h-[46px] flex-col justify-center">
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          {normalizedItems.length === 0 ? (
            <div className="flex w-full items-center justify-center text-[11px] text-gray-400">Veri yok</div>
          ) : normalizedItems.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              title={`${item.label}: ${Math.round(item.percentage)}%${item.count !== undefined ? ` (${item.count})` : ''}`}
              onClick={() => onSegmentClick?.({
                module: config.module,
                filters: item.filter,
                field: item.filter ? Object.keys(item.filter)[0] : undefined,
                value: item.filter ? Object.values(item.filter)[0] : undefined,
                widgetId: config.id,
                itemId: item.label,
              })}
              className="h-full min-w-[3px] transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white/80"
              style={{ width: `${Math.max(item.percentage, 1.5)}%`, backgroundColor: item.color }}
              aria-label={`${item.label} ${Math.round(item.percentage)}%`}
            />
          ))}
        </div>
        {config.showLegend !== false && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {normalizedItems.slice(0, 4).map((item, index) => (
              <button
                key={`${item.label}-legend-${index}`}
                type="button"
                onClick={() => onSegmentClick?.({ module: config.module, filters: item.filter, widgetId: config.id, itemId: item.label })}
                className="inline-flex min-w-0 items-center gap-1 text-[11px] text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
                title={`${item.label}: ${Math.round(item.percentage)}%`}
              >
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
                <span className="font-medium">{Math.round(item.percentage)}%</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardWidgetShell>
  )
}
