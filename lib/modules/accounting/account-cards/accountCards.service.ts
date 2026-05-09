import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { AccountCardRow, AccountingEntityKind } from '@/lib/modules/accounting/shared/accounting.types'

export interface AccountCardResolvePayload {
  entityKind: AccountingEntityKind
  identity: {
    nationality?: string
    national_id?: string
    passport_no?: string
    country?: string
    tax_number?: string
    registration_number?: string
  }
}

export const accountCardsService = {
  getList(options?: ApiClientOptions) {
    return apiClient.get<{ data: AccountCardRow[]; warning?: string }>('/api/muhasebe/cari-kartlar', options)
  },

  saveFinancialSettings(payload: Record<string, unknown>) {
    return apiClient.post<{ data: unknown }>('/api/muhasebe/cari-kartlar', payload)
  },

  resolveIdentity(payload: AccountCardResolvePayload) {
    return apiClient.post<any>('/api/muhasebe/cari-kartlar/resolve', payload as unknown as Record<string, unknown>)
  },

  invalidate() {
    apiClient.invalidate('/api/muhasebe/cari-kartlar')
  },
}
