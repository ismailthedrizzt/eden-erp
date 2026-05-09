import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { Birim, NormKadro } from '@/types'

export const organizationService = {
  list(options: ApiClientOptions = {}) {
    return apiClient.get<{ birimler: Birim[]; kadrolar: NormKadro[] }>('/api/ik/teskilat', options)
  },
  invalidateList() {
    apiClient.invalidate('/api/ik/teskilat')
  },
}
