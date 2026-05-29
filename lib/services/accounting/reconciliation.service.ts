'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { AccountingDeepeningListQuery, ApiEnvelope, ReconciliationSuggestion } from './accountingService'
import { unwrapData, unwrapList } from './accountingService'

export const reconciliationService = {
  async suggestions(query: AccountingDeepeningListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<{ data: ReconciliationSuggestion[]; meta: any }>>('/api/accounting/reconciliation/suggestions', {
      query,
      staleTime: 30_000,
    })
    return unwrapList<ReconciliationSuggestion>(response)
  },
  async summary(query: AccountingDeepeningListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<Record<string, unknown>>>('/api/accounting/reconciliation/summary', {
      query,
      staleTime: 30_000,
    })
    return unwrapData(response)
  },
  async unmatched(query: AccountingDeepeningListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<Record<string, unknown>>>('/api/accounting/reconciliation/unmatched', {
      query,
      staleTime: 30_000,
    })
    return unwrapData(response)
  },
  async match(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>('/api/accounting/reconciliation/match', payload, {
      useCache: false,
    })
    invalidateReconciliation()
    return unwrapData(response)
  },
  async unmatch(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>('/api/accounting/reconciliation/unmatch', payload, {
      useCache: false,
    })
    invalidateReconciliation()
    return unwrapData(response)
  },
}

function invalidateReconciliation() {
  apiClient.invalidate('/api/accounting/reconciliation/suggestions')
  apiClient.invalidate('/api/accounting/reconciliation/summary')
  apiClient.invalidate('/api/accounting/reconciliation/unmatched')
  apiClient.invalidate('/api/accounting/bank-transactions')
  apiClient.invalidate('/api/accounting/e-documents')
  apiClient.invalidate('/api/accounting/cari-transactions')
}
