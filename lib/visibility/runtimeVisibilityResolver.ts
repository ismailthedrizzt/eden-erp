import { isFeatureFlagEnabled } from '@/lib/features/featureFlags'
import { isModuleEntitled } from '@/lib/licensing/tenantEntitlements'
import {
  findClientActionContract,
  findClientModuleByRoute,
  getClientModuleContract,
  listClientModuleContracts,
} from '@/lib/modules/moduleClientRegistry'
import type { ModuleActionContract } from '@/lib/modules/moduleContract.types'
import { hasAnyPermission } from '@/lib/security/permissionRegistry'
import {
  explainVisibilityDecision as explainDecisionMessage,
  moduleStatusMessage,
  setupActionForStatus,
  visibilityStatusMessage,
} from './visibilityMessages'
import type { RuntimeVisibilityContext, VisibilityDecision, VisibilityStatus } from './visibility.types'

type RuntimeLike = {
  key?: string
  moduleKey?: string
  status?: string
  enabled?: boolean
  licensed?: boolean
  ready?: boolean
  setupComplete?: boolean
  blockingReasons?: string[]
  blocking_reasons?: string[]
  warnings?: string[]
}

type ReadinessLike = {
  moduleKey?: string
  ready?: boolean
  status?: string
  blockingReasons?: string[]
  warnings?: string[]
}

export function resolveModuleVisibility(moduleKey: string, context: RuntimeVisibilityContext = {}): VisibilityDecision {
  const contract = getClientModuleContract(moduleKey)
  if (!contract) {
    return blockedDecision(moduleKey, 'hidden', 'Bu modul su anda kullanilabilir degil.')
  }

  const entitlementDecision = isModuleEntitled(context.tenantEntitlements, moduleKey)
  if (!entitlementDecision.entitled) {
    return {
      key: moduleKey,
      visible: true,
      enabled: false,
      status: 'unlicensed',
      reason: entitlementDecision.reason || 'Bu modul mevcut lisans planinizda aktif degildir.',
      warnings: [],
      targetPage: contract.routes.find(route => route.type === 'page')?.path,
      setupAction: setupActionForStatus(moduleKey, 'unlicensed'),
    }
  }

  const runtime = getRuntimeModule(context, moduleKey)
  const readiness = getReadiness(context, moduleKey)
  const status = normalizeRuntimeStatus(runtime, readiness, contract.defaultEnabled)
  const warnings = unique([...(runtime?.warnings || []), ...(readiness?.warnings || [])])

  if (status !== 'available') {
    const reason = firstReason(runtime, readiness) || moduleStatusMessage(status, contract.name)
    return {
      key: moduleKey,
      visible: true,
      enabled: false,
      status,
      reason,
      warnings,
      targetPage: contract.routes.find(route => route.type === 'page')?.path,
      setupAction: setupActionForStatus(moduleKey, status),
    }
  }

  const enabledModuleKeys = getAvailableModuleKeys(context)
  const missingRequired = getMissingRequiredDependencies(moduleKey, enabledModuleKeys)
  if (missingRequired.length) {
    return {
      key: moduleKey,
      visible: true,
      enabled: false,
      status: 'dependency_missing',
      reason: missingRequired[0]?.reason || visibilityStatusMessage('dependency_missing'),
      warnings,
      setupAction: setupActionForStatus(moduleKey, 'dependency_missing'),
      requiredModules: missingRequired.map(item => item.moduleKey),
      missingModules: missingRequired.map(item => item.moduleKey),
    }
  }

  const optionalWarnings = getMissingOptionalDependencies(moduleKey, enabledModuleKeys)
    .map(item => item.reason || `${contract.name} modulu ${item.moduleKey} modulu kapaliyken sinirli calisabilir.`)

  return {
    key: moduleKey,
    visible: true,
    enabled: true,
    status: 'available',
    warnings: unique([...warnings, ...optionalWarnings]),
    targetPage: contract.routes.find(route => route.type === 'page')?.path,
  }
}

export function resolveRouteVisibility(routePath: string, context: RuntimeVisibilityContext = {}): VisibilityDecision {
  const contract = findClientModuleByRoute(routePath)
  if (!contract) {
    return availableDecision(routePath)
  }
  const route = contract.routes.find(item => item.path === routePath) || contract.routes.find(item => routePath.startsWith(item.path))
  const moduleDecision = resolveModuleVisibility(contract.key, { ...context, moduleKey: contract.key })
  if (!moduleDecision.enabled) return { ...moduleDecision, key: routePath, targetPage: routePath }
  return withPermissionCheck({
    ...moduleDecision,
    key: routePath,
    targetPage: routePath,
    requiredPermissions: [route?.permission, route?.fallbackPermission].filter(Boolean) as string[],
  }, context)
}

export function resolveMenuItemVisibility(
  menuItem: {
    key?: string
    label?: string
    path?: string
    moduleKey?: string
    permission?: string
    fallbackPermission?: string
    featureFlag?: string
  },
  context: RuntimeVisibilityContext = {}
): VisibilityDecision {
  const key = menuItem.key || menuItem.path || menuItem.label || 'menu-item'
  const moduleKey = menuItem.moduleKey || (menuItem.path ? findClientModuleByRoute(menuItem.path)?.key : undefined)
  if (!moduleKey) return availableDecision(key, menuItem.path)
  const moduleDecision = resolveModuleVisibility(moduleKey, { ...context, moduleKey })
  if (!moduleDecision.enabled) return { ...moduleDecision, key, targetPage: menuItem.path || moduleDecision.targetPage }

  const featureDecision = menuItem.featureFlag
    ? resolveFeatureVisibility(moduleKey, menuItem.featureFlag, context)
    : null
  if (featureDecision && !featureDecision.enabled) return { ...featureDecision, key, targetPage: menuItem.path }

  return withPermissionCheck({
    ...moduleDecision,
    key,
    targetPage: menuItem.path || moduleDecision.targetPage,
    requiredPermissions: [menuItem.permission, menuItem.fallbackPermission].filter(Boolean) as string[],
  }, context)
}

export function resolveActionVisibility(actionKey: string, context: RuntimeVisibilityContext = {}): VisibilityDecision {
  const normalizedActionKey = normalizeActionKey(actionKey)
  const found = findClientActionContract(normalizedActionKey)
  const moduleKey = found?.module.key || context.moduleKey
  if (!moduleKey) return availableDecision(actionKey)

  const action = found?.action
  const requiredModules = getActionRequiredModules(normalizedActionKey, action, moduleKey)
  const moduleChecks = requiredModules.map(key => resolveModuleVisibility(key, { ...context, moduleKey: key }))
  const blockedModule = moduleChecks.find(item => !item.enabled)
  if (blockedModule) {
    return {
      ...blockedModule,
      key: actionKey,
      requiredModules,
      missingModules: moduleChecks.filter(item => !item.enabled).map(item => item.key),
      targetPage: action?.targetPage || blockedModule.targetPage,
    }
  }

  if (action?.featureFlag) {
    const featureDecision = resolveFeatureVisibility(moduleKey, action.featureFlag, context)
    if (!featureDecision.enabled) return { ...featureDecision, key: actionKey, targetPage: action.targetPage }
  }

  const permissions = [action?.permission, action?.fallbackPermission].filter(Boolean) as string[]
  const permissionDecision = withPermissionCheck(availableDecision(actionKey, action?.targetPage), context, permissions)
  if (!permissionDecision.enabled) return permissionDecision

  const statusDecision = checkRecordStatus(actionKey, action, context)
  if (statusDecision) return statusDecision

  const warnings = unique(moduleChecks.flatMap(item => item.warnings || []))
  return {
    ...permissionDecision,
    warnings,
    requiredModules,
    targetPage: action?.targetPage || permissionDecision.targetPage,
  }
}

export const resolveActionRuntimeAvailability = resolveActionVisibility

export function resolveFeatureVisibility(
  moduleKey: string,
  featureKey: string,
  context: RuntimeVisibilityContext = {}
): VisibilityDecision {
  const namespaced = featureKey.includes('.') ? featureKey : `${moduleKey}.${featureKey}`
  const enabled = isFeatureFlagEnabled(namespaced, context.featureFlags)
  return enabled
    ? availableDecision(namespaced)
    : {
      ...blockedDecision(namespaced, 'feature_disabled', 'Bu ozellik calisma alaninizda su anda kapali.'),
      setupAction: setupActionForStatus(moduleKey, 'feature_disabled'),
    }
}

export function explainVisibilityDecision(decision: VisibilityDecision) {
  return explainDecisionMessage(decision)
}

export function normalizeActionKey(actionKey: string) {
  const key = actionKey.replace(/-/g, '_')
  const lowered = key.toLocaleLowerCase('tr-TR')
  const actionKeyMap: Record<string, string> = {
    opening: 'company_opening',
    liquidation: 'company_liquidation',
    deregistration: 'company_deregistration',
    branch_documents_update: 'branch_document_update',
    ownership_entry: 'initial_partnership_entry',
    representative_start_transaction: 'representative_start',
    representative_start: 'representative_start',
    representative_resume: 'representative_authority_renewal',
    representative_suspend: 'representative_suspend',
    representative_terminate: 'representative_terminate',
  }
  if (actionKeyMap[key]) return actionKeyMap[key]
  if (lowered.startsWith('representative_')) {
    if (lowered.includes('limit')) return 'representative_limit_change'
    if (lowered.includes('kapsam') || lowered.includes('scope')) return 'representative_authority_scope_change'
    if (lowered.includes('yenile') || lowered.includes('renewal')) return 'representative_authority_renewal'
    if (lowered.includes('ask') || lowered.includes('suspend')) return 'representative_suspend'
    if (lowered.includes('sonland') || lowered.includes('terminate')) return 'representative_terminate'
    return 'representative_start'
  }
  if (key.startsWith('ownership_')) return key.includes('initial') ? 'initial_partnership_entry' : 'share_transfer'
  return key
}

function getActionRequiredModules(actionKey: string, action: ModuleActionContract | undefined, moduleKey: string) {
  const modules = new Set([moduleKey])
  if (actionKey === 'capital_increase' || actionKey === 'capital_decrease') modules.add('partners')
  if (actionKey.startsWith('branch_')) modules.add('branches')
  if (actionKey.startsWith('representative_')) modules.add('representatives')
  return Array.from(modules)
}

function withPermissionCheck(
  decision: VisibilityDecision,
  context: RuntimeVisibilityContext,
  permissionKeys: string[] = decision.requiredPermissions || []
): VisibilityDecision {
  if (!permissionKeys.length) return decision
  if (context.tenantEntitlements?.is_development) {
    return { ...decision, requiredPermissions: permissionKeys }
  }
  const userPermissions = context.permissions || []
  if (hasAnyPermission(userPermissions, permissionKeys)) {
    return { ...decision, requiredPermissions: permissionKeys }
  }
  return {
    ...decision,
    visible: true,
    enabled: false,
    status: 'permission_denied',
    reason: visibilityStatusMessage('permission_denied'),
    requiredPermissions: permissionKeys,
    missingPermissions: permissionKeys,
  }
}

function checkRecordStatus(
  actionKey: string,
  action: ModuleActionContract | undefined,
  context: RuntimeVisibilityContext
): VisibilityDecision | null {
  const status = normalizeStatus(context.recordStatus)
  const required = action?.requiredRecordStatus || []
  const blocked = action?.blockedRecordStatus || []
  if (required.length && !required.includes(status)) {
    return blockedDecision(actionKey, 'record_status_blocked', statusMessageForRequired(required))
  }
  if (blocked.includes(status)) {
    return blockedDecision(actionKey, 'record_status_blocked', visibilityStatusMessage('record_status_blocked'))
  }
  return null
}

function normalizeRuntimeStatus(
  runtime: RuntimeLike | null,
  readiness: ReadinessLike | null,
  defaultEnabled: boolean
): VisibilityStatus {
  const runtimeStatus = normalizeStatusValue(runtime?.status)
  if (runtimeStatus !== 'available') return runtimeStatus
  if (runtime && runtime.enabled === false) return 'disabled'
  if (runtime && runtime.licensed === false) return 'unlicensed'
  if (runtime && runtime.setupComplete === false) return 'setup_required'
  if (!defaultEnabled && !runtime) return 'disabled'

  if (readiness) {
    const readinessStatus = normalizeStatusValue(readiness.status)
    if (readiness.ready === false && readinessStatus !== 'available') return readinessStatus
  }
  return 'available'
}

function normalizeStatusValue(value: unknown): VisibilityStatus {
  const status = String(value || 'available')
  if (status === 'ready') return 'available'
  if (status === 'infrastructure_missing') return 'setup_required'
  if (status === 'disabled' || status === 'unlicensed' || status === 'setup_required' || status === 'dependency_missing' || status === 'feature_disabled') {
    return status
  }
  return 'available'
}

function getRuntimeModule(context: RuntimeVisibilityContext, moduleKey: string): RuntimeLike | null {
  const modules = context.modules
  if (!modules) return null
  if (Array.isArray(modules)) {
    return modules.find(item => (item.key || item.moduleKey) === moduleKey) || null
  }
  return modules[moduleKey] || null
}

function getReadiness(context: RuntimeVisibilityContext, moduleKey: string): ReadinessLike | null {
  const readiness = context.readiness
  if (!readiness) return null
  if (Array.isArray(readiness)) {
    return readiness.find(item => item.moduleKey === moduleKey) || null
  }
  if (Array.isArray((readiness as any).moduleReadiness)) {
    return (readiness as any).moduleReadiness.find((item: ReadinessLike) => item.moduleKey === moduleKey) || null
  }
  return (readiness as Record<string, ReadinessLike>)[moduleKey] || null
}

function getAvailableModuleKeys(context: RuntimeVisibilityContext) {
  const modules = context.modules
  if (!modules) return listClientModuleContracts().filter(contract => contract.defaultEnabled).map(contract => contract.key)
  const entries = Array.isArray(modules) ? modules : Object.values(modules)
  if (!entries.length) return listClientModuleContracts().filter(contract => contract.defaultEnabled).map(contract => contract.key)
  return entries
    .filter(item => normalizeStatusValue(item?.status) === 'available' && item?.enabled !== false)
    .map(item => item.key || item.moduleKey)
    .filter(Boolean)
}

function getMissingRequiredDependencies(moduleKey: string, enabledModuleKeys: string[]) {
  const enabled = new Set(enabledModuleKeys)
  return (getClientModuleContract(moduleKey)?.dependencies || [])
    .filter(dependency => dependency.required && !enabled.has(dependency.moduleKey))
}

function getMissingOptionalDependencies(moduleKey: string, enabledModuleKeys: string[]) {
  const enabled = new Set(enabledModuleKeys)
  return (getClientModuleContract(moduleKey)?.dependencies || [])
    .filter(dependency => !dependency.required && !enabled.has(dependency.moduleKey))
}

function firstReason(runtime: RuntimeLike | null, readiness: ReadinessLike | null) {
  return [
    ...(runtime?.blockingReasons || []),
    ...(runtime?.blocking_reasons || []),
    ...(readiness?.blockingReasons || []),
  ].find(Boolean)
}

function availableDecision(key: string, targetPage?: string): VisibilityDecision {
  return {
    key,
    visible: true,
    enabled: true,
    status: 'available',
    warnings: [],
    targetPage,
  }
}

function blockedDecision(key: string, status: VisibilityStatus, reason: string): VisibilityDecision {
  return {
    key,
    visible: status !== 'hidden',
    enabled: false,
    status,
    reason,
    warnings: [],
  }
}

function normalizeStatus(value: unknown) {
  const status = String(value || '').toLocaleLowerCase('tr-TR')
  if (['active', 'aktif'].includes(status)) return 'active'
  if (['draft', 'taslak'].includes(status)) return 'draft'
  if (['closed', 'kapali', 'deregistered', 'terkin'].includes(status)) return 'closed'
  if (['liquidation', 'tasfiye'].includes(status)) return 'liquidation'
  return status
}

function statusMessageForRequired(statuses: string[]) {
  if (statuses.includes('active')) return 'Bu islem yalnizca aktif kayitlarda yapilabilir.'
  if (statuses.includes('draft')) return 'Bu islem yalnizca taslak kayitlarda yapilabilir.'
  return visibilityStatusMessage('record_status_blocked')
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}
