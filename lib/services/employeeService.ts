import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { Personel } from '@/types'

export type EmployeeListFilters = {
  birimId?: string
  durum?: string
  ara?: string
  includePassive?: boolean
}

export type EmployeeListQuery = EmployeeListFilters & Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>

export const employeeService = {
  list(filters: Partial<EmployeeListQuery> = {}, options: ApiClientOptions = {}) {
    return apiClient.get<ListResponse<Personel>>('/api/ik/personel', {
      ...options,
      skipAuth: options.skipAuth ?? true,
      staleTime: options.staleTime ?? 120_000,
      query: {
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search,
        sort: filters.sort,
        direction: filters.direction,
        birim_id: filters.birimId,
        durum: filters.durum,
        ara: filters.ara || filters.search,
        include_passive: filters.includePassive ? 'true' : undefined,
        ...options.query,
      },
    })
  },
  detail(id: string) {
    return apiClient.get<{ data: Personel }>(`/api/ik/personel/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  create(payload: Omit<Personel, 'id' | 'created_at' | 'updated_at'>) {
    return apiClient.post<{ data: Personel }>('/api/ik/personel', payload)
  },
  update(id: string, payload: Partial<Personel>) {
    return apiClient.patch<{ data: Personel }>(`/api/ik/personel/${id}`, payload)
  },
  invalidateList() {
    apiClient.invalidate('/api/ik/personel')
  },
}
