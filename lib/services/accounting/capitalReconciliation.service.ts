'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { AccountingDeepeningListQuery, ApiEnvelope, CapitalReconciliation } from './accountingService'
import { unwrapData, unwrapList } from './accountingService'

export const capitalReconciliationService = {
  async list(query: AccountingDeepeningListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<{ data: CapitalReconciliation[]; meta: any }>>('/api/accounting/capital-reconciliation', {
      query,
      staleTime: 60_000,
    })
    return unwrapList<CapitalReconciliation>(response)
  },
  async detail(capitalTransactionId: string) {
    const response = await apiClient.get<ApiEnvelope<Record<string, unknown>>>(`/api/accounting/capital-reconciliation/${capitalTransactionId}`, {
      staleTime: 60_000,
    })
    return unwrapData(response)
  },
  async matchPayment(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<CapitalReconciliation>>(`/api/accounting/capital-reconciliation/${id}/match-payment`, payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/accounting/capital-reconciliation')
    apiClient.invalidate(`/api/accounting/capital-reconciliation/${id}`)
    return unwrapData(response)
  },
}
