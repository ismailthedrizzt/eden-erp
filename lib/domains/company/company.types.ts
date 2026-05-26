import type { DomainServiceContext } from '../domainService.types'

export type CompanyDomainEntity =
  | 'company'
  | 'company_lifecycle_event'
  | 'company_opening_detail'
  | 'company_liquidation_detail'
  | 'company_deregistration_detail'
  | 'company_official_change_transaction'

export type CompanyDomainContext = DomainServiceContext

export type CompanyLifecycleStatus = 'draft' | 'active' | 'liquidation' | 'deregistered' | 'unknown'
