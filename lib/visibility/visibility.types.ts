export type VisibilityStatus =
  | 'available'
  | 'disabled'
  | 'unlicensed'
  | 'setup_required'
  | 'dependency_missing'
  | 'permission_denied'
  | 'record_status_blocked'
  | 'hidden'

export interface VisibilitySetupAction {
  label: string
  targetPage?: string
  actionKey?: string
}

export interface VisibilityDecision {
  key: string
  visible: boolean
  enabled: boolean
  status: VisibilityStatus
  reason?: string
  warnings?: string[]
  targetPage?: string
  setupAction?: VisibilitySetupAction
  requiredPermissions?: string[]
  missingPermissions?: string[]
  requiredModules?: string[]
  missingModules?: string[]
}

export interface RuntimeVisibilityContext {
  userId?: string | null
  tenantId?: string
  currentPage?: string
  moduleKey?: string
  actionKey?: string
  recordType?: string
  recordId?: string
  recordStatus?: string
  companyId?: string
  branchId?: string
  permissions?: string[]
  modules?: Record<string, any> | any[]
  readiness?: Record<string, any> | any[] | null
  featureFlags?: Record<string, boolean>
}
