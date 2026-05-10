export type OwnershipTransactionStatus = 'draft' | 'active' | 'cancelled' | 'reversed' | 'passive'
export type OwnershipApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'

export type OwnershipTransactionType =
  | 'Yeni Ortak Girişi'
  | 'Pay Devri'
  | 'Kısmi Pay Devri'
  | 'Ortaklıktan Çıkış'
  | 'Sermaye Artırımı'
  | 'Sermaye Azaltımı'
  | 'Oy Hakkı Değişikliği'
  | 'Kar Payı Oranı Değişikliği'
  | 'İmtiyazlı Pay Tanımı'
  | 'İmtiyazlı Pay Kaldırma'
  | 'Kontrol Hakkı Tanımı'
  | 'Veto Hakkı Tanımı'
  | 'Yönetim Kurulu Aday Hakkı Tanımı'
  | 'Nihai Faydalanıcı Değişikliği'
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
  transfer_price?: number | null
  currency?: string | null
  has_control_right?: boolean
  control_type?: string | null
  has_veto_right?: boolean
  has_board_nomination_right?: boolean
  has_privileged_share?: boolean
  privilege_type?: string | null
  is_beneficial_owner?: boolean
  beneficial_ratio?: number | null
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
  current_share_units: number
  has_control_right: boolean
  control_type?: string | null
  has_veto_right: boolean
  has_board_nomination_right: boolean
  has_privileged_share: boolean
  is_beneficial_owner: boolean
  beneficial_ratio?: number | null
  last_transaction_date?: string | null
  warnings?: string[]
}
