import type { SupabaseClient } from '@supabase/supabase-js'

export type ModuleContractStatus = 'active' | 'planned' | 'experimental' | 'deprecated'
export type ModuleRouteType = 'page' | 'api'
export type ModuleActionType = 'create_draft' | 'open_wizard' | 'operation' | 'navigate' | 'view' | 'edit'
export type ModuleRuntimeAvailability = 'available' | 'disabled' | 'unlicensed' | 'setup_required' | 'dependency_missing'

export interface ModuleContract {
  key: string
  name: string
  description?: string
  domain: string
  category?: string
  version: string
  status: ModuleContractStatus
  defaultEnabled: boolean
  licenseRequired: boolean
  setupRequired: boolean
  dependencies: ModuleDependency[]
  entities: ModuleEntityContract[]
  routes: ModuleRouteContract[]
  menus: ModuleMenuContract[]
  permissions: ModulePermissionContract[]
  actions: ModuleActionContract[]
  projections: ModuleProjectionContract[]
  events: ModuleEventContract[]
  featureFlags?: ModuleFeatureFlagContract[]
}

export interface ModuleDependency {
  moduleKey: string
  required: boolean
  reason?: string
}

export interface ModuleEntityContract {
  key: string
  tableName?: string
  displayName: string
  lifecycle?: boolean
  draftSupported?: boolean
  hardDeleteDraftOnly?: boolean
}

export interface ModuleRouteContract {
  path: string
  type: ModuleRouteType
  permission?: string
  fallbackPermission?: string
}

export interface ModuleMenuContract {
  label: string
  path: string
  icon?: string
  order?: number
  parent?: string
  permission?: string
  featureFlag?: string
}

export interface ModulePermissionContract {
  key: string
  label: string
  description?: string
  fallback?: string[]
}

export interface ModuleActionContract {
  key: string
  label: string
  actionType: ModuleActionType
  targetPage?: string
  wizardKey?: string
  permission?: string
  fallbackPermission?: string
  requiredRecordType?: string
  requiredRecordStatus?: string[]
  blockedRecordStatus?: string[]
  featureFlag?: string
}

export interface ModuleProjectionContract {
  key: string
  projectionKey: string
  required: boolean
}

export interface ModuleEventContract {
  eventType: string
  version: string
  aggregateType: string
}

export interface ModuleFeatureFlagContract {
  key: string
  label: string
  defaultEnabled: boolean
  description?: string
}

export interface ModuleLicenseRuntimeRow {
  module_key: string
  module_name?: string | null
  name?: string | null
  is_active?: boolean | null
  status?: string | null
  environment?: string | null
  settings?: Record<string, unknown> | null
  settings_json?: Record<string, unknown> | null
}

export interface ModuleFeatureResolverContext {
  supabase?: SupabaseClient
  tenantId?: string | null
  environment?: string
  moduleLicenses?: ModuleLicenseRuntimeRow[] | Record<string, ModuleLicenseRuntimeRow>
  enabledModuleKeys?: string[]
  disabledModuleKeys?: string[]
  licensedModuleKeys?: string[]
  unlicensedModuleKeys?: string[]
  setupCompleteModules?: string[]
  setupIncompleteModules?: string[]
  featureFlags?: Record<string, boolean>
  userPermissions?: string[]
}

export interface ModuleRuntimeStatus {
  moduleKey: string
  enabled: boolean
  licensed: boolean
  setupComplete: boolean
  status: ModuleRuntimeAvailability
  blocking_reasons: string[]
  warnings: string[]
}

export interface ModuleBootstrapContract {
  key: string
  name: string
  enabled: boolean
  licensed: boolean
  setupComplete: boolean
  status: ModuleRuntimeAvailability
  permissions: string[]
  actions: ModuleActionContract[]
  routes: ModuleRouteContract[]
  warnings: string[]
}

export interface AvailableModuleAction {
  moduleKey: string
  action: ModuleActionContract
  can_start_now: boolean
  blocking_reasons: string[]
  warnings: string[]
}
