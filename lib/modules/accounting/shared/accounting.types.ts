export type AccountingEntityKind = 'person' | 'organization'
export type MovementDirection = 'debit' | 'credit'

export interface AccountCardRow {
  id?: string
  company_id?: string | null
  entity_kind: AccountingEntityKind
  person_id?: string | null
  organization_id?: string | null
  display_name: string
  identity_no?: string | null
  tax_no?: string | null
  roles?: string[]
  account_code?: string | null
  official_balance: number
  pending_balance: number
  projected_balance?: number
  currency: string
  last_movement_date?: string | null
  risk_status?: string | null
  status?: string | null
}

export interface AccountMovementRow {
  id: string
  company_id?: string | null
  movement_type: string
  movement_date: string
  description?: string | null
  performed_by_person_id?: string | null
  performed_by_name?: string | null
  counterparty_kind: AccountingEntityKind
  counterparty_person_id?: string | null
  counterparty_organization_id?: string | null
  counterparty_name?: string | null
  direction: MovementDirection
  amount: number
  currency: string
  payment_method: string
  document_status: string
  invoice_match_status: string
  bank_match_status: string
  reconciliation_status: string
  row_health_status: string
  status: string
  version?: number
}
