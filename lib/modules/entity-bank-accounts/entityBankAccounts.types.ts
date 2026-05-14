export type EntityBankAccountKind = 'person' | 'organization'

export type BankAccountFormPriorityMode = 'tr_priority' | 'international_priority' | 'unknown_country'

export type EntityBankAccountVerificationStatus =
  | 'unverified'
  | 'manually_verified'
  | 'document_verified'
  | 'bank_integration_verified'
  | 'invalid'

export type EntityBankAccountStatus = 'active' | 'passive' | 'invalid'

export interface EntityBankAccount {
  id: string
  entity_kind: EntityBankAccountKind
  person_id?: string | null
  organization_id?: string | null
  beneficiary_name: string
  is_same_as_master_name: boolean
  beneficiary_name_note?: string | null
  iban?: string | null
  account_number?: string | null
  account_country?: string | null
  account_currency?: string | null
  bank_name?: string | null
  bank_country?: string | null
  bank_code?: string | null
  branch_name?: string | null
  branch_code?: string | null
  swift_bic?: string | null
  bank_address?: string | null
  local_clearing_code_type?: string | null
  local_clearing_code?: string | null
  has_intermediary_bank: boolean
  intermediary_bank_name?: string | null
  intermediary_swift_bic?: string | null
  intermediary_bank_address?: string | null
  intermediary_account_number?: string | null
  preferred_currency?: string | null
  payment_purpose?: string | null
  swift_charge_type?: 'SHA' | 'OUR' | 'BEN' | null
  payment_note?: string | null
  verification_status: EntityBankAccountVerificationStatus
  document_reference_id?: string | null
  is_default: boolean
  status: EntityBankAccountStatus
  history?: Array<Record<string, unknown>>
  autofill_sources?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  version?: number
}

export const ENTITY_BANK_ACCOUNT_PERMISSIONS = {
  view: 'entity_bank_accounts.view',
  insert: 'entity_bank_accounts.insert',
  edit: 'entity_bank_accounts.edit',
  passivate: 'entity_bank_accounts.passivate',
  setDefault: 'entity_bank_accounts.set_default',
  viewSensitive: 'entity_bank_accounts.view_sensitive',
  verify: 'entity_bank_accounts.verify',
} as const

export const VERIFICATION_STATUS_LABELS: Record<EntityBankAccountVerificationStatus, string> = {
  unverified: 'Doğrulanmadı',
  manually_verified: 'Manuel Doğrulandı',
  document_verified: 'Belge ile Doğrulandı',
  bank_integration_verified: 'Banka Entegrasyonu ile Doğrulandı',
  invalid: 'Hatalı / Kullanılamaz',
}
