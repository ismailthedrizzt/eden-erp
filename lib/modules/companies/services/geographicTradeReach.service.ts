export type GeographicReachMode = 'all' | 'selected'
export type GeographicReachDataMode = 'relationship' | 'trade'
export type GeographicReachLocationScope = 'all' | 'turkey' | 'world'

export interface GeographicTradeReachRequest {
  companyId?: string | null
  mode?: GeographicReachMode
  dataMode?: GeographicReachDataMode
  relationTypes?: string[]
  dateRange?: {
    from?: string
    to?: string
  }
  currency?: string
}

export interface GeographicTradeReachResponse {
  summary: {
    totalCountries: number
    totalCities: number
    totalPoints: number
    totalTradeAmount?: number
    currency?: string
  }
  turkey: GeoPoint[]
  world: GeoPoint[]
}

export interface GeoPoint {
  id: string
  country: string
  city?: string
  lat?: number
  lng?: number
  totalCount: number
  relationBreakdown: {
    type: string
    count: number
    children?: {
      label: string
      count: number
    }[]
  }[]
  trade?: {
    transactionCount: number
    totalAmount: number
    currency: string
    debitAmount?: number
    creditAmount?: number
    topCounterpartyName?: string
  }
}

export async function fetchGeographicTradeReach(params: GeographicTradeReachRequest = {}) {
  const searchParams = new URLSearchParams()

  if (params.companyId) searchParams.set('companyId', params.companyId)
  if (params.mode) searchParams.set('mode', params.mode)
  if (params.dataMode) searchParams.set('dataMode', params.dataMode)
  if (params.relationTypes?.length) searchParams.set('relationTypes', params.relationTypes.join(','))
  if (params.dateRange?.from) searchParams.set('dateFrom', params.dateRange.from)
  if (params.dateRange?.to) searchParams.set('dateTo', params.dateRange.to)
  if (params.currency) searchParams.set('currency', params.currency)

  const response = await fetch(`/api/dashboard/geographic-trade-reach?${searchParams.toString()}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Coğrafi erişim verisi alınamadı')
  }

  return response.json() as Promise<GeographicTradeReachResponse>
}
