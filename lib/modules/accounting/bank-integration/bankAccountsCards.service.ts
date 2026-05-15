import { apiClient } from '@/lib/api/apiClient'
import type { ListMeta, ListQuery } from '@/lib/api/listEndpoint'

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

export interface BankAccountCardRow {
  id: string
  raw_id: string
  record_type: 'account' | 'card'
  record_type_label: string
  company_id?: string | null
  company_name?: string | null
  bank_name: string
  branch_name?: string | null
  branch_code?: string | null
  branch_display?: string | null
  identity_display: string
  name: string
  currency: string
  type: string
  type_label: string
  linked_bank_account_id?: string | null
  is_default: boolean
  is_default_label: string
  balance_limit_display: string | number
  status: string
  raw: Record<string, any>
}

export interface BankAccountCardPayload {
  record_type: 'account' | 'card'
  company_id?: string | null
  bank_name?: string | null
  branch_name?: string | null
  branch_code?: string | null
  status?: string
  iban?: string | null
  account_no?: string | null
  account_name?: string | null
  currency?: string
  account_type?: string
  opening_date?: string | null
  is_default?: boolean
  linked_bank_account_id?: string | null
  card_name?: string | null
  card_type?: string
  last_four_digits?: string | null
  limit_amount?: number | string | null
  available_limit?: number | string | null
  statement_day?: number | string | null
  payment_due_day?: number | string | null
}

export interface BankAutomationPreviewPayload {
  id?: string
  company_id?: string | null
  bank_name?: string | null
  provider_code?: string | null
  credential_id?: string | null
  environment?: string | null
  base_url?: string | null
  credentials?: {
    clientId?: string
    clientSecret?: string
    tokenEndpoint?: string
    consentId?: string
    unitNum?: string
    accountNum?: string
    IBAN?: string
    tokenAuthMethod?: string
  }
}

export const bankAccountsCardsService = {
  getUnifiedRecords(options: { includePassive?: boolean } & Partial<Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction'>> = {}) {
    return apiClient.get<{ data: BankAccountCardRow[]; meta?: ListMeta; accountOptions: Array<{ value: string; label: string; bank_connection_id?: string | null }> }>('/api/accounting/bank-accounts-cards', {
      skipAuth: true,
      staleTime: 120_000,
      query: {
        ...(options.includePassive ? { include_passive: 'true' } : {}),
        page: options.page,
        pageSize: options.pageSize,
        search: options.search,
        sort: options.sort,
        direction: options.direction,
      },
    })
  },
  async createUnifiedRecord(payload: BankAccountCardPayload) {
    const result = await apiClient.post<{ data: any }>('/api/accounting/bank-accounts-cards', payload as unknown as Record<string, unknown>, { useCache: false })
    invalidateBankAccountCardCaches()
    return result
  },
  async updateUnifiedRecord(id: string, payload: BankAccountCardPayload) {
    const result = await apiClient.patch<{ data: any }>(`/api/accounting/bank-accounts-cards/${id}`, payload as unknown as Record<string, unknown>, { useCache: false })
    invalidateBankAccountCardCaches(id)
    return result
  },
  async passivateUnifiedRecord(id: string) {
    const result = await apiClient.post<{ data: any }>(`/api/accounting/bank-accounts-cards/${id}/passivate`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(id)
    return result
  },
  async setDefaultUnifiedRecord(id: string) {
    const result = await apiClient.post<{ data: any }>(`/api/accounting/bank-accounts-cards/${id}/set-default`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(id)
    return result
  },
  getConnections() {
    return apiClient.get<{ data: BankConnectionRow[] }>('/api/accounting/bank-connections', { skipAuth: true, staleTime: 120_000 })
  },
  getConnection(id: string) {
    return apiClient.get<{ data: BankConnectionRow & { accounts: BankAccountRow[]; cards: BankCardRow[] } }>(`/api/accounting/bank-connections/${id}`, { skipAuth: true, staleTime: 120_000 })
  },
  async createConnection(payload: Partial<BankConnectionRow>) {
    const result = await apiClient.post<{ data: BankConnectionRow }>('/api/accounting/bank-connections', payload, { useCache: false })
    invalidateBankAccountCardCaches()
    return result
  },
  async updateConnection(id: string, payload: Partial<BankConnectionRow>) {
    const result = await apiClient.patch<{ data: BankConnectionRow }>(`/api/accounting/bank-connections/${id}`, payload, { useCache: false })
    invalidateBankAccountCardCaches(undefined, id)
    return result
  },
  async passivateConnection(id: string) {
    const result = await apiClient.post<{ data: BankConnectionRow }>(`/api/accounting/bank-connections/${id}/passivate`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(undefined, id)
    return result
  },
  async testConnection(id: string) {
    const result = await apiClient.post<{ data: BankConnectionRow; message: string }>(`/api/accounting/bank-connections/${id}/test`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(undefined, id)
    return result
  },
  async syncConnection(id: string) {
    const result = await apiClient.post<{ data: any }>(`/api/accounting/bank-connections/${id}/sync`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(undefined, id)
    apiClient.invalidate('/api/accounting/financial-institution-movements')
    return result
  },
  previewAutomation(payload: BankAutomationPreviewPayload) {
    return apiClient.post<{ data: { providerCode: string; bankName?: string | null; connectionStatus: string; accounts: Array<Record<string, any>>; providerStatus?: string } }>('/api/accounting/bank-connections/automation-preview', payload as unknown as Record<string, unknown>, { useCache: false })
  },
  getAccounts(connectionId: string) {
    return apiClient.get<{ data: BankAccountRow[] }>(`/api/accounting/bank-connections/${connectionId}/accounts`, { skipAuth: true, staleTime: 120_000 })
  },
  async createAccount(connectionId: string, payload: Partial<BankAccountRow>) {
    const result = await apiClient.post<{ data: BankAccountRow }>(`/api/accounting/bank-connections/${connectionId}/accounts`, payload, { useCache: false })
    invalidateBankAccountCardCaches(undefined, connectionId)
    return result
  },
  async updateAccount(id: string, payload: Partial<BankAccountRow>) {
    const result = await apiClient.patch<{ data: BankAccountRow }>(`/api/accounting/bank-accounts/${id}`, payload, { useCache: false })
    invalidateBankAccountCardCaches(`account:${id}`)
    return result
  },
  async passivateAccount(id: string) {
    const result = await apiClient.post<{ data: BankAccountRow }>(`/api/accounting/bank-accounts/${id}/passivate`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(`account:${id}`)
    return result
  },
  async syncAccount(id: string) {
    const result = await apiClient.post<{ data: BankAccountRow }>(`/api/accounting/bank-accounts/${id}/sync`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(`account:${id}`)
    return result
  },
  getCards(connectionId: string) {
    return apiClient.get<{ data: BankCardRow[] }>(`/api/accounting/bank-connections/${connectionId}/cards`, { skipAuth: true, staleTime: 120_000 })
  },
  async createCard(connectionId: string, payload: Partial<BankCardRow>) {
    const result = await apiClient.post<{ data: BankCardRow }>(`/api/accounting/bank-connections/${connectionId}/cards`, payload, { useCache: false })
    invalidateBankAccountCardCaches(undefined, connectionId)
    return result
  },
  async updateCard(id: string, payload: Partial<BankCardRow>) {
    const result = await apiClient.patch<{ data: BankCardRow }>(`/api/accounting/bank-cards/${id}`, payload, { useCache: false })
    invalidateBankAccountCardCaches(`card:${id}`)
    return result
  },
  async passivateCard(id: string) {
    const result = await apiClient.post<{ data: BankCardRow }>(`/api/accounting/bank-cards/${id}/passivate`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(`card:${id}`)
    return result
  },
  async syncCard(id: string) {
    const result = await apiClient.post<{ data: BankCardRow }>(`/api/accounting/bank-cards/${id}/sync`, undefined, { useCache: false })
    invalidateBankAccountCardCaches(`card:${id}`)
    return result
  },
}

function invalidateBankAccountCardCaches(recordId?: string, connectionId?: string) {
  apiClient.invalidate('/api/accounting/bank-accounts-cards')
  apiClient.invalidate('/api/accounting/bank-connections')
  if (recordId) apiClient.invalidate(`/api/accounting/bank-accounts-cards/${recordId}`)
  if (connectionId) {
    apiClient.invalidate(`/api/accounting/bank-connections/${connectionId}`)
    apiClient.invalidate(`/api/accounting/bank-connections/${connectionId}/accounts`)
    apiClient.invalidate(`/api/accounting/bank-connections/${connectionId}/cards`)
  }
}
