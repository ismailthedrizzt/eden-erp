import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { Personel } from '@/types'

export type EmployeeListFilters = {
  unitId?: string
  status?: string
  includePassive?: boolean
}

export type EmployeeListQuery = EmployeeListFilters & Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>

export const employeeService = {
  list(filters: Partial<EmployeeListQuery> = {}, options: ApiClientOptions = {}) {
    return apiClient.get<ListResponse<Personel>>('/api/employees', {
      ...options,
      skipAuth: options.skipAuth ?? true,
      staleTime: options.staleTime ?? 300_000,
      query: {
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search,
        sort: filters.sort,
        direction: filters.direction,
        unit_id: filters.unitId,
        status: filters.status,
        include_passive: filters.includePassive ? 'true' : undefined,
        ...options.query,
      },
    })
  },
  detail(id: string) {
    return apiClient.get<{ data: Personel }>(`/api/employees/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  detailSection(id: string, section: 'hero' | 'media' | 'details') {
    return apiClient.get<{ data: Partial<Personel> }>(`/api/employees/${id}`, {
      skipAuth: true,
      useCache: false,
      query: { section },
    })
  },
  create(payload: Omit<Personel, 'id' | 'created_at' | 'updated_at'>) {
    return apiClient.post<{ data: Personel }>('/api/employees', payload)
  },
  update(id: string, payload: Partial<Personel>) {
    return apiClient.patch<{ data: Personel }>(`/api/employees/${id}`, payload)
  },
  invalidateList() {
    apiClient.invalidate('/api/employees')
  },
}
