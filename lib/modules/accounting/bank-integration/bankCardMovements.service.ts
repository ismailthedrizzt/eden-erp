import { apiClient } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'
import type { BankAndCardMovementRow, BankSyncSummary } from './bankIntegration.types'

export const bankCardMovementsService = {
  getConnections() {
    return apiClient.get<{ data: Array<Record<string, any>> }>('/api/accounting/bank-connections', { skipAuth: true, staleTime: 120_000 })
  },
  getTransactions(matchStatus = 'waiting', query: Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> = {}) {
    return apiClient.get<ListResponse<BankAndCardMovementRow>>('/api/accounting/bank-card-transactions', {
      query: { match_status: matchStatus, ...query },
      skipAuth: true,
      staleTime: 60_000,
    })
  },
  async syncConnection(connectionId: string) {
    const result = await apiClient.post<{ data: BankSyncSummary }>(`/api/accounting/bank-connections/${connectionId}/sync`, undefined, { useCache: false })
    apiClient.invalidate('/api/accounting/bank-card-transactions')
    apiClient.invalidate('/api/accounting/bank-connections')
    apiClient.invalidate(`/api/accounting/bank-connections/${connectionId}`)
    return result
  },
}
