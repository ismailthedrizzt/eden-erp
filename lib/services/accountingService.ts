import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { NakitIslem } from '@/types'

export type CashTransactionFilters = {
  islemTarafi?: string
  proje?: string
  type?: 'gelir' | 'gider' | ''
  ara?: string
}

export const accountingService = {
  list(filters: CashTransactionFilters = {}, options: ApiClientOptions = {}) {
    return apiClient.get<{ data: NakitIslem[] }>('/api/muhasebe/islemler', {
      ...options,
      staleTime: options.staleTime ?? 300_000,
      query: {
        islem_tarafi: filters.islemTarafi,
        proje: filters.proje,
        type: filters.type,
        ara: filters.ara,
        ...options.query,
      },
    })
  },
  create(payload: Omit<NakitIslem, 'id' | 'created_at' | 'updated_at'>) {
    return apiClient.post<{ data: NakitIslem }>('/api/muhasebe/islemler', payload)
  },
  update(id: string, payload: Partial<NakitIslem>) {
    return apiClient.patch<{ data: NakitIslem }>(`/api/muhasebe/islemler/${id}`, payload)
  },
  delete(id: string) {
    return apiClient.delete<{ success: true }>(`/api/muhasebe/islemler/${id}`)
  },
  invalidateList() {
    apiClient.invalidate('/api/muhasebe/islemler')
  },
}
