'use client'

import { Globe2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fallbackPosition,
  formatPointTooltip,
  markerRadius,
  normalizeMapKey,
  WORLD_COUNTRY_POSITIONS,
  type ReachMapProps,
} from './reachMap.utils'

export function WorldReachMap({ points, dataMode, onPointClick }: ReachMapProps) {
  const maxCount = Math.max(...points.map(point => point.totalCount), 1)

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-gray-200 bg-slate-50 dark:border-gray-800 dark:bg-slate-950">
      <svg viewBox="0 0 100 70" role="img" aria-label="Dünya erişimi" className="h-full w-full">
        <rect width="100" height="70" rx="7" className="fill-slate-50 dark:fill-slate-950" />
        <path d="M9 25 C15 12 31 14 35 27 C30 39 17 42 10 35 Z" className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700" />
        <path d="M43 18 C52 10 65 14 67 27 C58 31 53 40 45 37 C38 30 38 24 43 18 Z" className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700" />
        <path d="M48 40 C58 38 63 48 58 62 C49 63 44 54 48 40 Z" className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700" />
        <path d="M65 22 C78 15 91 23 88 38 C78 39 69 34 65 22 Z" className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700" />
        <path d="M78 51 C84 47 91 51 93 58 C88 62 80 60 78 51 Z" className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700" />

        {points.map(point => {
          const position = WORLD_COUNTRY_POSITIONS[normalizeMapKey(point.country)] || fallbackPosition(point.country || point.id, 12, 88, 20, 58)
          const radius = markerRadius(point, dataMode)
          const opacity = 0.35 + Math.min(0.45, point.totalCount / maxCount * 0.45)

          return (
            <g
              key={point.id}
              role="button"
              tabIndex={0}
              aria-label={`${point.country} coğrafi erişim filtresi`}
              onClick={() => onPointClick?.(point)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') onPointClick?.(point)
              }}
              className="cursor-pointer outline-none"
            >
              <circle cx={position.x} cy={position.y} r={radius} className="fill-emerald-500" opacity={opacity} />
              <circle cx={position.x} cy={position.y} r={Math.max(3, radius / 2)} className="fill-teal-600 stroke-white dark:stroke-slate-950" strokeWidth="1.2" />
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
        <Globe2 size={12} className="text-teal-600" />
        Ülke bağlantıları
      </span>
    </div>
  )
}
