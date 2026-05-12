export interface TradeRegistryOffice {
  id: string
  name: string
}

export interface TradeRegistryOfficesPayload {
  source: {
    name: string
    url: string
  }
  generatedAt: string
  offices: TradeRegistryOffice[]
}

export const TRADE_REGISTRY_OFFICES_SOURCE_URL = 'https://www.ticaretsicil.gov.tr/view/menu/mudurlukler.php'

const SOURCE = {
  name: 'TOBB - Türkiye Ticaret Sicili Gazetesi Ticaret Sicili Müdürlükleri',
  url: TRADE_REGISTRY_OFFICES_SOURCE_URL,
}

export function normalizeTradeRegistryOfficesPayload(value: unknown): TradeRegistryOfficesPayload | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Partial<TradeRegistryOfficesPayload>
  if (!Array.isArray(payload.offices)) return null
  const offices = payload.offices.filter((office): office is TradeRegistryOffice =>
    !!office && typeof office === 'object' && typeof office.name === 'string'
  )
  if (offices.length === 0) return null

  return {
    source: payload.source || SOURCE,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    offices,
  }
}

export async function buildTradeRegistryOfficesPayload(): Promise<TradeRegistryOfficesPayload> {
  const response = await fetch(TRADE_REGISTRY_OFFICES_SOURCE_URL, {
    headers: { 'User-Agent': 'eden-erp-reference-updater' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Trade registry offices fetch failed: ${response.status}`)
  }

  const html = await response.text()
  const offices = parseTradeRegistryOffices(html)
  if (offices.length < 200) {
    throw new Error(`Trade registry offices parse failed: ${offices.length} offices found`)
  }

  return {
    source: SOURCE,
    generatedAt: new Date().toISOString(),
    offices,
  }
}

export function parseTradeRegistryOffices(html: string): TradeRegistryOffice[] {
  const selectMatch = html.match(/<select[^>]+id=["']SicilMudurluguId["'][\s\S]*?<\/select>/i)
  const selectHtml = selectMatch?.[0] || html
  const seen = new Set<string>()

  return [...selectHtml.matchAll(/<option\s+value=["'](\d+)["'][^>]*>([^<]+)<\/option>/gi)]
    .map(match => ({
      id: match[1],
      name: decodeHtml(match[2]).trim(),
    }))
    .filter(office => office.id !== '0' && office.name && !seen.has(office.name) && seen.add(office.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
