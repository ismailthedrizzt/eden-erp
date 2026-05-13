'use client'

import { useMemo, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
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

type MapLayer = 'standard' | 'satellite'

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
    zoom: 1,
    bounds: { north: 72, south: -45, west: -130, east: 145 },
  },
}

const TILE_LAYERS: Record<MapLayer, { label: string; attribution: string; url: (zoom: number, x: number, y: number) => string }> = {
  standard: {
    label: 'Harita',
    attribution: '© OSM',
    url: (zoom, x, y) => `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
  },
  satellite: {
    label: 'Uydu',
    attribution: 'Tiles © Esri',
    url: (zoom, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`,
  },
}

export function OpenStreetMapReachMap({ points, dataMode, scope, onPointClick }: OpenStreetMapReachMapProps) {
  const config = MAPS[scope]
  const [center, setCenter] = useState(config.center)
  const [zoom, setZoom] = useState(config.zoom)
  const [layer, setLayer] = useState<MapLayer>('standard')
  const dragRef = useRef<{
    pointerId: number
    x: number
    y: number
    centerWorld: { x: number; y: number }
    moved: boolean
  } | null>(null)
  const maxCount = Math.max(...points.map(point => point.totalCount), 1)
  const centerWorld = latLngToWorld(center.lat, center.lng, zoom)
  const tiles = useMemo(() => buildTiles(center.lat, center.lng, zoom), [center.lat, center.lng, zoom])
  const tileLayer = TILE_LAYERS[layer]

  const updateZoom = (nextZoom: number, anchor?: { clientX: number; clientY: number; rect: DOMRect }) => {
    const clampedZoom = Math.max(1, Math.min(18, nextZoom))
    if (clampedZoom === zoom) return

    if (!anchor) {
      setZoom(clampedZoom)
      return
    }

    const currentAnchorWorld = {
      x: centerWorld.x + anchor.clientX - anchor.rect.left - anchor.rect.width / 2,
      y: centerWorld.y + anchor.clientY - anchor.rect.top - anchor.rect.height / 2,
    }
    const anchorLatLng = worldToLatLng(currentAnchorWorld.x, currentAnchorWorld.y, zoom)
    const nextAnchorWorld = latLngToWorld(anchorLatLng.lat, anchorLatLng.lng, clampedZoom)
    const nextCenterWorld = {
      x: nextAnchorWorld.x - (anchor.clientX - anchor.rect.left - anchor.rect.width / 2),
      y: nextAnchorWorld.y - (anchor.clientY - anchor.rect.top - anchor.rect.height / 2),
    }

    setCenter(worldToLatLng(nextCenterWorld.x, nextCenterWorld.y, clampedZoom))
    setZoom(clampedZoom)
  }

  return (
    <div
      className="relative h-80 touch-none overscroll-contain overflow-hidden rounded-lg border border-gray-200 bg-slate-100 select-none dark:border-gray-800 dark:bg-slate-950"
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('button, a')) return
        event.preventDefault()
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          centerWorld,
          moved: false,
        }
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        event.preventDefault()
        event.stopPropagation()
        const deltaX = event.clientX - drag.x
        const deltaY = event.clientY - drag.y
        if (Math.abs(deltaX) + Math.abs(deltaY) > 3) drag.moved = true
        setCenter(worldToLatLng(drag.centerWorld.x - deltaX, drag.centerWorld.y - deltaY, zoom))
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
      }}
      onPointerCancel={(event) => {
        event.stopPropagation()
        if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
      }}
      onWheel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        updateZoom(zoom + (event.deltaY < 0 ? 1 : -1), {
          clientX: event.clientX,
          clientY: event.clientY,
          rect: event.currentTarget.getBoundingClientRect(),
        })
      }}
    >
      <div className="absolute inset-0" role="img" aria-label={config.label}>
        {tiles.map(tile => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${tile.x}:${tile.y}`}
            alt=""
            draggable={false}
            src={tileLayer.url(zoom, tile.x, tile.y)}
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
        const pixel = latLngToWorld(coordinate.lat, coordinate.lng, zoom)
        const left = pixel.x - centerWorld.x
        const top = pixel.y - centerWorld.y
        const radius = markerRadius(point, dataMode)
        const opacity = 0.35 + Math.min(0.45, point.totalCount / maxCount * 0.45)

        return (
          <button
            key={point.id}
            type="button"
            aria-label={`${point.city || point.country} coğrafi erişim filtresi`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onPointClick?.(point)
            }}
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

      <div className="absolute left-3 top-3 overflow-hidden rounded-md border border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90" onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={() => updateZoom(zoom + 1)}
          className="flex h-8 w-8 items-center justify-center text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          title="Yakınlaştır"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={() => updateZoom(zoom - 1)}
          className="flex h-8 w-8 items-center justify-center border-t border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
          title="Uzaklaştır"
        >
          <Minus size={15} />
        </button>
      </div>

      <div className="absolute right-3 top-3 inline-flex overflow-hidden rounded-md border border-gray-200 bg-white/90 text-xs font-medium shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90" onPointerDown={(event) => event.stopPropagation()}>
        {(Object.keys(TILE_LAYERS) as MapLayer[]).map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setLayer(item)}
            className={`h-8 px-3 transition ${
              layer === item
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            {TILE_LAYERS[item].label}
          </button>
        ))}
      </div>
      <a
        href={layer === 'standard' ? 'https://www.openstreetmap.org/copyright' : 'https://www.esri.com/en-us/legal/terms/full-master-agreement'}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-gray-500 shadow-sm hover:text-gray-900 dark:bg-gray-900/90 dark:text-gray-400 dark:hover:text-white"
      >
        {tileLayer.attribution}
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

function worldToLatLng(x: number, y: number, zoom: number) {
  const scale = 256 * 2 ** zoom
  const lng = x / scale * 360 - 180
  const n = Math.PI - 2 * Math.PI * y / scale
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return { lat, lng }
}

function wrapTile(value: number, tileCount: number) {
  return ((value % tileCount) + tileCount) % tileCount
}
