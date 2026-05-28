'use client'

import { apiClient } from '@/lib/api/apiClient'
import type {
  ApiEnvelope,
  CariTransaction,
  CariTransactionListQuery,
} from './accountingService'
import { unwrapData, unwrapList } from './accountingService'

export const cariTransactionsService = {
  async list(query: CariTransactionListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<{ data: CariTransaction[]; meta: any }>>('/api/accounting/cari-transactions', {
      query,
      staleTime: 60_000,
    })
    return unwrapList<CariTransaction>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<CariTransaction>>(`/api/accounting/cari-transactions/${id}`, {
      staleTime: 60_000,
    })
    return unwrapData(response)
  },
  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<CariTransaction>>('/api/accounting/cari-transactions', payload, {
      useCache: false,
    })
    invalidateAccountingTransactions(payload.account_id ? String(payload.account_id) : undefined)
    return unwrapData(response)
  },
  async update(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.patch<ApiEnvelope<CariTransaction>>(`/api/accounting/cari-transactions/${id}`, payload, {
      useCache: false,
    })
    invalidateAccountingTransactions(payload.account_id ? String(payload.account_id) : undefined, id)
    return unwrapData(response)
  },
  async delete(id: string) {
    const response = await apiClient.delete<ApiEnvelope<{ id: string; deleted: boolean }>>(`/api/accounting/cari-transactions/${id}`, {
      useCache: false,
    })
    invalidateAccountingTransactions(undefined, id)
    return unwrapData(response)
  },
}

function invalidateAccountingTransactions(accountId?: string, transactionId?: string) {
  apiClient.invalidate('/api/accounting/cari-transactions')
  apiClient.invalidate('/api/accounting/cari-accounts')
  if (accountId) apiClient.invalidate(`/api/accounting/cari-accounts/${accountId}/summary`)
  if (transactionId) apiClient.invalidate(`/api/accounting/cari-transactions/${transactionId}`)
}
