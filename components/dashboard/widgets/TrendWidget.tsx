'use client'

import { DashboardWidgetShell } from '../DashboardWidgetShell'
import type { TrendWidgetConfig } from '../dashboard.types'

export function TrendWidget({ config }: { config: TrendWidgetConfig }) {
  const max = Math.max(...config.points.map(point => point.value), 1)

  return (
    <DashboardWidgetShell title={config.title} description={config.description}>
      <div className="flex h-full min-h-[90px] items-end gap-1">
        {config.points.map(point => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t bg-blue-600/80" title={`${point.label}: ${point.value}`} style={{ height: `${Math.max((point.value / max) * 72, 4)}px` }} />
            <span className="max-w-full truncate text-[10px] text-gray-500">{point.label}</span>
          </div>
        ))}
      </div>
    </DashboardWidgetShell>
  )
}
