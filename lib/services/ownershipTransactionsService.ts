import { apiClient } from '@/lib/api/apiClient'

export type OwnershipTransactionDto = {
  id: string
  company_id?: string
  transaction_no?: string
  transaction_type?: string
  affected_partner_id?: string
  from_partner_id?: string
  to_partner_id?: string
  transaction_date?: string
  effective_date?: string
  status?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export const ownershipTransactionsService = {
  get(transactionId: string) {
    return apiClient.get<OwnershipTransactionDto>(`/api/ownership/transactions/${encodeURIComponent(transactionId)}`, { useCache: false })
  },
  create(payload: Record<string, unknown>) {
    return apiClient.post<OwnershipTransactionDto>('/api/ownership/transactions', payload, { useCache: false })
  },
  approvedForCompany(companyId: string) {
    return apiClient.get<OwnershipTransactionDto[]>('/api/ownership/transactions/approved', {
      useCache: false,
      query: { company_id: companyId },
    })
  },
  invalidateList() {
    apiClient.invalidate('/api/ownership/transactions')
  },
}
