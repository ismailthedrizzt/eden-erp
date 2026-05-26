export type ActionGuideActionType =
  | 'create_draft'
  | 'open_wizard'
  | 'operation'
  | 'navigate'
  | 'view'
  | 'help'

export type ActionGuideSuggestedActionType =
  | 'navigate'
  | 'open_wizard'
  | 'open_record'
  | 'show_help'
  | 'start_create'
  | 'focus_record'

export type ActionGuideIntent = string

export interface ActionGuideDefinition {
  key: string
  label: string
  description: string
  moduleKey: string
  domain: string
  actionType: ActionGuideActionType
  intentExamples: string[]
  keywords: string[]
  targetPage: string
  wizardKey?: string
  requiredRecordType?: string
  requiredRecordStatuses?: string[]
  blockedRecordStatuses?: string[]
  requiredModules?: string[]
  optionalModules?: string[]
  requiredPermissions?: string[]
  fallbackPermissions?: string[]
  relatedFields?: Array<{ entityType: string; field: string }>
  steps: string[]
  helpText: string
}

export interface ActionGuideRequest {
  query: string
  currentPage?: string | null
  selectedRecordType?: string | null
  selectedRecordId?: string | null
  selectedRecordStatus?: string | null
  companyId?: string | null
  branchId?: string | null
  organizationUnitId?: string | null
  facilityId?: string | null
  context?: Record<string, any>
}

export interface ActionGuideMatchedAction {
  key: string
  label: string
  confidence: number
}

export interface ActionGuideAction {
  label: string
  action_type: ActionGuideSuggestedActionType
  target_page?: string
  wizard_key?: string
  record_id?: string | null
  record_type?: string | null
  disabled?: boolean
  disabled_reason?: string
  reason?: string
}

export interface ActionGuideResponse {
  intent: string
  confidence: number
  title: string
  explanation: string
  steps: string[]
  target_page: string
  required_record_type?: string | null
  required_record_status?: string[] | null
  can_start_now: boolean
  blocking_reasons: string[]
  warnings: string[]
  suggested_actions: ActionGuideAction[]
  matched_actions?: ActionGuideMatchedAction[]
}

export type ActionGuideResult = ActionGuideResponse

export interface ActionGuideContext {
  currentPage?: string | null
  selectedRecordType?: string | null
  selectedRecordId?: string | null
  selectedRecordStatus?: string | null
  companyId?: string | null
  branchId?: string | null
  organizationUnitId?: string | null
  facilityId?: string | null
  activeCompanyId?: string | null
  activeBranchId?: string | null
  route?: string | null
  queryParams?: Record<string, string>
  context?: Record<string, any>
  userId?: string | null
  tenantId?: string | null
  permissions?: string[]
  userPermissions?: string[]
  availableModules?: string[]
  moduleStatuses?: Record<string, string>
  moduleBlockingReasons?: Record<string, string[]>
  moduleWarnings?: Record<string, string[]>
  record?: Record<string, any> | null
}

export interface ActionIntentMatch {
  actionKey: string
  confidence: number
  matchedTerms: string[]
  reason: string
}

export interface GuideActionEligibilityResult {
  canStart: boolean
  canView: boolean
  disabled: boolean
  blockingReasons: string[]
  warnings: string[]
  suggestedActions: ActionGuideAction[]
}

export type ActionRegistryItem = ActionGuideDefinition
