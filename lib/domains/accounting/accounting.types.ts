export type AccountingDomainEntity =
  | 'account_card'
  | 'account_movement'
  | 'bank_account'
  | 'invoice'
  | 'payment'
  | 'collection'

export interface AccountingDomainContext {
  tenantId: string
  companyId?: string | null
  accountId?: string | null
  userId?: string | null
}

