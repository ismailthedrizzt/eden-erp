'use client'

import { apiClient, type ApiClientOptions } from '@/lib/api/apiClient'

export interface CompanyVehiclePayload {
  vehicles: any[]
  employees: any[]
  companies: any[]
  warning?: string
}

type CompanyVehicleListOptions = ApiClientOptions & { includeReferences?: boolean }

export const companyVehicleService = {
  list(options: CompanyVehicleListOptions = {}) {
    const { includeReferences, ...clientOptions } = options
    return apiClient.get<CompanyVehiclePayload>('/api/sirket/araclar', {
      ...clientOptions,
      skipAuth: clientOptions.skipAuth ?? true,
      staleTime: clientOptions.staleTime ?? 120_000,
      query: {
        ...(includeReferences ? { include_refs: 'true' } : {}),
        ...clientOptions.query,
      },
    })
  },

  references(options: ApiClientOptions = {}) {
    return apiClient.get<Pick<CompanyVehiclePayload, 'employees' | 'companies'>>('/api/sirket/araclar', {
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
    return apiClient.post<{ data: any }>('/api/sirket/araclar', payload, { useCache: false })
  },

  update(payload: Record<string, unknown>) {
    return apiClient.patch<{ data: any }>('/api/sirket/araclar', payload, { useCache: false })
  },

  delete(id: string) {
    return apiClient.delete<{ success: true }>('/api/sirket/araclar', {
      query: { id },
      useCache: false,
    })
  },

  invalidateList() {
    apiClient.invalidate('/api/sirket/araclar')
  },
}
