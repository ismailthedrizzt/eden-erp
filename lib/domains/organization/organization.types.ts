import type { DomainServiceContext } from '../domainService.types'

export type OrganizationDomainEntity = 'organization_unit' | 'organization_unit_type' | 'position' | 'org_hierarchy'

export type OrganizationDomainContext = DomainServiceContext

export interface BranchOrganizationUnitPayload {
  companyId: string
  branchName: string
  branchShortName?: string | null
  parentUnitId?: string | null
  startDate?: string | null
  locationName?: string | null
  notes?: string | null
}
