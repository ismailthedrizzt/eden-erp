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

export const TURKEY_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  adana: { lat: 37.0, lng: 35.3213 },
  ankara: { lat: 39.9334, lng: 32.8597 },
  antalya: { lat: 36.8969, lng: 30.7133 },
  bursa: { lat: 40.1826, lng: 29.0665 },
  diyarbakir: { lat: 37.9144, lng: 40.2306 },
  erzurum: { lat: 39.9000, lng: 41.2700 },
  gaziantep: { lat: 37.0662, lng: 37.3833 },
  istanbul: { lat: 41.0082, lng: 28.9784 },
  izmir: { lat: 38.4237, lng: 27.1428 },
  kayseri: { lat: 38.7205, lng: 35.4826 },
  konya: { lat: 37.8746, lng: 32.4932 },
  samsun: { lat: 41.2867, lng: 36.33 },
  trabzon: { lat: 41.0027, lng: 39.7168 },
}

export const WORLD_COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  almanya: { lat: 51.1657, lng: 10.4515 },
  amerika: { lat: 39.8283, lng: -98.5795 },
  'amerika birlesik devletleri': { lat: 39.8283, lng: -98.5795 },
  'amerika birleşik devletleri': { lat: 39.8283, lng: -98.5795 },
  azerbaycan: { lat: 40.1431, lng: 47.5769 },
  'birlesik krallik': { lat: 55.3781, lng: -3.4360 },
  'birleşik krallık': { lat: 55.3781, lng: -3.4360 },
  cin: { lat: 35.8617, lng: 104.1954 },
  fransa: { lat: 46.2276, lng: 2.2137 },
  gabon: { lat: -0.8037, lng: 11.6094 },
  'guney afrika': { lat: -30.5595, lng: 22.9375 },
  irak: { lat: 33.2232, lng: 43.6793 },
  iran: { lat: 32.4279, lng: 53.6880 },
  ispanya: { lat: 40.4637, lng: -3.7492 },
  italya: { lat: 41.8719, lng: 12.5674 },
  japonya: { lat: 36.2048, lng: 138.2529 },
  misir: { lat: 26.8206, lng: 30.8025 },
  singapur: { lat: 1.3521, lng: 103.8198 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  sg: { lat: 1.3521, lng: 103.8198 },
  'birlesik arap emirlikleri': { lat: 23.4241, lng: 53.8478 },
  'birleşik arap emirlikleri': { lat: 23.4241, lng: 53.8478 },
  bae: { lat: 23.4241, lng: 53.8478 },
  malezya: { lat: 4.2105, lng: 101.9758 },
  endonezya: { lat: -0.7893, lng: 113.9213 },
  hindistan: { lat: 20.5937, lng: 78.9629 },
  pakistan: { lat: 30.3753, lng: 69.3451 },
  banglades: { lat: 23.6850, lng: 90.3563 },
  'suudi arabistan': { lat: 23.8859, lng: 45.0792 },
  katar: { lat: 25.3548, lng: 51.1839 },
  kuveyt: { lat: 29.3117, lng: 47.4818 },
  umman: { lat: 21.4735, lng: 55.9754 },
  bahreyn: { lat: 26.0667, lng: 50.5577 },
  rusya: { lat: 61.5240, lng: 105.3188 },
  turkiye: { lat: 38.9637, lng: 35.2433 },
  türkiye: { lat: 38.9637, lng: 35.2433 },
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

export function pointCoordinate(point: GeoPoint, scope: 'turkey' | 'world') {
  if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
    return { lat: Number(point.lat), lng: Number(point.lng) }
  }

  if (scope === 'turkey') {
    return TURKEY_CITY_COORDINATES[normalizeMapKey(point.city)] || TURKEY_CITY_COORDINATES[normalizeMapKey(point.country)]
  }

  return WORLD_COUNTRY_COORDINATES[normalizeMapKey(point.country)]
}

export function fallbackCoordinate(seed: string, bounds: { north: number; south: number; west: number; east: number }) {
  const position = fallbackPosition(seed, 0, 1, 0, 1)
  return {
    lat: bounds.north - position.y * (bounds.north - bounds.south),
    lng: bounds.west + position.x * (bounds.east - bounds.west),
  }
}

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}
