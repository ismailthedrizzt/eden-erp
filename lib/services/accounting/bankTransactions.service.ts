'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { AccountingDeepeningListQuery, ApiEnvelope, BankTransaction } from './accountingService'
import { unwrapData, unwrapList } from './accountingService'

export const bankTransactionsService = {
  async list(query: AccountingDeepeningListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<{ data: BankTransaction[]; meta: any }>>('/api/accounting/bank-transactions', {
      query,
      staleTime: 60_000,
    })
    return unwrapList<BankTransaction>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<BankTransaction>>(`/api/accounting/bank-transactions/${id}`, {
      staleTime: 60_000,
    })
    return unwrapData(response)
  },
  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<BankTransaction>>('/api/accounting/bank-transactions', payload, {
      useCache: false,
    })
    invalidateBankTransactions()
    return unwrapData(response)
  },
  async importRows(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>('/api/accounting/bank-transactions/import', payload, {
      useCache: false,
    })
    invalidateBankTransactions()
    return unwrapData(response)
  },
  async match(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(`/api/accounting/bank-transactions/${id}/match`, payload, {
      useCache: false,
    })
    invalidateBankTransactions(id)
    return unwrapData(response)
  },
  async ignore(id: string) {
    const response = await apiClient.post<ApiEnvelope<BankTransaction>>(`/api/accounting/bank-transactions/${id}/ignore`, {}, {
      useCache: false,
    })
    invalidateBankTransactions(id)
    return unwrapData(response)
  },
}

function invalidateBankTransactions(id?: string) {
  apiClient.invalidate('/api/accounting/bank-transactions')
  apiClient.invalidate('/api/accounting/reconciliation/summary')
  apiClient.invalidate('/api/accounting/reconciliation/suggestions')
  if (id) apiClient.invalidate(`/api/accounting/bank-transactions/${id}`)
}
