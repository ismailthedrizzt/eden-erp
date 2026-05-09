'use client'

import { usePermissions } from '@/lib/security/permissionStore'
import { cn } from '@/lib/utils'
import type { AnyDashboardWidgetConfig, DashboardFilterEvent } from './dashboard.types'
import { KPIWidget } from './widgets/KPIWidget'
import { StackedBarWidget } from './widgets/StackedBarWidget'
import { DistributionWidget } from './widgets/DistributionWidget'
import { TrendWidget } from './widgets/TrendWidget'
import { ActionListWidget } from './widgets/ActionListWidget'

const mdSpan: Record<number, string> = {
  1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4', 5: 'md:col-span-5', 6: 'md:col-span-6',
}

const xlSpan: Record<number, string> = {
  1: 'xl:col-span-1', 2: 'xl:col-span-2', 3: 'xl:col-span-3', 4: 'xl:col-span-4', 5: 'xl:col-span-5', 6: 'xl:col-span-6',
  7: 'xl:col-span-7', 8: 'xl:col-span-8', 9: 'xl:col-span-9', 10: 'xl:col-span-10', 11: 'xl:col-span-11', 12: 'xl:col-span-12',
}

interface DashboardGridProps {
  widgets: AnyDashboardWidgetConfig[]
  onFilter?: (event: DashboardFilterEvent) => void
  unauthorizedMode?: 'hide' | 'placeholder'
  className?: string
  compact?: boolean
}

export function DashboardGrid({ widgets, onFilter, unauthorizedMode = 'hide', className, compact = false }: DashboardGridProps) {
  const { canAll } = usePermissions()
  const visibleWidgets = widgets.filter(widget => unauthorizedMode === 'placeholder' || canAll(widget.permissions || []))

  if (visibleWidgets.length === 0) return null

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12', compact ? 'gap-2' : 'gap-3', className)}>
      {visibleWidgets.map(widget => {
        const allowed = canAll(widget.permissions || [])
        const w = Math.max(1, Math.min(12, compact ? Math.ceil(widget.size.w / 2) : widget.size.w))
        const h = Math.max(1, widget.size.h)
        return (
          <div
            key={widget.id}
            className={cn('col-span-1 min-w-0', mdSpan[Math.min(w, 6)], xlSpan[w])}
            style={{ minHeight: widget.size.minHeight ?? h * (compact ? 41 : 82) }}
          >
            {!allowed ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
                Bu veriyi görüntüleme yetkiniz yok
              </div>
            ) : (
              <DashboardWidgetRenderer widget={widget} onFilter={onFilter} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DashboardWidgetRenderer({ widget, onFilter }: { widget: AnyDashboardWidgetConfig; onFilter?: (event: DashboardFilterEvent) => void }) {
  switch (widget.type) {
    case 'kpi':
      return <KPIWidget config={widget} onAction={onFilter} />
    case 'stackedBar':
      return <StackedBarWidget config={widget} onSegmentClick={onFilter} />
    case 'distribution':
      return <DistributionWidget config={widget} onItemClick={onFilter} />
    case 'trend':
      return <TrendWidget config={widget} />
    case 'actionList':
      return <ActionListWidget config={widget} onItemClick={onFilter} />
    default:
      return null
  }
}
