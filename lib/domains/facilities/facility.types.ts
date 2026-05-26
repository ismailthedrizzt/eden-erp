import type { DomainServiceContext } from '../domainService.types'

export type FacilityDomainEntity = 'facility' | 'location' | 'facility_lifecycle_event'

export type FacilityDomainContext = DomainServiceContext

export interface BranchFacilityPayload {
  companyId: string
  branchName: string
  facilityName?: string | null
  branchType?: string | null
  country?: string | null
  city?: string | null
  district?: string | null
  neighborhood?: string | null
  address?: string | null
  postalCode?: string | null
  phone?: string | null
  email?: string | null
  startDate?: string | null
  notes?: string | null
}
