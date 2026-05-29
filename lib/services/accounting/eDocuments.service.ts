'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { AccountingDeepeningListQuery, ApiEnvelope, EDocument } from './accountingService'
import { unwrapData, unwrapList } from './accountingService'

export const eDocumentsService = {
  async list(query: AccountingDeepeningListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<{ data: EDocument[]; meta: any }>>('/api/accounting/e-documents', {
      query,
      staleTime: 60_000,
    })
    return unwrapList<EDocument>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<EDocument>>(`/api/accounting/e-documents/${id}`, {
      staleTime: 60_000,
    })
    return unwrapData(response)
  },
  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<EDocument>>('/api/accounting/e-documents', payload, {
      useCache: false,
    })
    invalidateEDocuments()
    return unwrapData(response)
  },
  async importRows(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>('/api/accounting/e-documents/import', payload, {
      useCache: false,
    })
    invalidateEDocuments()
    return unwrapData(response)
  },
  async match(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(`/api/accounting/e-documents/${id}/match`, payload, {
      useCache: false,
    })
    invalidateEDocuments(id)
    return unwrapData(response)
  },
  async reject(id: string, reason?: string) {
    const response = await apiClient.post<ApiEnvelope<EDocument>>(`/api/accounting/e-documents/${id}/reject`, { reason }, {
      useCache: false,
    })
    invalidateEDocuments(id)
    return unwrapData(response)
  },
}

function invalidateEDocuments(id?: string) {
  apiClient.invalidate('/api/accounting/e-documents')
  apiClient.invalidate('/api/accounting/reconciliation/summary')
  apiClient.invalidate('/api/accounting/reconciliation/suggestions')
  if (id) apiClient.invalidate(`/api/accounting/e-documents/${id}`)
}
