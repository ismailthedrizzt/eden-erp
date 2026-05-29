'use client'

import type { ListMeta } from '@/lib/api/listEndpoint'

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown> | null
  message?: string | null
  warnings?: string[]
}

export type AccountingListResponse<T> = {
  data: T[]
  meta: ListMeta
}

export type CariRole =
  | 'customer'
  | 'supplier'
  | 'both'
  | 'employee'
  | 'partner'
  | 'stakeholder'
  | 'public_institution'
  | 'bank'
  | 'miscellaneous'
  | 'related_company'
  | 'other'

export type CariTransactionType =
  | 'expense'
  | 'income'
  | 'invoice'
  | 'payment'
  | 'collection'
  | 'bank_transaction'
  | 'card_transaction'
  | 'cash_transaction'
  | 'capital_payment'
  | 'capital_collection'
  | 'adjustment'
  | 'opening_balance'
  | 'transfer'
  | 'refund'
  | 'other'

export type Direction = 'debit' | 'credit'
export type DocumentStatus = 'no_document' | 'document_needed' | 'document_uploaded' | 'e_invoice_pending' | 'e_archive_pending' | 'invoice_matched' | 'rejected'
export type ReconciliationStatus = 'unmatched' | 'matched' | 'partially_matched' | 'needs_review' | 'ignored'
export type TransactionStatus = 'draft' | 'confirmed' | 'cancelled'
export type BankAccountType = 'checking' | 'deposit' | 'credit_card' | 'loan' | 'pos' | 'other'
export type BankIntegrationStatus = 'manual' | 'connected' | 'error' | 'disabled'
export type EDocumentKind = 'e_invoice' | 'e_archive' | 'paper_invoice' | 'receipt' | 'other'
export type EDocumentDirection = 'incoming' | 'outgoing'
export type EDocumentStatus = 'received' | 'issued' | 'accepted' | 'rejected' | 'cancelled' | 'matched' | 'needs_review'

export type CariAccount = {
  id: string
  tenant_id?: string
  company_id: string
  account_code: string
  account_name: string
  account_type: string
  cari_role: CariRole
  linked_entity_type?: string | null
  linked_entity_id?: string | null
  tax_number?: string | null
  tax_office?: string | null
  identity_number?: string | null
  country?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  iban?: string | null
  currency: string
  opening_balance: number
  current_balance: number
  risk_limit?: number | null
  payment_terms?: string | null
  record_status: string
  notes?: string | null
  last_transaction_date?: string | null
  version?: number
}

export type CariTransaction = {
  id: string
  company_id: string
  account_id: string
  account_code?: string | null
  account_name?: string | null
  transaction_date: string
  document_date?: string | null
  due_date?: string | null
  transaction_type: CariTransactionType
  direction: Direction
  debit?: number
  credit?: number
  amount: number
  currency: string
  exchange_rate?: number
  local_amount?: number
  description: string
  document_status: DocumentStatus
  document_no?: string | null
  document_type?: string | null
  real_counterparty_name?: string | null
  category?: string | null
  payment_method?: string | null
  paid_by_entity_type?: string | null
  paid_by_entity_id?: string | null
  paid_to_entity_type?: string | null
  paid_to_entity_id?: string | null
  related_module?: string | null
  related_entity_type?: string | null
  related_entity_id?: string | null
  reconciliation_status: ReconciliationStatus
  status: TransactionStatus
  version?: number
}

export type CariAccountSummary = {
  total_debit: number
  total_credit: number
  balance: number
  opening_balance: number
  last_transaction_date?: string | null
  unmatched_count: number
  overdue_count: number
}

export type CompanyAccountingSummary = {
  total_accounts: number
  total_debit: number
  total_credit: number
  balance: number
  unmatched_count: number
  overdue_count: number
  last_transaction_date?: string | null
}

export type BankAccount = {
  id: string
  company_id: string
  bank_name: string
  bank_code?: string | null
  branch_name?: string | null
  branch_code?: string | null
  account_name: string
  account_no?: string | null
  account_no_masked?: string | null
  iban?: string | null
  iban_masked?: string | null
  currency: string
  account_type: BankAccountType
  is_active: boolean
  opening_balance: number
  current_balance: number
  last_import_at?: string | null
  integration_status: BankIntegrationStatus
  notes?: string | null
  version?: number
}

export type BankTransaction = {
  id: string
  company_id: string
  bank_account_id: string
  transaction_date: string
  value_date?: string | null
  description: string
  counterparty_name?: string | null
  counterparty_iban?: string | null
  counterparty_iban_masked?: string | null
  amount: number
  direction: Direction
  currency: string
  local_amount?: number | null
  balance_after?: number | null
  bank_reference_no?: string | null
  transaction_code?: string | null
  imported_from: string
  reconciliation_status: ReconciliationStatus
  matched_cari_transaction_id?: string | null
  matched_invoice_id?: string | null
  confidence_score?: number | null
  notes?: string | null
  version?: number
}

export type CardTransaction = {
  id: string
  company_id: string
  card_account_id: string
  transaction_date: string
  posting_date?: string | null
  merchant_name?: string | null
  description: string
  amount: number
  currency: string
  installment_count?: number | null
  installment_no?: number | null
  category?: string | null
  document_status: DocumentStatus
  reconciliation_status: ReconciliationStatus
}

export type EDocument = {
  id: string
  company_id: string
  document_kind: EDocumentKind
  direction: EDocumentDirection
  invoice_uuid?: string | null
  invoice_no: string
  issue_date: string
  due_date?: string | null
  sender_tax_number?: string | null
  sender_name?: string | null
  receiver_tax_number?: string | null
  receiver_name?: string | null
  total_amount: number
  tax_amount: number
  payable_amount: number
  currency: string
  status: EDocumentStatus
  gib_status?: string | null
  related_cari_account_id?: string | null
  matched_cari_transaction_id?: string | null
  matched_bank_transaction_id?: string | null
  reconciliation_status: ReconciliationStatus
  notes?: string | null
  version?: number
}

export type ReconciliationSuggestion = {
  id: string
  source_type: string
  source_id: string
  target_type: string
  target_id: string
  company_id: string
  confidence_score: number
  reasons: Array<{ key: string; label: string; score: number }>
  source: Record<string, unknown>
  target: Record<string, unknown>
  status: string
}

export type CapitalReconciliation = {
  id: string
  company_id: string
  capital_transaction_id: string
  partner_id: string
  expected_amount: number
  paid_amount: number
  outstanding_amount: number
  currency: string
  reconciliation_status: ReconciliationStatus
  related_cari_transaction_id?: string | null
  related_bank_transaction_id?: string | null
  notes?: string | null
}

export type CariAccountListQuery = {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  direction?: 'asc' | 'desc'
  company_id?: string
  cari_role?: string
  record_status?: string
  balance_status?: string
  city?: string
}

export type CariTransactionListQuery = {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  sortDirection?: 'asc' | 'desc'
  company_id?: string
  account_id?: string
  transaction_type?: string
  direction?: string
  dateFrom?: string
  dateTo?: string
  document_status?: string
  payment_method?: string
  category?: string
  reconciliation_status?: string
  status?: string
}

export type AccountingDeepeningListQuery = {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  sortDirection?: 'asc' | 'desc'
  direction?: string
  company_id?: string
  reconciliation_status?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  [key: string]: string | number | boolean | undefined
}

export function unwrapList<T>(response: ApiEnvelope<AccountingListResponse<T>> | AccountingListResponse<T>): AccountingListResponse<T> {
  if ('data' in response && Array.isArray((response as AccountingListResponse<T>).data)) {
    return response as AccountingListResponse<T>
  }
  const envelope = response as ApiEnvelope<AccountingListResponse<T>>
  return {
    data: envelope.data?.data || [],
    meta: envelope.data?.meta || { page: 1, pageSize: 50, total: 0, totalPages: 1 },
  }
}

export function unwrapData<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export function normalizeMoney(value: unknown): number {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}
