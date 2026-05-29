'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { AccountingDeepeningListQuery, ApiEnvelope, BankAccount } from './accountingService'
import { unwrapData, unwrapList } from './accountingService'

export const bankAccountsService = {
  async list(query: AccountingDeepeningListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<{ data: BankAccount[]; meta: any }>>('/api/accounting/bank-accounts', {
      query,
      staleTime: 60_000,
    })
    return unwrapList<BankAccount>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<BankAccount>>(`/api/accounting/bank-accounts/${id}`, {
      staleTime: 60_000,
    })
    return unwrapData(response)
  },
  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<BankAccount>>('/api/accounting/bank-accounts', payload, {
      useCache: false,
    })
    invalidateBankAccounts()
    return unwrapData(response)
  },
  async update(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.patch<ApiEnvelope<BankAccount>>(`/api/accounting/bank-accounts/${id}`, payload, {
      useCache: false,
    })
    invalidateBankAccounts(id)
    return unwrapData(response)
  },
  async delete(id: string) {
    const response = await apiClient.delete<ApiEnvelope<{ id: string; deleted: boolean }>>(`/api/accounting/bank-accounts/${id}`, {
      useCache: false,
    })
    invalidateBankAccounts(id)
    return unwrapData(response)
  },
}

function invalidateBankAccounts(id?: string) {
  apiClient.invalidate('/api/accounting/bank-accounts')
  if (id) apiClient.invalidate(`/api/accounting/bank-accounts/${id}`)
}
