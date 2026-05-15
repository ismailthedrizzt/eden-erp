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
    return apiClient.get<{ data: AccountCardRow[]; warning?: string }>('/api/muhasebe/cari-kartlar', {
      skipAuth: options?.skipAuth ?? true,
      staleTime: options?.staleTime ?? 120_000,
      ...options,
    })
  },

  async saveFinancialSettings(payload: Record<string, unknown>) {
    const result = await apiClient.post<{ data: unknown }>('/api/muhasebe/cari-kartlar', payload)
    accountCardsService.invalidate()
    return result
  },

  resolveIdentity(payload: AccountCardResolvePayload) {
    return apiClient.post<any>('/api/muhasebe/cari-kartlar/resolve', payload as unknown as Record<string, unknown>)
  },

  invalidate() {
    apiClient.invalidate('/api/muhasebe/cari-kartlar')
  },
}
