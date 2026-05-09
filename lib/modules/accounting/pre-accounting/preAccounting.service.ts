import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { AccountMovementRow } from '@/lib/modules/accounting/shared/accounting.types'

export interface AccountingReferences {
  persons: any[]
  organizations: any[]
  companies: any[]
}

export const preAccountingService = {
  getList(options?: ApiClientOptions) {
    return apiClient.get<{ data: AccountMovementRow[]; warning?: string }>('/api/muhasebe/on-muhasebe-hareketleri', options)
  },

  getReferences(options?: ApiClientOptions) {
    return apiClient.get<AccountingReferences>('/api/muhasebe/reference-search', options)
  },

  create(payload: Record<string, unknown>) {
    return apiClient.post<{ data: AccountMovementRow }>('/api/muhasebe/on-muhasebe-hareketleri', payload)
  },

  invalidate() {
    apiClient.invalidate('/api/muhasebe/on-muhasebe-hareketleri')
    apiClient.invalidate('/api/muhasebe/cari-kartlar')
  },
}
