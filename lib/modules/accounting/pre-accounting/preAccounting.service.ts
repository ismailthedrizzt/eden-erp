import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { AccountMovementRow } from '@/lib/modules/accounting/shared/accounting.types'

export interface AccountingReferences {
  persons: any[]
  organizations: any[]
  companies: any[]
}

export const preAccountingService = {
  getList(query: Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> = {}, options?: ApiClientOptions) {
    return apiClient.get<ListResponse<AccountMovementRow>>('/api/muhasebe/on-muhasebe-hareketleri', {
      skipAuth: options?.skipAuth ?? true,
      staleTime: options?.staleTime ?? 120_000,
      query,
      ...options,
    })
  },

  getReferences(options?: ApiClientOptions) {
    return apiClient.get<AccountingReferences>('/api/muhasebe/reference-search', {
      skipAuth: options?.skipAuth ?? true,
      staleTime: options?.staleTime ?? 120_000,
      ...options,
    })
  },

  async create(payload: Record<string, unknown>) {
    const result = await apiClient.post<{ data: AccountMovementRow }>('/api/muhasebe/on-muhasebe-hareketleri', payload)
    preAccountingService.invalidate()
    return result
  },

  async delete(id: string) {
    const result = await apiClient.delete<{ success: true }>(`/api/muhasebe/on-muhasebe-hareketleri/${id}`)
    preAccountingService.invalidate()
    return result
  },

  invalidate() {
    apiClient.invalidate('/api/muhasebe/on-muhasebe-hareketleri')
    apiClient.invalidate('/api/muhasebe/cari-kartlar')
  },
}
