import type { TenantContext } from '@/lib/tenancy/server'

export type SetupStepType = 'check' | 'create_default' | 'configure' | 'import' | 'manual'

export interface SetupStepDefinition {
  key: string
  label: string
  description: string
  type: SetupStepType
  required: boolean
  actionKey?: string
  targetPage?: string
}

export interface ModuleReadinessDefinition {
  moduleKey: string
  requiredTables?: string[]
  optionalTables?: string[]
  requiredViews?: string[]
  optionalViews?: string[]
  requiredRpcs?: string[]
  optionalRpcs?: string[]
  requiredSettings?: string[]
  requiredDependencies?: string[]
  optionalDependencies?: string[]
  setupSteps?: SetupStepDefinition[]
}

export type ModuleReadinessState =
  | 'ready'
  | 'setup_required'
  | 'dependency_missing'
  | 'infrastructure_missing'
  | 'disabled'
  | 'unlicensed'

export interface ModuleReadinessStatus {
  moduleKey: string
  ready: boolean
  status: ModuleReadinessState
  blockingReasons: string[]
  warnings: string[]
  missingTables: string[]
  missingViews: string[]
  missingRpcs: string[]
  missingSettings: string[]
  missingDependencies: string[]
  setupSteps: SetupStepDefinition[]
}

export interface TenantReadinessStatus {
  tenantId: string
  ready: boolean
  modules: ModuleReadinessStatus[]
  blockingModules: string[]
  warningModules: string[]
  nextRecommendedSteps: SetupStepDefinition[]
}

export interface SetupAction {
  key: string
  label: string
  description: string
  action_type: 'navigate' | 'open_setup_wizard' | 'run_setup_action' | 'show_help'
  target_page?: string
  setup_key?: string
  disabled?: boolean
  disabled_reason?: string
}

export interface ReadinessCheckArgs {
  tenantContext: TenantContext
  moduleKey?: string
}
