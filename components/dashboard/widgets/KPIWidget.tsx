'use client'

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { DashboardWidgetShell } from '../DashboardWidgetShell'
import type { DashboardFilterEvent, KPIWidgetConfig } from '../dashboard.types'
import { cn } from '@/lib/utils'

interface KPIWidgetProps {
  config: KPIWidgetConfig
  onAction?: (event: DashboardFilterEvent) => void
}

export function KPIWidget({ config, onAction }: KPIWidgetProps) {
  const TrendIcon = config.trend?.direction === 'down' ? ArrowDownRight : config.trend?.direction === 'flat' ? ArrowRight : ArrowUpRight

  return (
    <DashboardWidgetShell title={config.title} description={config.description}>
      <button
        type="button"
        onClick={() => onAction?.({ module: config.module, filters: config.filters, widgetId: config.id })}
        className={cn('flex h-full w-full flex-col items-start justify-center rounded-md text-left', onAction && 'cursor-pointer')}
      >
        <div className="text-3xl font-semibold leading-none text-gray-950 dark:text-white">{config.value}</div>
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{config.label || config.title}</div>
        {config.subtitle && <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{config.subtitle}</div>}
        {config.trend && (
          <div className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
            config.trend.direction === 'down' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
          )}>
            <TrendIcon size={13} />
            {config.trend.value}
          </div>
        )}
      </button>
    </DashboardWidgetShell>
  )
}
