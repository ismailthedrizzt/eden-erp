import type { DomainServiceContext } from '../domainService.types'

export type RepresentativeDomainEntity =
  | 'company_representative'
  | 'representative_authority'
  | 'representative_authority_transaction'
  | 'current_representative_authority'

export type RepresentativeDomainContext = DomainServiceContext

export type RepresentativeAuthorityScopeType = 'company_wide' | 'branch' | 'organization_unit' | 'facility'

export interface RepresentativeAuthorityScopeInput {
  scope_type?: string | null
  branch_id?: string | null
  organization_unit_id?: string | null
  facility_id?: string | null
  scope_label?: string | null
  scope_notes?: string | null
}
