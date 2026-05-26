import type { DomainServiceContext } from '../domainService.types'

export type OwnershipDomainEntity =
  | 'company_partner'
  | 'ownership_transaction'
  | 'current_ownership'
  | 'partner_ownership_lifecycle_event'

export type OwnershipDomainContext = DomainServiceContext

export interface OwnershipDistributionValidation {
  totalShareRatio: number
  activePartnerCount: number
  warnings: string[]
  blockingReasons: string[]
}
