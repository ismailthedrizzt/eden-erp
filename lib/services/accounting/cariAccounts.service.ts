'use client'

import { apiClient } from '@/lib/api/apiClient'
import type {
  ApiEnvelope,
  CariAccount,
  CariAccountListQuery,
  CariAccountSummary,
  CompanyAccountingSummary,
} from './accountingService'
import { unwrapData, unwrapList } from './accountingService'

export const cariAccountsService = {
  async list(query: CariAccountListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<{ data: CariAccount[]; meta: any }>>('/api/accounting/cari-accounts', {
      query,
      staleTime: 60_000,
    })
    return unwrapList<CariAccount>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<CariAccount>>(`/api/accounting/cari-accounts/${id}`, {
      staleTime: 60_000,
    })
    return unwrapData(response)
  },
  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<CariAccount>>('/api/accounting/cari-accounts', payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/accounting/cari-accounts')
    return unwrapData(response)
  },
  async update(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.patch<ApiEnvelope<CariAccount>>(`/api/accounting/cari-accounts/${id}`, payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/accounting/cari-accounts')
    apiClient.invalidate(`/api/accounting/cari-accounts/${id}`)
    return unwrapData(response)
  },
  async delete(id: string) {
    const response = await apiClient.delete<ApiEnvelope<{ id: string; deleted: boolean }>>(`/api/accounting/cari-accounts/${id}`, {
      useCache: false,
    })
    apiClient.invalidate('/api/accounting/cari-accounts')
    return unwrapData(response)
  },
  async summary(id: string) {
    const response = await apiClient.get<ApiEnvelope<CariAccountSummary>>(`/api/accounting/cari-accounts/${id}/summary`, {
      useCache: false,
    })
    return unwrapData(response)
  },
  async companySummary(companyId: string) {
    const response = await apiClient.get<ApiEnvelope<CompanyAccountingSummary>>(`/api/accounting/company/${companyId}/summary`, {
      useCache: false,
    })
    return unwrapData(response)
  },
}
