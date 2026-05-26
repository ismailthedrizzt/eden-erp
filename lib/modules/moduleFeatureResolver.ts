import type { SupabaseClient } from '@supabase/supabase-js'
import { hasAnyPermission } from '@/lib/security/permissionRegistry'
import {
  allModuleContracts,
  getModuleContract,
  getModuleProjectionWarnings,
  listModuleContracts,
} from './moduleRegistry'
import {
  canEnableModule,
  getModuleDependencyWarnings,
  getMissingRequiredDependencies,
} from './moduleDependencyResolver'
import type {
  AvailableModuleAction,
  ModuleBootstrapContract,
  ModuleFeatureResolverContext,
  ModuleLicenseRuntimeRow,
  ModuleRuntimeStatus,
} from './moduleContract.types'

const MODULE_LICENSE_ALIASES: Record<string, string[]> = {
  companies: ['sirket'],
  partners: ['sirket'],
  representatives: ['sirket'],
  branches: ['sirket'],
  organization: ['teskilat', 'kadro', 'sirket'],
  facilities: ['tesisler', 'sirket'],
  accounting: ['muhasebe'],
  hr: ['ik', 'employees'],
  settings: ['sistem', 'tenancy'],
}

export async function loadModuleFeatureContext(supabase: SupabaseClient, context: ModuleFeatureResolverContext = {}) {
  const moduleLicenses = await fetchModuleLicenseRows(supabase)
  return {
    ...context,
    supabase,
    moduleLicenses,
  }
}

export function isModuleEnabled(moduleKey: string, context: ModuleFeatureResolverContext = {}) {
  const contract = getModuleContract(moduleKey)
  if (!contract) return false
  if (context.disabledModuleKeys?.includes(moduleKey)) return false
  if (context.enabledModuleKeys) return context.enabledModuleKeys.includes(moduleKey)
  const license = findModuleLicense(moduleKey, context)
  if (!license) return contract.defaultEnabled
  return licenseAllowsEnvironment(license, context.environment) && licenseIsActive(license)
}

export function isModuleLicensed(moduleKey: string, context: ModuleFeatureResolverContext = {}) {
  const contract = getModuleContract(moduleKey)
  if (!contract) return false
  if (!contract.licenseRequired) return true
  if (context.unlicensedModuleKeys?.includes(moduleKey)) return false
  if (context.licensedModuleKeys?.includes(moduleKey)) return true
  const license = findModuleLicense(moduleKey, context)
  return license ? licenseIsActive(license) : false
}

export function isModuleSetupComplete(moduleKey: string, context: ModuleFeatureResolverContext = {}) {
  const contract = getModuleContract(moduleKey)
  if (!contract) return false
  if (!contract.setupRequired) return true
  if (context.setupIncompleteModules?.includes(moduleKey)) return false
  if (context.setupCompleteModules?.includes(moduleKey)) return true
  return true
}

export function isFeatureEnabled(moduleKey: string, featureKey: string, context: ModuleFeatureResolverContext = {}) {
  const contract = getModuleContract(moduleKey)
  const feature = contract?.featureFlags?.find(item => item.key === featureKey)
  if (!feature) return true
  const namespaced = `${moduleKey}.${featureKey}`
  if (context.featureFlags && Object.prototype.hasOwnProperty.call(context.featureFlags, namespaced)) {
    return Boolean(context.featureFlags[namespaced])
  }
  if (context.featureFlags && Object.prototype.hasOwnProperty.call(context.featureFlags, featureKey)) {
    return Boolean(context.featureFlags[featureKey])
  }
  return feature.defaultEnabled
}

export function getModuleRuntimeStatus(moduleKey: string, context: ModuleFeatureResolverContext = {}): ModuleRuntimeStatus {
  const contract = getModuleContract(moduleKey)
  if (!contract) {
    return {
      moduleKey,
      enabled: false,
      licensed: false,
      setupComplete: false,
      status: 'disabled',
      blocking_reasons: [`${moduleKey} modul sozlesmesi bulunamadi.`],
      warnings: [],
    }
  }

  const enabled = isModuleEnabled(moduleKey, context)
  const licensed = isModuleLicensed(moduleKey, context)
  const setupComplete = isModuleSetupComplete(moduleKey, context)
  const enabledModuleKeys = getRuntimeEnabledModuleKeys(context)
  const missingRequired = getMissingRequiredDependencies(moduleKey, enabledModuleKeys)
  const dependencyCheck = canEnableModule(moduleKey, enabledModuleKeys)
  const warnings = getModuleDependencyWarnings(moduleKey, enabledModuleKeys)

  if (!enabled) {
    return {
      moduleKey,
      enabled,
      licensed,
      setupComplete,
      status: 'disabled',
      blocking_reasons: [`${contract.name} modulu bu calisma alaninda aktif degil.`],
      warnings,
    }
  }

  if (!licensed) {
    return {
      moduleKey,
      enabled,
      licensed,
      setupComplete,
      status: 'unlicensed',
      blocking_reasons: [`${contract.name} modulu icin lisans aktif degil.`],
      warnings,
    }
  }

  if (!setupComplete) {
    return {
      moduleKey,
      enabled,
      licensed,
      setupComplete,
      status: 'setup_required',
      blocking_reasons: [`${contract.name} modulu kullanilmadan once kurulum tamamlanmalidir.`],
      warnings,
    }
  }

  if (missingRequired.length) {
    return {
      moduleKey,
      enabled,
      licensed,
      setupComplete,
      status: 'dependency_missing',
      blocking_reasons: dependencyCheck.blocking_reasons,
      warnings,
    }
  }

  return {
    moduleKey,
    enabled,
    licensed,
    setupComplete,
    status: 'available',
    blocking_reasons: [],
    warnings,
  }
}

export function listModuleRuntimeStatuses(context: ModuleFeatureResolverContext = {}) {
  return listModuleContracts().map(contract => getModuleRuntimeStatus(contract.key, context))
}

export function buildSessionModules(context: ModuleFeatureResolverContext = {}): ModuleBootstrapContract[] {
  return allModuleContracts.map(contract => {
    const runtime = getModuleRuntimeStatus(contract.key, context)
    return {
      key: contract.key,
      name: contract.name,
      enabled: runtime.enabled,
      licensed: runtime.licensed,
      setupComplete: runtime.setupComplete,
      status: runtime.status,
      permissions: contract.permissions.map(permission => permission.key),
      actions: contract.actions,
      routes: contract.routes,
      warnings: [...runtime.warnings, ...getModuleProjectionWarnings(contract.key)],
    }
  })
}

export function listAvailableActions(context: ModuleFeatureResolverContext = {}): AvailableModuleAction[] {
  return allModuleContracts.flatMap(module => listAvailableActionsForModule(module.key, context))
}

export function listAvailableActionsForModule(moduleKey: string, context: ModuleFeatureResolverContext = {}): AvailableModuleAction[] {
  const contract = getModuleContract(moduleKey)
  if (!contract) return []
  const runtime = getModuleRuntimeStatus(moduleKey, context)
  if (runtime.status === 'disabled' || runtime.status === 'unlicensed') return []
  return contract.actions.map(action => {
    const permissionKeys = [action.permission, action.fallbackPermission].filter(Boolean) as string[]
    const hasPermission = permissionKeys.length ? hasAnyPermission(context.userPermissions, permissionKeys) : true
    const blocking_reasons = [
      ...(runtime.status === 'available' ? [] : runtime.blocking_reasons),
      ...(hasPermission ? [] : ['Bu islemi baslatmak icin gerekli yetkiniz gorunmuyor.']),
    ]
    return {
      moduleKey,
      action,
      can_start_now: runtime.status === 'available' && hasPermission,
      blocking_reasons,
      warnings: runtime.warnings,
    }
  })
}

export function getRuntimeEnabledModuleKeys(context: ModuleFeatureResolverContext = {}) {
  if (context.enabledModuleKeys) return context.enabledModuleKeys
  return allModuleContracts
    .filter(contract => isModuleEnabled(contract.key, { ...context, enabledModuleKeys: undefined }))
    .map(contract => contract.key)
}

export function moduleRuntimeStatusMap(context: ModuleFeatureResolverContext = {}) {
  return Object.fromEntries(listModuleRuntimeStatuses(context).map(status => [status.moduleKey, status]))
}

async function fetchModuleLicenseRows(supabase: SupabaseClient): Promise<ModuleLicenseRuntimeRow[]> {
  const full = await supabase
    .from('module_licenses')
    .select('module_key,module_name,name,is_active,status,environment,settings,settings_json')
  if (!full.error) return full.data || []
  if (!isMissingColumnOrTableError(full.error)) throw new Error(full.error.message)

  const legacy = await supabase
    .from('module_licenses')
    .select('module_key,name,status,settings')
  if (legacy.error) {
    if (isMissingColumnOrTableError(legacy.error)) return []
    throw new Error(legacy.error.message)
  }
  return legacy.data || []
}

function findModuleLicense(moduleKey: string, context: ModuleFeatureResolverContext) {
  const licenses = normalizeLicenseMap(context.moduleLicenses)
  const candidates = [moduleKey, ...(MODULE_LICENSE_ALIASES[moduleKey] || [])]
  return candidates.map(key => licenses[key]).find(Boolean) || null
}

function normalizeLicenseMap(source: ModuleFeatureResolverContext['moduleLicenses']) {
  if (!source) return {} as Record<string, ModuleLicenseRuntimeRow>
  if (Array.isArray(source)) return Object.fromEntries(source.map(row => [row.module_key, row]))
  return source
}

function licenseIsActive(row: ModuleLicenseRuntimeRow) {
  if (typeof row.is_active === 'boolean') return row.is_active
  return String(row.status || 'active').toLocaleLowerCase('tr-TR') !== 'disabled'
    && String(row.status || 'active').toLocaleLowerCase('tr-TR') !== 'inactive'
}

function licenseAllowsEnvironment(row: ModuleLicenseRuntimeRow, environment: string = process.env.NODE_ENV || 'development') {
  const value = String(row.environment || 'all')
  if (value === 'all') return true
  if (value === 'dev') return environment === 'development'
  if (value === 'prod') return environment === 'production'
  return value === environment
}

function isMissingColumnOrTableError(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}
