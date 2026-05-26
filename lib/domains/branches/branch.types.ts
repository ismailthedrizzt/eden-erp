import type { DomainServiceContext } from '../domainService.types'

export type BranchDomainEntity = 'company_branch' | 'branch_official_change'

export type BranchDomainContext = DomainServiceContext

export interface BranchListQuery {
  companyId?: string | null
  includeDeleted?: boolean
  status?: string | null
  branchType?: string | null
  limit?: number
}

export interface BranchCreatePayload {
  company_id: string
  organization_unit_id?: string | null
  facility_id?: string | null
  branch_name: string
  branch_short_name?: string | null
  branch_type?: string | null
  is_official_branch?: boolean | null
  country?: string | null
  city?: string | null
  district?: string | null
  neighborhood?: string | null
  address?: string | null
  postal_code?: string | null
  phone?: string | null
  email?: string | null
  trade_registry_number?: string | null
  trade_registry_office?: string | null
  tax_office?: string | null
  sgk_workplace_registry_no?: string | null
  opening_decision_date?: string | null
  opening_registration_date?: string | null
  closing_decision_date?: string | null
  closing_registration_date?: string | null
  trade_registry_gazette_date?: string | null
  trade_registry_gazette_number?: string | null
  responsible_person_id?: string | null
  start_date?: string | null
  notes?: string | null
  document_files?: Record<string, any>[]
  metadata_json?: Record<string, any>
}

export interface BranchClosePayload {
  closing_reason?: string | null
  closing_decision_date?: string | null
  closing_registration_date?: string | null
  trade_registry_gazette_date?: string | null
  trade_registry_gazette_number?: string | null
  sgk_closing_notification?: boolean | null
  tax_office_notification?: boolean | null
  organization_unit_action?: string | null
  target_organization_unit_id?: string | null
  facility_action?: string | null
  notes?: string | null
  document_files?: Record<string, any>[]
  baseVersion?: number | null
  baseUpdatedAt?: string | null
}

export interface BranchCardPatch {
  branch_short_name?: string | null
  phone?: string | null
  email?: string | null
  responsible_person_id?: string | null
  organization_unit_id?: string | null
  facility_id?: string | null
  notes?: string | null
  baseVersion?: number | null
  baseUpdatedAt?: string | null
}
