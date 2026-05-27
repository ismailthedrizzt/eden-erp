// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: setup
// TARGET_ENDPOINT: /api/v1/setup/readiness
// NOTES: Readiness checks should move to Python startup/request guard services.

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getModuleContract, listModuleContracts } from '@/lib/modules/moduleRegistry'
import {
  getModuleRuntimeStatus,
  loadModuleFeatureContext,
} from '@/lib/modules/moduleFeatureResolver'
import type { ModuleFeatureResolverContext } from '@/lib/modules/moduleContract.types'
import type { TenantContext } from '@/lib/tenancy/server'
import { systemParameterDefinitions } from '@/lib/system/systemParameters.config'
import {
  getModuleReadinessDefinition,
  listModuleReadinessDefinitions,
} from './moduleReadinessRegistry'
import {
  moduleDependencyMissingMessage,
  moduleSetupIncompleteMessage,
  optionalDependencyWarning,
  optionalInfrastructureWarning,
} from './setupMessages'
import type {
  ModuleReadinessDefinition,
  ModuleReadinessState,
  ModuleReadinessStatus,
  TenantReadinessStatus,
} from './setup.types'
import { normalizeInfrastructureError } from './infrastructureErrorMapper'

export async function checkModuleReadiness(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  moduleKey: string
): Promise<ModuleReadinessStatus> {
  const featureContext = await loadModuleFeatureContext(supabase, { tenantId: tenantContext.tenantId })
    .catch(() => ({ tenantId: tenantContext.tenantId, moduleLicenses: [] }))
  return evaluateModuleReadiness(supabase, tenantContext, moduleKey, featureContext)
}

export async function checkTenantReadiness(
  supabase: SupabaseClient,
  tenantContext: TenantContext
): Promise<TenantReadinessStatus> {
  const featureContext = await loadModuleFeatureContext(supabase, { tenantId: tenantContext.tenantId })
    .catch(() => ({ tenantId: tenantContext.tenantId, moduleLicenses: [] }))
  const moduleKeys = unique([
    ...listModuleContracts().map(contract => contract.key),
    ...listModuleReadinessDefinitions().map(definition => definition.moduleKey),
  ])
  const modules: ModuleReadinessStatus[] = []
  for (const moduleKey of moduleKeys) {
    modules.push(await evaluateModuleReadiness(supabase, tenantContext, moduleKey, featureContext))
  }
  const blockingModules = modules.filter(item => !item.ready).map(item => item.moduleKey)
  const warningModules = modules.filter(item => item.warnings.length > 0).map(item => item.moduleKey)
  return {
    tenantId: tenantContext.tenantId,
    ready: blockingModules.length === 0,
    modules,
    blockingModules,
    warningModules,
    nextRecommendedSteps: modules.flatMap(item => item.ready ? [] : item.setupSteps).slice(0, 8),
  }
}

export async function checkTableExists(supabase: SupabaseClient, tableName: string) {
  return checkRelationExists(supabase, tableName)
}

export async function checkViewExists(supabase: SupabaseClient, viewName: string) {
  return checkRelationExists(supabase, viewName)
}

export async function checkRpcExists(_supabase: SupabaseClient, _rpcName: string) {
  // Supabase does not expose a safe metadata endpoint for RPC discovery by default.
  // We avoid calling operation RPCs with dummy payloads because some of them mutate data.
  return false
}

export async function checkRequiredSettings(
  supabase: SupabaseClient,
  _tenantContext: TenantContext,
  settings: string[] = []
) {
  const missing: string[] = []
  const definitions = new Set(systemParameterDefinitions.map(item => item.key))
  const unknownSettings = settings.filter(key => !definitions.has(normalizeSettingKey(key)))
  if (!unknownSettings.length) return missing

  const { data, error } = await supabase
    .from('system_parameters')
    .select('parameter_key')
    .in('parameter_key', unknownSettings.map(normalizeSettingKey))

  if (error) {
    const normalized = normalizeInfrastructureError(error)
    if (normalized.isMissing) return unknownSettings
    return []
  }

  const present = new Set((data || []).map(row => row.parameter_key))
  missing.push(...unknownSettings.filter(key => !present.has(normalizeSettingKey(key))))
  return missing
}

export { normalizeInfrastructureError }

async function evaluateModuleReadiness(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  moduleKey: string,
  featureContext: ModuleFeatureResolverContext
): Promise<ModuleReadinessStatus> {
  const definition = getModuleReadinessDefinition(moduleKey)
  const contract = getModuleContract(moduleKey)
  const baseSteps = definition?.setupSteps || []

  if (contract) {
    const runtime = getModuleRuntimeStatus(moduleKey, featureContext)
    if (runtime.status === 'disabled' || runtime.status === 'unlicensed') {
      return readinessStatus(moduleKey, runtime.status, runtime.blocking_reasons, runtime.warnings, baseSteps)
    }
    if (runtime.status === 'dependency_missing') {
      return readinessStatus(moduleKey, 'dependency_missing', runtime.blocking_reasons, runtime.warnings, baseSteps, {
        missingDependencies: definition?.requiredDependencies || [],
      })
    }
    if (runtime.status === 'setup_required') {
      return readinessStatus(moduleKey, 'setup_required', runtime.blocking_reasons, runtime.warnings, baseSteps)
    }
  }

  if (!definition) {
    return readinessStatus(moduleKey, 'ready', [], [`${moduleKey} icin kurulum kontrol tanimi henuz eklenmemis.`], [])
  }

  const dependencyResult = checkDependencies(definition, featureContext)
  const missingTables = await missingRelations(supabase, definition.requiredTables || [], checkTableExists)
  const missingViews = await missingRelations(supabase, definition.requiredViews || [], checkViewExists)
  const missingRpcs = await missingRpcsForDefinition(supabase, definition.requiredRpcs || [])
  const missingSettings = await checkRequiredSettings(supabase, tenantContext, definition.requiredSettings || [])
  const optionalWarnings = await optionalInfrastructureWarnings(supabase, definition)

  const warnings = unique([
    ...dependencyResult.warnings,
    ...optionalWarnings,
  ])

  if (dependencyResult.missingDependencies.length) {
    return readinessStatus(moduleKey, 'dependency_missing', dependencyResult.blockingReasons, warnings, baseSteps, {
      missingDependencies: dependencyResult.missingDependencies,
      missingTables,
      missingViews,
      missingRpcs,
      missingSettings,
    })
  }

  if (missingTables.length || missingViews.length || missingRpcs.length) {
    return readinessStatus(moduleKey, 'infrastructure_missing', [moduleSetupIncompleteMessage(moduleKey)], warnings, baseSteps, {
      missingTables,
      missingViews,
      missingRpcs,
      missingSettings,
    })
  }

  if (missingSettings.length) {
    return readinessStatus(moduleKey, 'setup_required', [moduleSetupIncompleteMessage(moduleKey)], warnings, baseSteps, {
      missingSettings,
    })
  }

  return readinessStatus(moduleKey, 'ready', [], warnings, baseSteps)
}

function checkDependencies(definition: ModuleReadinessDefinition, featureContext: ModuleFeatureResolverContext) {
  const missingDependencies: string[] = []
  const blockingReasons: string[] = []
  const warnings: string[] = []
  for (const dependency of definition.requiredDependencies || []) {
    const status = getModuleContract(dependency) ? getModuleRuntimeStatus(dependency, featureContext).status : 'available'
    if (status !== 'available') {
      missingDependencies.push(dependency)
      blockingReasons.push(moduleDependencyMissingMessage(definition.moduleKey, dependency))
    }
  }
  for (const dependency of definition.optionalDependencies || []) {
    const status = getModuleContract(dependency) ? getModuleRuntimeStatus(dependency, featureContext).status : 'available'
    if (status !== 'available') warnings.push(optionalDependencyWarning(definition.moduleKey, dependency))
  }
  return { missingDependencies, blockingReasons, warnings }
}

async function checkRelationExists(supabase: SupabaseClient, relationName: string) {
  const { error } = await supabase
    .from(relationName)
    .select('*', { head: true, count: 'exact' })
    .limit(1)
  if (!error) return true
  const normalized = normalizeInfrastructureError(error)
  return !normalized.isMissing
}

async function missingRelations(
  supabase: SupabaseClient,
  names: string[],
  checker: (supabase: SupabaseClient, name: string) => Promise<boolean>
) {
  const missing: string[] = []
  for (const name of names) {
    if (!await checker(supabase, name)) missing.push(name)
  }
  return missing
}

async function missingRpcsForDefinition(supabase: SupabaseClient, rpcs: string[]) {
  const missing: string[] = []
  for (const rpc of rpcs) {
    if (!await checkRpcExists(supabase, rpc)) missing.push(rpc)
  }
  return missing
}

async function optionalInfrastructureWarnings(supabase: SupabaseClient, definition: ModuleReadinessDefinition) {
  const warnings: string[] = []
  const optionalTables = await missingRelations(supabase, definition.optionalTables || [], checkTableExists)
  const optionalViews = await missingRelations(supabase, definition.optionalViews || [], checkViewExists)
  const optionalRpcs = await missingRpcsForDefinition(supabase, definition.optionalRpcs || [])
  if (optionalTables.length || optionalViews.length || optionalRpcs.length) {
    warnings.push(optionalInfrastructureWarning(definition.moduleKey))
  }
  return warnings
}

function readinessStatus(
  moduleKey: string,
  status: ModuleReadinessState,
  blockingReasons: string[],
  warnings: string[],
  setupSteps: ModuleReadinessStatus['setupSteps'],
  missing: Partial<Pick<ModuleReadinessStatus, 'missingTables' | 'missingViews' | 'missingRpcs' | 'missingSettings' | 'missingDependencies'>> = {}
): ModuleReadinessStatus {
  return {
    moduleKey,
    ready: status === 'ready',
    status,
    blockingReasons: unique(blockingReasons),
    warnings: unique(warnings),
    missingTables: missing.missingTables || [],
    missingViews: missing.missingViews || [],
    missingRpcs: missing.missingRpcs || [],
    missingSettings: missing.missingSettings || [],
    missingDependencies: missing.missingDependencies || [],
    setupSteps,
  }
}

function normalizeSettingKey(key: string) {
  if (key === 'default_currency') return 'company.default_currency'
  if (key === 'default_language') return 'company.default_language'
  return key
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)))
}
