import fallbackLocations from '@/lib/data/turkey-locations.json'

export interface TurkeyDistrict {
  id: number
  name: string
  officialName?: string
}

export interface TurkeyProvince {
  id: number
  name: string
  officialName?: string
  districts: TurkeyDistrict[]
}

export interface TurkeyLocationsPayload {
  source: Record<string, unknown>
  generatedAt: string
  provinces: TurkeyProvince[]
}

export function getFallbackTurkeyLocations(): TurkeyLocationsPayload {
  return fallbackLocations as TurkeyLocationsPayload
}

export function normalizeTurkeyLocationsPayload(value: unknown): TurkeyLocationsPayload | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<TurkeyLocationsPayload>
  if (!Array.isArray(candidate.provinces)) return null

  return {
    source: candidate.source || {},
    generatedAt: candidate.generatedAt || new Date().toISOString(),
    provinces: candidate.provinces,
  }
}
