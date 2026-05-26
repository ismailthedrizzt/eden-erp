export type ActionGuideIntent =
  | 'create_company_draft'
  | 'company_opening'
  | 'company_liquidation'
  | 'company_deregistration'
  | 'capital_increase'
  | 'capital_decrease'
  | 'title_change'
  | 'address_change'
  | 'public_registration_update'
  | 'nace_change'
  | 'activity_subject_change'
  | 'create_partner_draft'
  | 'initial_partnership_entry'
  | 'share_transfer'
  | 'ownership_exit'
  | 'partner_rights_change'
  | 'ownership_correction'
  | 'create_representative_draft'
  | 'representative_start'
  | 'representative_authority_renewal'
  | 'representative_authority_scope_change'
  | 'representative_limit_change'
  | 'representative_suspend'
  | 'representative_terminate'
  | 'branch_opening'
  | 'branch_closing'
  | 'branch_document_update'
  | 'branch_view'
  | 'branch_location_link'
  | 'branch_organization_link'
  | 'create_organization_unit'
  | 'assign_staff_to_unit'
  | 'manage_positions'
  | 'branch_staff_management'
  | 'create_facility'
  | 'link_facility_to_branch'
  | 'deactivate_facility'

export type ActionGuideActionType = 'navigate' | 'open_wizard' | 'open_record' | 'start_create' | 'focus_record'

export type ActionGuideAction = {
  label: string
  action_type: ActionGuideActionType
  target_page?: string
  wizard_key?: string
  record_id?: string | null
  record_type?: string | null
  disabled?: boolean
  reason?: string
}

export type ActionGuideContext = {
  currentPage?: string | null
  selectedRecordId?: string | null
  selectedRecordType?: string | null
  selectedRecordStatus?: string | null
  userPermissions?: string[]
  tenantId?: string | null
  companyId?: string | null
  branchId?: string | null
  activeCompanyId?: string | null
  activeBranchId?: string | null
  route?: string | null
  queryParams?: Record<string, string>
  availableModules?: string[]
}

export type ActionRegistryItem = {
  key: ActionGuideIntent
  label: string
  description: string
  intent_examples: string[]
  required_record_type?: string
  required_record_status?: string[]
  target_page: string
  wizard_key?: string
  permission?: string
  fallback_permission?: string
  blocking_rules?: string[]
  related_modules?: string[]
  create_action?: boolean
  steps: string[]
}

export type ActionGuideResult = {
  intent: ActionGuideIntent
  confidence: number
  title: string
  explanation: string
  steps: string[]
  target_page: string
  required_record_type?: string | null
  required_record_status?: string[] | null
  can_start_now: boolean
  blocking_reasons: string[]
  suggested_actions: ActionGuideAction[]
}
