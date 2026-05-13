'use client'

import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeoPoint } from '@/lib/modules/companies/services/geographicTradeReach.service'
import {
  fallbackCoordinate,
  formatPointTooltip,
  markerRadius,
  pointCoordinate,
  type ReachMapProps,
} from './reachMap.utils'

interface OpenStreetMapReachMapProps extends ReachMapProps {
  scope: 'turkey' | 'world'
}

const MAPS = {
  turkey: {
    label: 'Türkiye erişimi',
    center: { lat: 39.0, lng: 35.0 },
    zoom: 5,
    bounds: { north: 42.6, south: 35.5, west: 25.5, east: 45.2 },
  },
  world: {
    label: 'Dünya erişimi',
    center: { lat: 24.0, lng: 18.0 },
    zoom: 2,
    bounds: { north: 72, south: -45, west: -130, east: 145 },
  },
}

export function OpenStreetMapReachMap({ points, dataMode, scope, onPointClick }: OpenStreetMapReachMapProps) {
  const config = MAPS[scope]
  const maxCount = Math.max(...points.map(point => point.totalCount), 1)
  const center = latLngToWorld(config.center.lat, config.center.lng, config.zoom)
  const tiles = buildTiles(config.center.lat, config.center.lng, config.zoom)

  return (
    <div className="relative h-80 overflow-hidden rounded-lg border border-gray-200 bg-slate-100 dark:border-gray-800 dark:bg-slate-950">
      <div className="absolute inset-0" role="img" aria-label={config.label}>
        {tiles.map(tile => (
          <img
            key={`${tile.x}:${tile.y}`}
            alt=""
            draggable={false}
            src={`https://tile.openstreetmap.org/${config.zoom}/${tile.x}/${tile.y}.png`}
            className="absolute h-64 w-64 select-none"
            style={{
              left: `calc(50% + ${tile.left}px)`,
              top: `calc(50% + ${tile.top}px)`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/20 dark:from-slate-950/10 dark:to-slate-950/30" />

      {points.map(point => {
        const coordinate = pointCoordinate(point, scope) || fallbackCoordinate(point.city || point.country || point.id, config.bounds)
        const pixel = latLngToWorld(coordinate.lat, coordinate.lng, config.zoom)
        const left = pixel.x - center.x
        const top = pixel.y - center.y
        const radius = markerRadius(point, dataMode)
        const opacity = 0.35 + Math.min(0.45, point.totalCount / maxCount * 0.45)

        return (
          <button
            key={point.id}
            type="button"
            aria-label={`${point.city || point.country} coğrafi erişim filtresi`}
            onClick={() => onPointClick?.(point)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none ring-offset-2 transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{
              left: `calc(50% + ${left}px)`,
              top: `calc(50% + ${top}px)`,
              width: radius * 2,
              height: radius * 2,
            }}
          >
            <span className="absolute inset-0 rounded-full bg-sky-500" style={{ opacity }} />
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-blue-700 shadow-sm dark:border-slate-950" />
            <span className="sr-only">{formatPointTooltip(point)}</span>
          </button>
        )
      })}

      <div className={cn('absolute left-3 top-3 rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-[11px] text-gray-600 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-300')}>
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} className="text-blue-600" />
          OpenStreetMap altlığı
        </span>
      </div>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-gray-500 shadow-sm hover:text-gray-900 dark:bg-gray-900/90 dark:text-gray-400 dark:hover:text-white"
      >
        © OpenStreetMap
      </a>
    </div>
  )
}

function buildTiles(lat: number, lng: number, zoom: number) {
  const centerTile = latLngToTile(lat, lng, zoom)
  const center = latLngToWorld(lat, lng, zoom)
  const tiles: Array<{ x: number; y: number; left: number; top: number }> = []
  const tileCount = 2 ** zoom

  for (let xOffset = -2; xOffset <= 2; xOffset += 1) {
    for (let yOffset = -2; yOffset <= 2; yOffset += 1) {
      const x = wrapTile(centerTile.x + xOffset, tileCount)
      const y = Math.max(0, Math.min(tileCount - 1, centerTile.y + yOffset))
      tiles.push({
        x,
        y,
        left: (centerTile.x + xOffset) * 256 - center.x,
        top: y * 256 - center.y,
      })
    }
  }

  return tiles
}

function latLngToTile(lat: number, lng: number, zoom: number) {
  const world = latLngToWorld(lat, lng, zoom)
  return {
    x: Math.floor(world.x / 256),
    y: Math.floor(world.y / 256),
  }
}

function latLngToWorld(lat: number, lng: number, zoom: number) {
  const sinLat = Math.sin((Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180)
  const scale = 256 * 2 ** zoom
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  }
}

function wrapTile(value: number, tileCount: number) {
  return ((value % tileCount) + tileCount) % tileCount
}
