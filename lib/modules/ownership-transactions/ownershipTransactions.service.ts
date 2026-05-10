import type { CurrentOwnershipRow, OwnershipTransaction } from './ownershipTransactions.types'

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'İşlem tamamlanamadı')
  return payload
}

export const ownershipTransactionsService = {
  async list(): Promise<OwnershipTransaction[]> {
    const payload = await requestJson<{ data: OwnershipTransaction[] }>('/api/ownership-transactions')
    return payload.data || []
  },

  async get(id: string): Promise<OwnershipTransaction> {
    const payload = await requestJson<{ data: OwnershipTransaction }>(`/api/ownership-transactions/${id}`)
    return payload.data
  },

  async create(data: Record<string, unknown>): Promise<OwnershipTransaction> {
    const payload = await requestJson<{ data: OwnershipTransaction }>('/api/ownership-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return payload.data
  },

  async update(id: string, data: Record<string, unknown>): Promise<OwnershipTransaction> {
    const payload = await requestJson<{ data: OwnershipTransaction }>(`/api/ownership-transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return payload.data
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
