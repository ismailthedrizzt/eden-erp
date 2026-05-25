import type { CurrentOwnershipRow, OwnershipTransaction } from './ownershipTransactions.types'
import { apiClient } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import {
  createEntityRecord,
  deleteEntityRecord,
  listEntityRecords,
  readEntityRecord,
  updateEntityRecord,
} from '@/lib/crud/entityCrudClient'

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'İşlem tamamlanamadı')
  return payload
}

export const ownershipTransactionsService = {
  list(query: Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> = {}) {
    return listEntityRecords<OwnershipTransaction>({
      endpoint: { collectionPath: '/api/ownership-transactions' },
      query,
      options: {
        skipAuth: true,
        staleTime: 120_000,
      },
    })
  },

  async get(id: string): Promise<OwnershipTransaction> {
    const payload = await readEntityRecord<OwnershipTransaction>({
      endpoint: { collectionPath: '/api/ownership-transactions' },
      id,
      options: { skipAuth: true, staleTime: 120_000 },
    })
    return payload.data
  },

  async approvedForCompany(companyId: string): Promise<OwnershipTransaction[]> {
    const payload = await apiClient.get<{ data: OwnershipTransaction[] }>('/api/ownership-transactions', {
      skipAuth: true,
      staleTime: 120_000,
      query: { company_id: companyId, approval_status: 'approved', pageSize: 100 },
    })
    return payload.data || []
  },

  invalidateList() {
    apiClient.invalidate('/api/ownership-transactions')
  },

  async create(data: Record<string, unknown>): Promise<OwnershipTransaction & Record<string, unknown>> {
    const payload = await createEntityRecord<OwnershipTransaction>({ collectionPath: '/api/ownership-transactions' }, data)
    return {
      ...(payload.data || {} as OwnershipTransaction),
      operation_id: (payload as any).operation_id,
      operation_status: (payload as any).operation_status,
      message: (payload as any).message,
    }
  },

  async update(id: string, data: Record<string, unknown>): Promise<OwnershipTransaction> {
    const payload = await updateEntityRecord<OwnershipTransaction>({ collectionPath: '/api/ownership-transactions' }, id, data)
    return payload.data
  },

  async delete(id: string) {
    return deleteEntityRecord<{ success?: boolean; hardDeleted?: boolean }>({
      endpoint: { collectionPath: '/api/ownership-transactions' },
      id,
    })
  },

  async action(id: string, action: 'send-approval' | 'approve' | 'reject' | 'cancel' | 'reverse', data?: Record<string, unknown>) {
    return requestJson<{ data: OwnershipTransaction }>(`/api/ownership-transactions/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    })
  },

  async currentOwnership(companyId: string): Promise<CurrentOwnershipRow[]> {
    const payload = await requestJson<{ data: CurrentOwnershipRow[] }>(`/api/companies/${companyId}/current-ownership`)
    return payload.data || []
  },
}
