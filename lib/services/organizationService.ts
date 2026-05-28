import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { Birim, NormKadro } from '@/types'

export const organizationService = {
  async list(options: ApiClientOptions = {}) {
    const payload = await apiClient.get<any>('/api/organization', {
      ...options,
      skipAuth: options.skipAuth ?? true,
      staleTime: options.staleTime ?? 300_000,
    })
    return normalizeOrganizationPayload(payload)
  },
  invalidateList() {
    apiClient.invalidate('/api/organization')
  },
}

function normalizeOrganizationPayload(payload: any): { organization_units: Birim[]; positions: NormKadro[]; unitTypes?: Array<Record<string, any>> } {
  const data = payload?.data || payload || {}
  return {
    organization_units: data.organization_units || data.data || payload?.organization_units || [],
    positions: data.positions || payload?.positions || [],
    unitTypes: data.unitTypes || data.unit_types || payload?.unitTypes || [],
  }
}
