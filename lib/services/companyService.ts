import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type {
  BackendListResponse,
  BackendOperationResponse,
  BackendPaths,
} from '@/lib/backend/backendClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { Sirket, SirketDokuman, SirketLogo, SirketOrtak, SirketTemsilci } from '@/types/sirket'
import {
  createEntityRecord,
  deleteEntityRecord,
  listEntityRecords,
  normalizeListResponse,
  readEntityRecord,
  updateEntityRecord,
} from '@/lib/crud/entityCrudClient'

// BACKEND_MIGRATION_STATUS: deprecated_wrapper
// TARGET_BACKEND_MODULE: generated-client
// TARGET_FASTAPI_ENDPOINT: /openapi.json
// NOTES: Public service methods keep the frontend contract stable while endpoint DTOs move to generated OpenAPI types.

export type CompanyServiceBackendContracts = {
  companyList: BackendPaths['/api/v1/companies']['get']
  companyDetail: BackendPaths['/api/v1/companies/{company_id}']['get']
  branchList: BackendPaths['/api/v1/branches']['get']
  branchDetail: BackendPaths['/api/v1/branches/{branch_id}']['get']
  currentOwnership: BackendPaths['/api/v1/companies/{company_id}/current-ownership']['get']
  capitalIncrease: BackendPaths['/api/v1/companies/{company_id}/capital-increases']['post']
  ownershipTransaction: BackendPaths['/api/v1/ownership/transactions']['post']
  representativeAuthority: BackendPaths['/api/v1/representatives/{representative_id}/authority-transactions']['post']
  organizationUnitList: BackendPaths['/api/v1/organization/units']['get']
  organizationUnitDetail: BackendPaths['/api/v1/organization/units/{unit_id}']['get']
  facilityList: BackendPaths['/api/v1/facilities']['get']
  facilityDetail: BackendPaths['/api/v1/facilities/{facility_id}']['get']
}

export type CompanyServiceListEnvelope<T> = BackendListResponse<T>
export type CompanyServiceOperationEnvelope<T> = BackendOperationResponse<T>

type RelationListOptions = ApiClientOptions & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & {
  includePassive?: boolean
  companyId?: string
  statuses?: string[]
  authorityStatuses?: string[]
  authority_statuses?: string[]
  branchId?: string
  organizationUnitId?: string
  facilityId?: string
  scopeType?: string
  includeCompanyWide?: boolean
  includeCompanyWideForBranch?: boolean
}
type CompanyListOptions = ApiClientOptions & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & { includePassive?: boolean; statuses?: string[] }

function relationListOptions(options: RelationListOptions = {}) {
  const { includePassive, companyId, statuses, authorityStatuses, authority_statuses, branchId, organizationUnitId, facilityId, scopeType, includeCompanyWide, includeCompanyWideForBranch, ...clientOptions } = options
  const representativeAuthorityStatuses = authorityStatuses || authority_statuses
  const shouldIncludeCompanyWide = includeCompanyWide || includeCompanyWideForBranch
  return {
    ...clientOptions,
    skipAuth: clientOptions.skipAuth ?? true,
    staleTime: clientOptions.staleTime ?? 120_000,
    query: {
      ...(companyId ? { company_id: companyId } : {}),
      ...(includePassive ? { include_passive: 'true' } : {}),
      ...(statuses?.length ? { statuses: statuses.join(',') } : {}),
      ...(representativeAuthorityStatuses?.length ? { authority_statuses: representativeAuthorityStatuses.join(',') } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
      ...(organizationUnitId ? { organization_unit_id: organizationUnitId } : {}),
      ...(facilityId ? { facility_id: facilityId } : {}),
      ...(scopeType ? { scope_type: scopeType } : {}),
      ...(shouldIncludeCompanyWide ? { include_company_wide: 'true', include_company_wide_for_branch: 'true' } : {}),
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
  capitalDecreasePrecheck(companyId: string) {
    return apiClient.get<{ data: any }>(`/api/companies/${companyId}/capital-decreases/precheck`, {
      useCache: false,
    })
  },
  requestCapitalDecrease(companyId: string, payload: Record<string, any>) {
    return apiClient.post<{ data: any }>(`/api/companies/${companyId}/capital-decreases`, payload)
  },
  officialChangePrecheck(companyId: string, changeType: 'title_change' | 'address_change' | 'public_registration_update') {
    return apiClient.get<{ data: any }>(`/api/companies/${companyId}/official-changes/${officialChangePath(changeType)}/precheck`, {
      useCache: false,
    })
  },
  completeOfficialChange(companyId: string, changeType: 'title_change' | 'address_change' | 'public_registration_update', payload: Record<string, any>) {
    return apiClient.post<{ data: any }>(`/api/companies/${companyId}/official-changes/${officialChangePath(changeType)}`, payload)
  },
  async branchesList(options: RelationListOptions = {}) {
    const requestOptions = relationListOptions(options)
    const response = await apiClient.get<ListResponse<Array<any>[number]>>('/api/companies/branches', requestOptions)
    return normalizeListResponse(response, requestOptions.query)
  },
  branchDetail(id: string) {
    return readEntityRecord<any>({
      endpoint: { collectionPath: '/api/companies/branches' },
      id,
      options: { skipAuth: true, staleTime: 120_000 },
    })
  },
  updateBranch(id: string, payload: Record<string, any>) {
    return updateEntityRecord<any>({ collectionPath: '/api/companies/branches' }, id, payload)
  },
  updateBranchDocuments(id: string, payload: Record<string, any>) {
    return apiClient.post<{ data: any; operation_id?: string; operation_status?: string; message?: string }>(`/api/companies/branches/${id}/documents`, payload)
  },
  branchOpeningPrecheck(companyId: string, params: { branchName?: string; address?: string } = {}) {
    return apiClient.get<{ data: any }>(`/api/companies/${companyId}/official-changes/branch-opening/precheck`, {
      useCache: false,
      query: {
        ...(params.branchName ? { branch_name: params.branchName } : {}),
        ...(params.address ? { address: params.address } : {}),
      },
    })
  },
  completeBranchOpening(companyId: string, payload: Record<string, any>) {
    return apiClient.post<{ data: any; operation_id?: string; operation_status?: string; message?: string }>(`/api/companies/${companyId}/official-changes/branch-opening`, payload)
  },
  branchClosingPrecheck(companyId: string, branchId?: string | null) {
    return apiClient.get<{ data: any }>(`/api/companies/${companyId}/official-changes/branch-closing/precheck`, {
      useCache: false,
      query: branchId ? { branch_id: branchId } : undefined,
    })
  },
  completeBranchClosing(companyId: string, payload: Record<string, any>) {
    return apiClient.post<{ data: any; operation_id?: string; operation_status?: string; message?: string }>(`/api/companies/${companyId}/official-changes/branch-closing`, payload)
  },
  naceChangePrecheck(companyId: string) {
    return apiClient.get<{ data: any }>(`/api/companies/${companyId}/official-changes/nace-change/precheck`, {
      useCache: false,
    })
  },
  completeNaceChange(companyId: string, payload: Record<string, any>) {
    return apiClient.post<{ data: any; operation_id?: string; operation_status?: string; message?: string }>(`/api/companies/${companyId}/official-changes/nace-change`, payload)
  },
  activitySubjectChangePrecheck(companyId: string) {
    return apiClient.get<{ data: any }>(`/api/companies/${companyId}/official-changes/activity-subject-change/precheck`, {
      useCache: false,
    })
  },
  completeActivitySubjectChange(companyId: string, payload: Record<string, any>) {
    return apiClient.post<{ data: any; operation_id?: string; operation_status?: string; message?: string }>(`/api/companies/${companyId}/official-changes/activity-subject-change`, payload)
  },
  partners(companyId: string, options: ApiClientOptions = {}) {
    return apiClient.get<{ data: SirketOrtak[] }>('/api/companies/partners', relationListOptions({ ...options, companyId }))
  },
  async partnersList(options: RelationListOptions = {}) {
    const requestOptions = relationListOptions(options)
    const response = await apiClient.get<ListResponse<Array<any>[number]>>('/api/companies/partners', requestOptions)
    return normalizeListResponse(response, requestOptions.query)
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
  async representativesList(options: RelationListOptions = {}) {
    const requestOptions = relationListOptions(options)
    const response = await apiClient.get<ListResponse<SirketTemsilci>>('/api/companies/representatives', requestOptions)
    return normalizeListResponse(response, requestOptions.query)
  },
  representativeDetail(id: string) {
    return apiClient.get<{ data: SirketTemsilci }>(`/api/companies/representatives/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  createRepresentative(payload: Record<string, any>) {
    return createEntityRecord<any>({ collectionPath: '/api/companies/representatives' }, payload)
  },
  updateRepresentative(id: string, payload: Record<string, any>) {
    return updateEntityRecord<any>({ collectionPath: '/api/companies/representatives' }, id, payload)
  },
  deleteRepresentativeDraft(id: string) {
    return deleteEntityRecord<{ success?: boolean; hardDeleted?: boolean }>({
      endpoint: { collectionPath: '/api/companies/representatives' },
      id,
    })
  },
  startRepresentativeAuthority(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Temsilcilik Başlatma', payload)
  },
  renewRepresentativeAuthority(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Yetki Yenileme', payload)
  },
  changeRepresentativeAuthorityScope(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Yetki Kapsamı Değişikliği', payload)
  },
  changeRepresentativeLimit(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Limit Değişikliği', payload)
  },
  suspendRepresentativeAuthority(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Askıya Alma', payload)
  },
  resumeRepresentativeAuthority(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Yetki Yenileme', payload)
  },
  terminateRepresentativeAuthority(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Sonlandırma', payload)
  },
  correctRepresentativeAuthority(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Düzeltme Kaydı', payload)
  },
  reverseRepresentativeAuthority(id: string, payload: Record<string, any>) {
    return representativeAuthorityOperation(id, 'Ters Kayıt', payload)
  },
  async stakeholdersList(options: RelationListOptions = {}) {
    const requestOptions = relationListOptions(options)
    const response = await apiClient.get<ListResponse<Array<any>[number]>>('/api/companies/stakeholders', requestOptions)
    return normalizeListResponse(response, requestOptions.query)
  },
  stakeholderDetail(id: string) {
    return apiClient.get<{ data: any }>(`/api/companies/stakeholders/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  async currentOwnership(companyIds: string[], options: ApiClientOptions = {}) {
    const uniqueCompanyIds = Array.from(new Set(companyIds.filter(Boolean)))
    if (uniqueCompanyIds.length === 0) return { data: [] as Array<any> }

    const rows = await Promise.all(uniqueCompanyIds.map(async companyId => {
      try {
        const payload = await apiClient.get<{ data: Array<any> }>(`/api/companies/${companyId}/current-ownership`, {
          ...options,
          skipAuth: options.skipAuth ?? true,
          staleTime: options.staleTime ?? 120_000,
          query: options.query,
        })
        return Array.isArray(payload.data) ? payload.data : []
      } catch {
        return []
      }
    }))

    return { data: rows.flat() }
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
    apiClient.invalidate('/api/companies/branches')
  },
}

function representativeAuthorityOperation(id: string, transactionType: string, payload: Record<string, any>) {
  return apiClient.patch<{ data: any }>(`/api/companies/representatives/${id}`, {
    ...payload,
    transaction_type: transactionType,
    authority_action: true,
  })
}

function officialChangePath(changeType: 'title_change' | 'address_change' | 'public_registration_update') {
  if (changeType === 'title_change') return 'title-change'
  if (changeType === 'address_change') return 'address-change'
  return 'public-registration-update'
}
