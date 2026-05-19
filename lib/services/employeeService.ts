import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { Personel } from '@/types'
import {
  createEntityRecord,
  deleteEntityRecord,
  listEntityRecords,
  readEntityRecord,
  updateEntityRecord,
} from '@/lib/crud/entityCrudClient'

export type EmployeeListFilters = {
  unitId?: string
  status?: string
  includePassive?: boolean
}

export type EmployeeListQuery = EmployeeListFilters & Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>

export const employeeService = {
  list(filters: Partial<EmployeeListQuery> = {}, options: ApiClientOptions = {}) {
    return listEntityRecords<Personel>({
      endpoint: { collectionPath: '/api/employees' },
      query: {
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search,
        sort: filters.sort,
        direction: filters.direction,
        unit_id: filters.unitId,
        status: filters.status,
        include_passive: filters.includePassive ? 'true' : undefined,
      },
      options: {
        ...options,
        skipAuth: options.skipAuth ?? true,
        staleTime: options.staleTime ?? 300_000,
      },
    })
  },
  detail(id: string) {
    return readEntityRecord<Personel>({
      endpoint: { collectionPath: '/api/employees' },
      id,
      options: { skipAuth: true, staleTime: 120_000 },
    })
  },
  detailSection(id: string, section: 'hero' | 'media' | 'details') {
    return readEntityRecord<Partial<Personel>>({
      endpoint: { collectionPath: '/api/employees' },
      id,
      query: { section },
      options: {
        skipAuth: true,
        useCache: false,
      },
    })
  },
  create(payload: Omit<Personel, 'id' | 'created_at' | 'updated_at'>) {
    return createEntityRecord<Personel>({ collectionPath: '/api/employees' }, payload as Record<string, any>)
  },
  update(id: string, payload: Partial<Personel>) {
    return updateEntityRecord<Personel>({ collectionPath: '/api/employees' }, id, payload as Record<string, any>)
  },
  delete(id: string) {
    return deleteEntityRecord<{ success?: boolean; hardDeleted?: boolean }>({
      endpoint: { collectionPath: '/api/employees' },
      id,
    })
  },
  invalidateList() {
    apiClient.invalidate('/api/employees')
  },
}
