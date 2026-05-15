import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { Sirket, SirketDokuman, SirketLogo, SirketOrtak, SirketTemsilci } from '@/types/sirket'

type RelationListOptions = ApiClientOptions & { includePassive?: boolean; companyId?: string }

function relationListOptions(options: RelationListOptions = {}) {
  const { includePassive, companyId, ...clientOptions } = options
  return {
    ...clientOptions,
    skipAuth: clientOptions.skipAuth ?? true,
    staleTime: clientOptions.staleTime ?? 120_000,
    query: {
      ...(companyId ? { company_id: companyId } : {}),
      ...(includePassive ? { include_passive: 'true' } : {}),
      ...clientOptions.query,
    },
  }
}

export const companyService = {
  list(options: ApiClientOptions & { includePassive?: boolean } = {}) {
    const { includePassive, ...clientOptions } = options
    return apiClient.get<{ data: Sirket[] }>('/api/sirketler', {
      ...clientOptions,
      skipAuth: clientOptions.skipAuth ?? true,
      staleTime: clientOptions.staleTime ?? 120_000,
      query: {
        ...(includePassive ? { include_passive: 'true' } : {}),
        ...clientOptions.query,
      },
    })
  },
  detail(id: string) {
    return apiClient.get<{ data: Sirket }>(`/api/sirketler/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  partners(companyId: string, options: ApiClientOptions = {}) {
    return apiClient.get<{ data: SirketOrtak[] }>('/api/sirketler/ortaklar', relationListOptions({ ...options, companyId }))
  },
  partnersList(options: RelationListOptions = {}) {
    return apiClient.get<{ data: Array<any> }>('/api/sirketler/ortaklar', {
      ...relationListOptions(options),
    })
  },
  partnerDetail(id: string) {
    return apiClient.get<{ data: any }>(`/api/sirketler/ortaklar/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  representatives(companyId: string, options: ApiClientOptions = {}) {
    return apiClient.get<{ data: SirketTemsilci[] }>('/api/sirketler/temsilciler', relationListOptions({ ...options, companyId }))
  },
  representativesList(options: RelationListOptions = {}) {
    return apiClient.get<{ data: SirketTemsilci[] }>('/api/sirketler/temsilciler', {
      ...relationListOptions(options),
    })
  },
  representativeDetail(id: string) {
    return apiClient.get<{ data: SirketTemsilci }>(`/api/sirketler/temsilciler/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  stakeholdersList(options: RelationListOptions = {}) {
    return apiClient.get<{ data: Array<any> }>('/api/sirketler/paydaslar', {
      ...relationListOptions(options),
    })
  },
  stakeholderDetail(id: string) {
    return apiClient.get<{ data: any }>(`/api/sirketler/paydaslar/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  currentOwnership(companyIds: string[], options: ApiClientOptions = {}) {
    return apiClient.get<{ data: Array<any> }>('/api/companies/current-ownership', {
      ...options,
      skipAuth: options.skipAuth ?? true,
      staleTime: options.staleTime ?? 120_000,
      query: {
        ...(companyIds.length ? { company_ids: companyIds.join(',') } : {}),
        ...options.query,
      },
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
  invalidateRelations() {
    apiClient.invalidate('/api/sirketler/ortaklar')
    apiClient.invalidate('/api/sirketler/temsilciler')
    apiClient.invalidate('/api/sirketler/paydaslar')
  },
}
