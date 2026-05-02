import fallbackTaxOffices from '@/lib/data/tax-offices.json'

export interface TaxOffice {
  id: string
  code: string | null
  name: string
  province: string
  district: string
}

export interface TaxOfficesPayload {
  source: {
    name: string
    url: string
  }
  generatedAt: string
  offices: TaxOffice[]
}

export function normalizeTaxOfficesPayload(value: unknown): TaxOfficesPayload | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Partial<TaxOfficesPayload>
  if (!Array.isArray(payload.offices)) return null
  return {
    source: payload.source || fallbackTaxOffices.source,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    offices: payload.offices.filter((office): office is TaxOffice =>
      !!office && typeof office === 'object' && typeof office.name === 'string'
    ),
  }
}

export function getFallbackTaxOffices(): TaxOfficesPayload {
  return fallbackTaxOffices as TaxOfficesPayload
}
