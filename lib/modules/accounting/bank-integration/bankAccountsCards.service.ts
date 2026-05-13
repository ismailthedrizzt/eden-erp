import { apiClient } from '@/lib/api/apiClient'

export interface BankConnectionRow {
  id: string
  company_id?: string | null
  company_name?: string | null
  bank_name: string
  provider_code: string
  integration_type: string
  connection_status: string
  credential_id?: string | null
  environment?: string | null
  base_url?: string | null
  last_test_at?: string | null
  last_sync_at?: string | null
  status: string
  notes?: string | null
  account_count?: number
  card_count?: number
}

export interface BankAccountRow {
  id: string
  company_id?: string | null
  bank_connection_id: string
  iban?: string | null
  account_no?: string | null
  account_name: string
  branch_name?: string | null
  branch_code?: string | null
  currency: string
  account_type: string
  opening_date?: string | null
  is_default: boolean
  last_balance?: number | null
  last_sync_at?: string | null
  status: string
}

export interface BankCardRow {
  id: string
  company_id?: string | null
  bank_connection_id: string
  card_name: string
  card_type: string
  last_four_digits?: string | null
  currency: string
  limit_amount?: number | null
  available_limit?: number | null
  statement_day?: number | null
  payment_due_day?: number | null
  is_default: boolean
  last_sync_at?: string | null
  status: string
}

export const bankAccountsCardsService = {
  getConnections() {
    return apiClient.get<{ data: BankConnectionRow[] }>('/api/accounting/bank-connections', { useCache: false })
  },
  getConnection(id: string) {
    return apiClient.get<{ data: BankConnectionRow & { accounts: BankAccountRow[]; cards: BankCardRow[] } }>(`/api/accounting/bank-connections/${id}`, { useCache: false })
  },
  createConnection(payload: Partial<BankConnectionRow>) {
    return apiClient.post<{ data: BankConnectionRow }>('/api/accounting/bank-connections', payload, { useCache: false })
  },
  updateConnection(id: string, payload: Partial<BankConnectionRow>) {
    return apiClient.patch<{ data: BankConnectionRow }>(`/api/accounting/bank-connections/${id}`, payload, { useCache: false })
  },
  passivateConnection(id: string) {
    return apiClient.post<{ data: BankConnectionRow }>(`/api/accounting/bank-connections/${id}/passivate`, undefined, { useCache: false })
  },
  testConnection(id: string) {
    return apiClient.post<{ data: BankConnectionRow; message: string }>(`/api/accounting/bank-connections/${id}/test`, undefined, { useCache: false })
  },
  syncConnection(id: string) {
    return apiClient.post<{ data: any }>(`/api/accounting/bank-connections/${id}/sync`, undefined, { useCache: false })
  },
  getAccounts(connectionId: string) {
    return apiClient.get<{ data: BankAccountRow[] }>(`/api/accounting/bank-connections/${connectionId}/accounts`, { useCache: false })
  },
  createAccount(connectionId: string, payload: Partial<BankAccountRow>) {
    return apiClient.post<{ data: BankAccountRow }>(`/api/accounting/bank-connections/${connectionId}/accounts`, payload, { useCache: false })
  },
  updateAccount(id: string, payload: Partial<BankAccountRow>) {
    return apiClient.patch<{ data: BankAccountRow }>(`/api/accounting/bank-accounts/${id}`, payload, { useCache: false })
  },
  passivateAccount(id: string) {
    return apiClient.post<{ data: BankAccountRow }>(`/api/accounting/bank-accounts/${id}/passivate`, undefined, { useCache: false })
  },
  syncAccount(id: string) {
    return apiClient.post<{ data: BankAccountRow }>(`/api/accounting/bank-accounts/${id}/sync`, undefined, { useCache: false })
  },
  getCards(connectionId: string) {
    return apiClient.get<{ data: BankCardRow[] }>(`/api/accounting/bank-connections/${connectionId}/cards`, { useCache: false })
  },
  createCard(connectionId: string, payload: Partial<BankCardRow>) {
    return apiClient.post<{ data: BankCardRow }>(`/api/accounting/bank-connections/${connectionId}/cards`, payload, { useCache: false })
  },
  updateCard(id: string, payload: Partial<BankCardRow>) {
    return apiClient.patch<{ data: BankCardRow }>(`/api/accounting/bank-cards/${id}`, payload, { useCache: false })
  },
  passivateCard(id: string) {
    return apiClient.post<{ data: BankCardRow }>(`/api/accounting/bank-cards/${id}/passivate`, undefined, { useCache: false })
  },
  syncCard(id: string) {
    return apiClient.post<{ data: BankCardRow }>(`/api/accounting/bank-cards/${id}/sync`, undefined, { useCache: false })
  },
}
