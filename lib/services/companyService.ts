import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { Sirket, SirketDokuman, SirketLogo, SirketOrtak, SirketTemsilci } from '@/types/sirket'
import {
  createEntityRecord,
  deleteEntityRecord,
  listEntityRecords,
  readEntityRecord,
  updateEntityRecord,
} from '@/lib/crud/entityCrudClient'

type RelationListOptions = ApiClientOptions & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & { includePassive?: boolean; companyId?: string; statuses?: string[] }
type CompanyListOptions = ApiClientOptions & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & { includePassive?: boolean; statuses?: string[] }

function relationListOptions(options: RelationListOptions = {}) {
  const { includePassive, companyId, statuses, ...clientOptions } = options
  return {
    ...clientOptions,
    skipAuth: clientOptions.skipAuth ?? true,
    staleTime: clientOptions.staleTime ?? 120_000,
    query: {
      ...(companyId ? { company_id: companyId } : {}),
      ...(includePassive ? { include_passive: 'true' } : {}),
      ...(statuses?.length ? { statuses: statuses.join(',') } : {}),
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
    const { includePassive, statuses, page, pageSize, search, sort, direction, ...clientOptions } = options
    return listEntityRecords<Sirket>({
      endpoint: { collectionPath: '/api/companies' },
      query: {
        page,
        pageSize,
        search,
        sort,
        direction,
        ...(includePassive ? { include_passive: 'true' } : {}),
        ...(statuses?.length ? { statuses: statuses.join(',') } : {}),
        ...(clientOptions.useCache === false ? { _refresh: Date.now() } : {}),
      },
      options: {
      ...clientOptions,
      skipAuth: clientOptions.skipAuth ?? true,
      staleTime: clientOptions.staleTime ?? 300_000,
      },
    })
  },
  detail(id: string) {
    return readEntityRecord<Sirket>({
      endpoint: { collectionPath: '/api/companies' },
      id,
      options: { skipAuth: true, staleTime: 120_000 },
    })
  },
  detailSection(id: string, section: 'hero' | 'media' | 'mediaMetadata' | 'details' | 'profile' | 'relationsSummary' | 'history') {
    return readEntityRecord<Partial<Sirket>>({
      endpoint: { collectionPath: '/api/companies' },
      id,
      query: { section },
      options: {
        skipAuth: true,
        useCache: false,
      },
    })
  },
  create(payload: Record<string, any>) {
    return createEntityRecord<Sirket>({ collectionPath: '/api/companies' }, payload)
  },
  update(id: string, payload: Record<string, any>) {
    return updateEntityRecord<Sirket>({ collectionPath: '/api/companies' }, id, payload)
  },
  delete(id: string) {
    return deleteEntityRecord<{ success?: boolean; hardDeleted?: boolean }>({
      endpoint: { collectionPath: '/api/companies' },
      id,
    })
  },
  capitalIncreasePrecheck(companyId: string) {
    return apiClient.get<{ data: any }>(`/api/companies/${companyId}/capital-increases/precheck`, {
      useCache: false,
    })
  },
  completeCapitalIncrease(companyId: string, payload: Record<string, any>) {
    return apiClient.post<{ data: any }>(`/api/companies/${companyId}/capital-increases`, payload)
  },
  partners(companyId: string, options: ApiClientOptions = {}) {
    return apiClient.get<{ data: SirketOrtak[] }>('/api/companies/partners', relationListOptions({ ...options, companyId }))
  },
  partnersList(options: RelationListOptions = {}) {
    return apiClient.get<ListResponse<Array<any>[number]>>('/api/companies/partners', {
      ...relationListOptions(options),
    })
  },
  partnerDetail(id: string) {
    return readEntityRecord<any>({
      endpoint: { collectionPath: '/api/companies/partners' },
      id,
      options: { skipAuth: true, staleTime: 120_000 },
    })
  },
  partnerDetailSection(id: string, section: 'authorities' | 'relationsSummary' | 'ownership') {
    return readEntityRecord<any>({
      endpoint: { collectionPath: '/api/companies/partners' },
      id,
      query: { section },
      options: {
        skipAuth: true,
        useCache: false,
      },
    })
  },
  createPartner(payload: Record<string, any>) {
    return createEntityRecord<any>({ collectionPath: '/api/companies/partners' }, payload)
  },
  updatePartner(id: string, payload: Record<string, any>) {
    return updateEntityRecord<any>({ collectionPath: '/api/companies/partners' }, id, payload)
  },
  deletePartner(id: string) {
    return deleteEntityRecord<{ success?: boolean; hardDeleted?: boolean }>({
      endpoint: { collectionPath: '/api/companies/partners' },
      id,
    })
  },
  representatives(companyId: string, options: ApiClientOptions = {}) {
    return apiClient.get<{ data: SirketTemsilci[] }>('/api/companies/representatives', relationListOptions({ ...options, companyId }))
  },
  representativesList(options: RelationListOptions = {}) {
    return apiClient.get<ListResponse<SirketTemsilci>>('/api/companies/representatives', {
      ...relationListOptions(options),
    })
  },
  representativeDetail(id: string) {
    return apiClient.get<{ data: SirketTemsilci }>(`/api/companies/representatives/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  stakeholdersList(options: RelationListOptions = {}) {
    return apiClient.get<ListResponse<Array<any>[number]>>('/api/companies/stakeholders', {
      ...relationListOptions(options),
    })
  },
  stakeholderDetail(id: string) {
    return apiClient.get<{ data: any }>(`/api/companies/stakeholders/${id}`, { skipAuth: true, staleTime: 120_000 })
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
    return { data: result.data.documents || [] }
  },
  async logos(companyId: string): Promise<{ data: SirketLogo[] }> {
    const result = await this.detail(companyId)
    return { data: result.data.logos || [] }
  },
  invalidateList() {
    apiClient.invalidate('/api/companies')
  },
  invalidateRelations() {
    apiClient.invalidate('/api/companies/partners')
    apiClient.invalidate('/api/companies/representatives')
    apiClient.invalidate('/api/companies/stakeholders')
  },
}
