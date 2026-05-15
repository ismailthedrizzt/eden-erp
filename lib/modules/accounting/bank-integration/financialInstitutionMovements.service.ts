import { apiClient } from '@/lib/api/apiClient'

export interface FinancialInstitutionMovementRow {
  id: string
  company_id?: string | null
  company_name?: string | null
  bank_connection_id?: string | null
  bank_account_id?: string | null
  bank_card_id?: string | null
  bank_name?: string | null
  account_card_name?: string | null
  source_type: 'bank_account' | 'card' | 'pos' | 'manual'
  movement_type?: string | null
  movement_date: string
  value_date?: string | null
  description?: string | null
  counterparty_name?: string | null
  counterparty_iban?: string | null
  reference_no?: string | null
  amount: number
  currency: string
  direction: 'debit' | 'credit'
  source: 'api' | 'manual' | 'csv' | 'excel' | 'mt940' | string
  external_transaction_id?: string | null
  raw_data?: Record<string, unknown>
  match_status: string
  matched_pre_accounting_movement_id?: string | null
  matched_at?: string | null
  matched_by?: string | null
  status: string
}

export interface MovementFilters {
  bankConnectionId?: string | null
  accountId?: string | null
  cardId?: string | null
  companyId?: string | null
  matchStatus?: string | null
  movementType?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  sourceType?: string | null
  direction?: string | null
}

export const financialInstitutionMovementsService = {
  getMovements(filters: MovementFilters = {}) {
    return apiClient.get<{ data: FinancialInstitutionMovementRow[]; summary: Record<string, number> }>('/api/accounting/financial-institution-movements', {
      query: filters as Record<string, string | number | boolean | null | undefined>,
      skipAuth: true,
      staleTime: 60_000,
    })
  },
  getMovement(id: string) {
    return apiClient.get<{ data: FinancialInstitutionMovementRow }>(`/api/accounting/financial-institution-movements/${id}`, { skipAuth: true, staleTime: 60_000 })
  },
  async createManual(payload: Partial<FinancialInstitutionMovementRow>) {
    const result = await apiClient.post<{ data: FinancialInstitutionMovementRow }>('/api/accounting/financial-institution-movements/manual', payload, { useCache: false })
    invalidateFinancialMovementCaches()
    return result
  },
  async updateMovement(id: string, payload: Partial<FinancialInstitutionMovementRow>) {
    const result = await apiClient.patch<{ data: FinancialInstitutionMovementRow }>(`/api/accounting/financial-institution-movements/${id}`, payload, { useCache: false })
    invalidateFinancialMovementCaches(id)
    return result
  },
  async match(id: string, preAccountingMovementId?: string) {
    const result = await apiClient.post<{ data: FinancialInstitutionMovementRow }>(`/api/accounting/financial-institution-movements/${id}/match`, { preAccountingMovementId }, { useCache: false })
    invalidateFinancialMovementCaches(id)
    return result
  },
  async unmatch(id: string) {
    const result = await apiClient.post<{ data: FinancialInstitutionMovementRow }>(`/api/accounting/financial-institution-movements/${id}/unmatch`, undefined, { useCache: false })
    invalidateFinancialMovementCaches(id)
    return result
  },
  createPreAccounting(id: string) {
    return apiClient.post<{ data: { redirectUrl: string } }>(`/api/accounting/financial-institution-movements/${id}/create-pre-accounting`, undefined, { useCache: false })
  },
  async review(id: string) {
    const result = await apiClient.post<{ data: FinancialInstitutionMovementRow }>(`/api/accounting/financial-institution-movements/${id}/review`, undefined, { useCache: false })
    invalidateFinancialMovementCaches(id)
    return result
  },
  async passivate(id: string) {
    const result = await apiClient.post<{ data: FinancialInstitutionMovementRow }>(`/api/accounting/financial-institution-movements/${id}/passivate`, undefined, { useCache: false })
    invalidateFinancialMovementCaches(id)
    return result
  },
}

function invalidateFinancialMovementCaches(id?: string) {
  apiClient.invalidate('/api/accounting/financial-institution-movements')
  if (id) apiClient.invalidate(`/api/accounting/financial-institution-movements/${id}`)
}
