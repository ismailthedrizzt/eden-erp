import type { GeoPoint, GeographicReachDataMode } from '@/lib/modules/companies/services/geographicTradeReach.service'

export interface ReachMapProps {
  points: GeoPoint[]
  dataMode: GeographicReachDataMode
  relationType: string
  onPointClick?: (point: GeoPoint) => void
}

export const TURKEY_CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  istanbul: { x: 18, y: 34 },
  ankara: { x: 45, y: 45 },
  izmir: { x: 20, y: 58 },
  bursa: { x: 24, y: 43 },
  antalya: { x: 42, y: 72 },
  adana: { x: 58, y: 69 },
  konya: { x: 44, y: 61 },
  kayseri: { x: 57, y: 52 },
  samsun: { x: 58, y: 28 },
  trabzon: { x: 76, y: 30 },
  gaziantep: { x: 70, y: 70 },
  diyarbakir: { x: 79, y: 59 },
  erzurum: { x: 82, y: 43 },
}

export const WORLD_COUNTRY_POSITIONS: Record<string, { x: number; y: number }> = {
  turkiye: { x: 55, y: 43 },
  gabon: { x: 50, y: 63 },
  almanya: { x: 49, y: 33 },
  fransa: { x: 46, y: 36 },
  italya: { x: 50, y: 40 },
  ispanya: { x: 43, y: 41 },
  amerika: { x: 19, y: 39 },
  'amerika birleşik devletleri': { x: 19, y: 39 },
  'birleşik krallık': { x: 45, y: 32 },
  cin: { x: 72, y: 45 },
  japonya: { x: 84, y: 45 },
  rusya: { x: 68, y: 27 },
  azerbaycan: { x: 60, y: 43 },
  irak: { x: 57, y: 48 },
  iran: { x: 61, y: 49 },
  misir: { x: 53, y: 52 },
  'guney afrika': { x: 52, y: 78 },
}

export function markerRadius(point: GeoPoint, dataMode: GeographicReachDataMode) {
  if (dataMode === 'trade') {
    const amount = point.trade?.totalAmount || 0
    return Math.max(5, Math.min(18, 5 + Math.sqrt(amount || 0) / 120))
  }

  return Math.max(5, Math.min(18, 5 + point.totalCount * 1.8))
}

export function formatPointTooltip(point: GeoPoint) {
  const lines = [point.city || point.country, `Toplam Bağlantı: ${point.totalCount}`]

  point.relationBreakdown.forEach(item => {
    lines.push(`${item.type}: ${item.count}`)
    item.children?.forEach(child => lines.push(`  - ${child.label}: ${child.count}`))
  })

  if (point.trade && point.trade.transactionCount > 0) {
    lines.push(`İşlem Sayısı: ${point.trade.transactionCount}`)
    lines.push(`Toplam Ticari Hacim: ${formatAmount(point.trade.totalAmount, point.trade.currency)}`)
    if (point.trade.topCounterpartyName) lines.push(`En Büyük Cari: ${point.trade.topCounterpartyName}`)
  } else {
    lines.push('Ticari İşlem: Veri bekleniyor')
  }

  return lines.join('\n')
}

export function normalizeMapKey(value?: string) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

export function fallbackPosition(seed: string, minX: number, maxX: number, minY: number, maxY: number) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973
  }

  return {
    x: minX + (hash % 1000) / 1000 * (maxX - minX),
    y: minY + (Math.floor(hash / 10) % 1000) / 1000 * (maxY - minY),
  }
}

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}
