'use client'

import { apiClient, type ApiClientOptions } from '@/lib/api/apiClient'
import type { ListMeta, ListQuery } from '@/lib/api/listEndpoint'

// CODE_LEGACY_ADAPTER: company.vehicle_blocked_development_adapter
// CODE_LEGACY_DECISION: retain_company_vehicle_adapter_until_vehicle_domain_contractization
// CODE_LEGACY_ALLOWED_FUNCTIONS: companyVehicleService.list, companyVehicleService.references, companyVehicleService.create, companyVehicleService.update, companyVehicleService.delete
// CODE_LEGACY_CONSUMER_ROUTES: /app/sirket/araclar
// CODE_LEGACY_CONSUMER_SYMBOLS: companyVehicleService

export interface CompanyVehiclePayload {
  vehicles: any[]
  employees: any[]
  companies: any[]
  meta?: ListMeta
  warning?: string
}

type CompanyVehicleListOptions = ApiClientOptions & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> & { includeReferences?: boolean }

export const companyVehicleService = {
  list(options: CompanyVehicleListOptions = {}) {
    const { includeReferences, page, pageSize, search, sort, direction, ...clientOptions } = options
    return apiClient.get<CompanyVehiclePayload>('/api/companies/vehicles', {
      ...clientOptions,
      skipAuth: clientOptions.skipAuth ?? true,
      staleTime: clientOptions.staleTime ?? 120_000,
      query: {
        ...(includeReferences ? { include_refs: 'true' } : {}),
        page,
        pageSize,
        search,
        sort,
        direction,
        ...clientOptions.query,
      },
    })
  },

  references(options: ApiClientOptions = {}) {
    return apiClient.get<Pick<CompanyVehiclePayload, 'employees' | 'companies'>>('/api/companies/vehicles', {
      ...options,
      skipAuth: options.skipAuth ?? true,
      staleTime: options.staleTime ?? 120_000,
      query: {
        refs_only: 'true',
        ...options.query,
      },
    })
  },

  create(payload: Record<string, unknown>) {
    return apiClient.post<{ data: any }>('/api/companies/vehicles', payload, { useCache: false })
  },

  update(payload: Record<string, unknown>) {
    return apiClient.patch<{ data: any }>('/api/companies/vehicles', payload, { useCache: false })
  },

  delete(id: string) {
    return apiClient.delete<{ success: true }>('/api/companies/vehicles', {
      query: { id },
      useCache: false,
    })
  },

  invalidateList() {
    apiClient.invalidate('/api/companies/vehicles')
  },
}
