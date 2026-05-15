import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { Birim, NormKadro } from '@/types'

export const organizationService = {
  list(options: ApiClientOptions = {}) {
    return apiClient.get<{ birimler: Birim[]; kadrolar: NormKadro[]; unitTypes?: Array<Record<string, any>> }>('/api/ik/teskilat', {
      ...options,
      skipAuth: options.skipAuth ?? true,
      staleTime: options.staleTime ?? 300_000,
    })
  },
  invalidateList() {
    apiClient.invalidate('/api/ik/teskilat')
  },
}
