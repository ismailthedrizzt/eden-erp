'use client'

import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeoPoint } from '@/lib/modules/companies/services/geographicTradeReach.service'
import {
  fallbackPosition,
  formatPointTooltip,
  markerRadius,
  normalizeMapKey,
  TURKEY_CITY_POSITIONS,
  type ReachMapProps,
} from './reachMap.utils'

export function TurkeyReachMap({ points, dataMode, onPointClick }: ReachMapProps) {
  const maxCount = Math.max(...points.map(point => point.totalCount), 1)

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-gray-200 bg-slate-50 dark:border-gray-800 dark:bg-slate-950">
      <svg viewBox="0 0 100 70" role="img" aria-label="Türkiye erişimi" className="h-full w-full">
        <path
          d="M7 35 C15 24 30 22 42 27 C54 18 70 23 86 29 C93 32 96 40 90 48 C75 60 56 60 38 56 C25 55 12 50 7 42 Z"
          className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700"
          strokeWidth="1.2"
        />
        <path
          d="M18 36 C31 31 43 35 55 33 C67 31 78 34 87 40"
          className="fill-none stroke-slate-200 dark:stroke-slate-800"
          strokeWidth="0.8"
        />
        {points.map(point => {
          const position = TURKEY_CITY_POSITIONS[normalizeMapKey(point.city)] || fallbackPosition(point.city || point.id, 14, 88, 27, 58)
          const radius = markerRadius(point, dataMode)
          const opacity = 0.35 + Math.min(0.45, point.totalCount / maxCount * 0.45)

          return (
            <g
              key={point.id}
              role="button"
              tabIndex={0}
              aria-label={`${point.city || point.country} coğrafi erişim filtresi`}
              onClick={() => onPointClick?.(point)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') onPointClick?.(point)
              }}
              className="cursor-pointer outline-none"
            >
              <circle cx={position.x} cy={position.y} r={radius} className="fill-sky-500" opacity={opacity} />
              <circle cx={position.x} cy={position.y} r={Math.max(3, radius / 2)} className="fill-blue-600 stroke-white dark:stroke-slate-950" strokeWidth="1.2" />
              <title>{formatPointTooltip(point)}</title>
            </g>
          )
        })}
      </svg>

      <MapLegend className="left-3 top-3" />
    </div>
  )
}

function MapLegend({ className }: { className?: string }) {
  return (
    <div className={cn('absolute rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-[11px] text-gray-600 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-300', className)}>
      <span className="inline-flex items-center gap-1">
        <MapPin size={12} className="text-blue-600" />
        Bağlantı yoğunluğu
      </span>
    </div>
  )
}
