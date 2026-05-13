import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { Sirket, SirketDokuman, SirketLogo, SirketOrtak, SirketTemsilci } from '@/types/sirket'

export const companyService = {
  list(options: ApiClientOptions & { includePassive?: boolean } = {}) {
    const { includePassive, ...clientOptions } = options
    return apiClient.get<{ data: Sirket[] }>('/api/sirketler', {
      ...clientOptions,
      query: {
        ...(includePassive ? {} : { is_active: 'true' }),
        ...clientOptions.query,
      },
    })
  },
  detail(id: string) {
    return apiClient.get<{ data: Sirket }>(`/api/sirketler/${id}`)
  },
  partners(companyId: string) {
    return apiClient.get<{ data: SirketOrtak[] }>('/api/sirketler/ortaklar', {
      query: { company_id: companyId },
    })
  },
  representatives(companyId: string) {
    return apiClient.get<{ data: SirketTemsilci[] }>('/api/sirketler/temsilciler', {
      query: { company_id: companyId },
    })
  },
  async documents(companyId: string): Promise<{ data: SirketDokuman[] }> {
    const result = await this.detail(companyId)
    return { data: result.data.dokumanlar || [] }
  },
  async logos(companyId: string): Promise<{ data: SirketLogo[] }> {
    const result = await this.detail(companyId)
    return { data: result.data.logolar || [] }
  },
  invalidateList() {
    apiClient.invalidate('/api/sirketler')
  },
}
