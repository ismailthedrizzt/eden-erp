import { apiClient, type ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'

export type FacilityListOptions = ApiClientOptions & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & {
  companyId?: string
  branchId?: string
}

export type FacilityRow = Record<string, any> & {
  id: string
  company_id?: string
  branch_id?: string | null
  facility_name?: string
  name?: string
  facility_type?: string
  city?: string
  district?: string
  address?: string
  status?: string
  record_status?: string
  reusable?: boolean
}

export const facilityService = {
  async list(options: FacilityListOptions = {}): Promise<ListResponse<FacilityRow>> {
    const { companyId, branchId, pageSize, search, sort, direction, ...clientOptions } = options
    const payload = await apiClient.get<any>('/api/facilities', {
      ...clientOptions,
      skipAuth: clientOptions.skipAuth ?? true,
      staleTime: clientOptions.staleTime ?? 120_000,
      query: {
        ...(companyId ? { company_id: companyId } : {}),
        ...(branchId ? { branch_id: branchId } : {}),
        ...(pageSize ? { pageSize } : {}),
        ...(search ? { search } : {}),
        ...(sort ? { sort } : {}),
        ...(direction ? { direction } : {}),
        ...clientOptions.query,
      },
    })
    return normalizeFacilityList(payload)
  },
  async detail(id: string) {
    const payload = await apiClient.get<any>(`/api/facilities/${id}`, {
      skipAuth: true,
      staleTime: 120_000,
    })
    return { data: normalizeFacility(payload?.data || payload) }
  },
  async create(payload: Record<string, any>) {
    const response = await apiClient.post<any>('/api/facilities', payload)
    return { data: normalizeFacility(response?.data || response) }
  },
  async update(id: string, payload: Record<string, any>) {
    const response = await apiClient.patch<any>(`/api/facilities/${id}`, payload)
    return { data: normalizeFacility(response?.data || response) }
  },
  invalidateList() {
    apiClient.invalidate('/api/facilities')
  },
}

function normalizeFacilityList(payload: any): ListResponse<FacilityRow> {
  const data = payload?.data || payload || {}
  const rows = data.data || data.facilities || payload?.facilities || []
  return {
    data: rows.map(normalizeFacility),
    meta: data.meta || payload?.meta || { page: 1, pageSize: rows.length || 50, total: rows.length || 0, totalPages: 1 },
    projection: data.projection || payload?.projection,
  } as ListResponse<FacilityRow>
}

function normalizeFacility(row: any): FacilityRow {
  const metadata = row?.metadata_json || {}
  return {
    ...row,
    name: row?.name || row?.facility_name,
    related_branch_id: row?.related_branch_id || row?.branch_id,
    reusable: row?.reusable ?? (String(row?.status || '').toLowerCase() === 'reusable' || Boolean(metadata.reusable)),
  }
}
