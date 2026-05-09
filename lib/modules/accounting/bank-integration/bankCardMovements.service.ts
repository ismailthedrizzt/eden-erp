import { apiClient } from '@/lib/api/apiClient'
import type { BankAndCardMovementRow, BankSyncSummary } from './bankIntegration.types'

export const bankCardMovementsService = {
  getConnections() {
    return apiClient.get<{ data: Array<Record<string, any>> }>('/api/accounting/bank-connections', { useCache: false })
  },
  getTransactions(matchStatus = 'waiting') {
    return apiClient.get<{ data: BankAndCardMovementRow[] }>('/api/accounting/bank-card-transactions', {
      query: { match_status: matchStatus },
      useCache: false,
    })
  },
  syncConnection(connectionId: string) {
    return apiClient.post<{ data: BankSyncSummary }>(`/api/accounting/bank-connections/${connectionId}/sync`, undefined, { useCache: false })
  },
}
