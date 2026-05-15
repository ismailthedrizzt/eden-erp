import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { Sirket, SirketDokuman, SirketLogo, SirketOrtak, SirketTemsilci } from '@/types/sirket'

type RelationListOptions = ApiClientOptions & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & { includePassive?: boolean; companyId?: string }
type CompanyListOptions = ApiClientOptions & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & { includePassive?: boolean }

function relationListOptions(options: RelationListOptions = {}) {
  const { includePassive, companyId, ...clientOptions } = options
  return {
    ...clientOptions,
    skipAuth: clientOptions.skipAuth ?? true,
    staleTime: clientOptions.staleTime ?? 120_000,
    query: {
      ...(companyId ? { company_id: companyId } : {}),
      ...(includePassive ? { include_passive: 'true' } : {}),
      page: clientOptions.query?.page ?? options.page,
      pageSize: clientOptions.query?.pageSize ?? options.pageSize,
      search: clientOptions.query?.search ?? options.search,
      sort: clientOptions.query?.sort ?? options.sort,
      direction: clientOptions.query?.direction ?? options.direction,
      ...clientOptions.query,
    },
  }
}

export const companyService = {
  list(options: CompanyListOptions = {}) {
    const { includePassive, page, pageSize, search, sort, direction, ...clientOptions } = options
    return apiClient.get<ListResponse<Sirket>>('/api/sirketler', {
      ...clientOptions,
      skipAuth: clientOptions.skipAuth ?? true,
      staleTime: clientOptions.staleTime ?? 120_000,
      query: {
        page,
        pageSize,
        search,
        sort,
        direction,
        ...(includePassive ? { include_passive: 'true' } : {}),
        ...clientOptions.query,
      },
    })
  },
  detail(id: string) {
    return apiClient.get<{ data: Sirket }>(`/api/sirketler/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  detailSection(id: string, section: 'hero' | 'media' | 'details') {
    return apiClient.get<{ data: Partial<Sirket> }>(`/api/sirketler/${id}`, {
      skipAuth: true,
      staleTime: 120_000,
      query: { section },
    })
  },
  partners(companyId: string, options: ApiClientOptions = {}) {
    return apiClient.get<{ data: SirketOrtak[] }>('/api/sirketler/ortaklar', relationListOptions({ ...options, companyId }))
  },
  partnersList(options: RelationListOptions = {}) {
    return apiClient.get<ListResponse<Array<any>[number]>>('/api/sirketler/ortaklar', {
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
    return apiClient.get<ListResponse<SirketTemsilci>>('/api/sirketler/temsilciler', {
      ...relationListOptions(options),
    })
  },
  representativeDetail(id: string) {
    return apiClient.get<{ data: SirketTemsilci }>(`/api/sirketler/temsilciler/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  stakeholdersList(options: RelationListOptions = {}) {
    return apiClient.get<ListResponse<Array<any>[number]>>('/api/sirketler/paydaslar', {
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
