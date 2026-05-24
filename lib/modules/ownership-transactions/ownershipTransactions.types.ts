export type OwnershipTransactionStatus = 'draft' | 'active' | 'cancelled' | 'reversed' | 'passive'
export type OwnershipApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'

export type OwnershipTransactionType =
  | 'initial_partnership_entry'
  | 'Pay Devri'
  | 'Kısmi Pay Devri'
  | 'Ortaklıktan Çıkış'
  | 'Oy Hakkı Değişikliği'
  | 'Kar Payı Oranı Değişikliği'
  | 'İmtiyazlı Pay Tanımı'
  | 'İmtiyazlı Pay Kaldırma'
  | 'Düzeltme Kaydı'
  | 'Ters Kayıt'

export interface OwnershipTransaction {
  id: string
  company_id: string
  transaction_no: string
  transaction_type: OwnershipTransactionType
  transaction_date: string
  effective_date: string
  from_partner_id?: string | null
  to_partner_id?: string | null
  affected_partner_id?: string | null
  share_ratio?: number | null
  voting_ratio?: number | null
  profit_ratio?: number | null
  share_units?: number | null
  nominal_value?: number | null
  capital_amount?: number | null
  new_capital_amount?: number | null
  committed_capital_amount?: number | null
  transfer_price?: number | null
  currency?: string | null
  has_veto_right?: boolean
  has_board_nomination_right?: boolean
  has_privileged_share?: boolean
  privilege_type?: string | null
  privilege_description?: string | null
  privilege_start_date?: string | null
  privilege_end_date?: string | null
  removed_privilege_type?: string | null
  removal_date?: string | null
  old_voting_ratio?: number | null
  new_voting_ratio?: number | null
  old_profit_ratio?: number | null
  new_profit_ratio?: number | null
  commitment_date?: string | null
  capital_distribution?: Record<string, unknown>[] | null
  correction_transaction_id?: string | null
  correction_reason?: string | null
  new_values?: Record<string, unknown> | null
  reversal_transaction_id?: string | null
  reversal_reason?: string | null
  document_status?: string
  document_reference_id?: string | null
  decision_reference_id?: string | null
  document_files?: Record<string, unknown>[]
  status: OwnershipTransactionStatus
  approval_status: OwnershipApprovalStatus
  workflow_status?: OwnershipApprovalStatus
  description?: string | null
  transaction_reason?: string | null
  exit_reason?: string | null
  justification?: string | null
  notes?: string | null
  warnings?: string[]
  history?: Record<string, unknown>[]
  is_deleted?: boolean
}

export interface CurrentOwnershipRow {
  company_id: string
  partner_id: string
  owner_kind?: string
  person_id?: string | null
  organization_id?: string | null
  display_name: string
  current_share_ratio: number
  current_voting_ratio: number
  current_profit_ratio: number
  current_capital_amount: number
  committed_capital_amount?: number
  current_share_units: number
  has_veto_right: boolean
  has_board_nomination_right: boolean
  has_privileged_share: boolean
  last_transaction_date?: string | null
  warnings?: string[]
}

export interface CapitalPaymentMovement {
  id: string
  movement_date: string
  movement_type: string
  partner_name?: string | null
  amount: number
  currency: string
  capital_relation_type?: string | null
  offset_amount?: number | null
  status: string
  document_reference_id?: string | null
}

export type CapitalPaymentStatus =
  | 'Taahhüt Yok'
  | 'Ödeme Bekleniyor'
  | 'Kısmi Ödendi'
  | 'Tam Ödendi'
  | 'Fazla Ödeme Var'
  | 'Sermaye Avansı Var'
  | 'Uyuşmazlık / İnceleme Gerekli'

export interface CapitalPaymentSummary {
  committedCapital: number
  paidCapital: number
  remainingCapitalDebt: number
  overpayment: number
  paymentStatus: CapitalPaymentStatus
}
