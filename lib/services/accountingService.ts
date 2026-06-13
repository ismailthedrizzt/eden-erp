import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { NakitIslem } from '@/types'

// CODE_LEGACY_ADAPTER: accounting.cash_legacy_adapter
// CODE_LEGACY_DECISION: retain_legacy_cash_adapter_until_accounting_domain_consolidation
// CODE_LEGACY_ALLOWED_FUNCTIONS: accountingService.list, accountingService.create, accountingService.update, accountingService.delete
// CODE_LEGACY_CONSUMER_ROUTES: /app/muhasebe/borclar, /app/muhasebe/dashboard, /app/muhasebe/hesaplar, /app/muhasebe/islemler, /app/muhasebe/projeler
// CODE_LEGACY_CONSUMER_SYMBOLS: useNakitIslemler, accountingService

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
