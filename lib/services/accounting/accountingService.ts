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
