import 'server-only'

import { listActionDefinitions } from '@/lib/action-guide/actionRegistry'
import { listDomainOwnership } from '@/lib/domains/domainOwnershipRegistry'
import { fieldControlDefinitions } from '@/lib/field-controls/fieldControlRegistry'
import { listEventContracts } from '@/lib/events/eventRegistry'
import { listFeatureFlags } from '@/lib/features/featureFlags'
import { listIntegrityChecks } from '@/lib/integrity/integrityRegistry'
import { listModuleContracts } from '@/lib/modules/moduleRegistry'
import { listNavigationItems } from '@/lib/navigation/navigationRegistry'
import { listProcessDefinitions } from '@/lib/process/processRegistry'
import { getProjectionDefinition } from '@/lib/read-models/registry'
import { listPermissionContracts, normalizePermissionKey } from '@/lib/security/permissionRegistry'
import { listModuleReadinessDefinitions } from '@/lib/setup/moduleReadinessRegistry'

export type PlatformConsistencySeverity = 'info' | 'warning' | 'critical'

export interface PlatformConsistencyIssue {
  key: string
  area: string
  severity: PlatformConsistencySeverity
  message: string
  details?: Record<string, unknown>
}

export interface PlatformConsistencyReport {
  ok: boolean
  criticalCount: number
  warningCount: number
  infoCount: number
  issues: PlatformConsistencyIssue[]
}

const platformModuleKeys = new Set(['system'])
const compatibilityOperationKeys = new Set([
  'branch_lifecycle',
  'capital_payment',
  'ownership_lifecycle',
  'representative_lifecycle',
  'stakeholder_update',
  'system_update',
])

export function runPlatformConsistencyCheck(): PlatformConsistencyReport {
  const issues = listRegistryInconsistencies()
  const criticalCount = issues.filter(issue => issue.severity === 'critical').length
  const warningCount = issues.filter(issue => issue.severity === 'warning').length
  const infoCount = issues.filter(issue => issue.severity === 'info').length

  return {
    ok: criticalCount === 0,
    criticalCount,
    warningCount,
    infoCount,
    issues,
  }
}

export function listRegistryInconsistencies(): PlatformConsistencyIssue[] {
  const issues: PlatformConsistencyIssue[] = []
  const modules = listModuleContracts()
  const moduleKeys = new Set(modules.map(module => module.key))
  const knownModuleKeys = new Set([...moduleKeys, ...platformModuleKeys])
  const moduleActionKeys = new Set(modules.flatMap(module => module.actions.map(action => action.key)))
  const actionGuideKeys = new Set(listActionDefinitions().map(action => action.key))
  const processOperationKeys = new Set(listProcessDefinitions().map(process => process.operationKey).filter(Boolean) as string[])
  const domainOperationKeys = new Set(listDomainOwnership().flatMap(domain => domain.ownsOperations))
  const knownOperationKeys = new Set([
    ...moduleActionKeys,
    ...actionGuideKeys,
    ...processOperationKeys,
    ...domainOperationKeys,
    ...compatibilityOperationKeys,
  ])
  const eventTypes = new Set(listEventContracts().map(event => event.eventType))
  const permissionKeys = collectPermissionKeys()

  addDuplicateIssues(issues, 'module', modules.map(module => module.key))
  addDuplicateIssues(issues, 'module_action', modules.flatMap(module => module.actions.map(action => action.key)))
  addDuplicateIssues(issues, 'event_contract', [...eventTypes])

  for (const contract of modules) {
    for (const dependency of contract.dependencies) {
      if (!knownModuleKeys.has(dependency.moduleKey)) {
        issues.push(issue('module_dependency', 'critical', `${contract.key} bilinmeyen module dependency referansi tasiyor: ${dependency.moduleKey}.`, { moduleKey: contract.key, dependency: dependency.moduleKey }))
      }
    }

    for (const permission of contract.permissions) {
      checkPermission(issues, permission.key, `module_permission.${contract.key}`)
      for (const fallback of permission.fallback || []) checkPermission(issues, fallback, `module_permission_fallback.${contract.key}`)
    }

    for (const route of contract.routes) {
      checkPermission(issues, route.permission, `module_route.${contract.key}`)
      checkPermission(issues, route.fallbackPermission, `module_route_fallback.${contract.key}`)
    }

    for (const action of contract.actions) {
      checkPermission(issues, action.permission, `module_action.${contract.key}`)
      checkPermission(issues, action.fallbackPermission, `module_action_fallback.${contract.key}`)
    }

    for (const projection of contract.projections) {
      if (!getProjectionDefinition(projection.projectionKey)) {
        issues.push(issue(projection.required ? 'module_projection' : 'module_projection_optional', projection.required ? 'critical' : 'warning', `${contract.key} projection key bulunamadi: ${projection.projectionKey}.`, { moduleKey: contract.key, projectionKey: projection.projectionKey }))
      }
    }

    for (const event of contract.events) {
      if (!eventTypes.has(event.eventType)) {
        issues.push(issue('module_event', 'warning', `${contract.key} event sozlesmesi Event Registry icinde bulunamadi: ${event.eventType}.`, { moduleKey: contract.key, eventType: event.eventType }))
      }
    }
  }

  for (const action of listActionDefinitions()) {
    if (!knownModuleKeys.has(action.moduleKey)) {
      issues.push(issue('action_guide_module', 'critical', `${action.key} bilinmeyen moduleKey kullaniyor: ${action.moduleKey}.`, { actionKey: action.key, moduleKey: action.moduleKey }))
    }
    for (const moduleKey of [...(action.requiredModules || []), ...(action.optionalModules || [])]) {
      if (!knownModuleKeys.has(moduleKey)) {
        issues.push(issue('action_guide_required_module', 'critical', `${action.key} bilinmeyen modul referansi tasiyor: ${moduleKey}.`, { actionKey: action.key, moduleKey }))
      }
    }
    if (!moduleActionKeys.has(action.key)) {
      issues.push(issue('action_guide_action_contract', 'warning', `${action.key} Action Guide icinde var ancak Module Contract action listesinde yok.`, { actionKey: action.key }))
    }
    for (const permission of [...(action.requiredPermissions || []), ...(action.fallbackPermissions || [])]) {
      checkPermission(issues, permission, `action_guide.${action.key}`)
    }
  }

  for (const control of fieldControlDefinitions) {
    for (const moduleKey of [...(control.requiredModules || []), ...(control.optionalModules || [])]) {
      if (!knownModuleKeys.has(moduleKey)) {
        issues.push(issue('field_control_module', 'critical', `${control.entityType}.${control.field} bilinmeyen modul referansi tasiyor: ${moduleKey}.`, { entityType: control.entityType, field: control.field, moduleKey }))
      }
    }
    const operations = [control.controlledBy, ...(control.suggestedOperations || [])].filter(Boolean)
    for (const operation of operations) {
      if (operation && !knownOperationKeys.has(operation.operationKey)) {
        issues.push(issue('field_control_operation', 'warning', `${control.entityType}.${control.field} bilinmeyen operationKey referansi tasiyor: ${operation.operationKey}.`, { entityType: control.entityType, field: control.field, operationKey: operation.operationKey }))
      }
    }
    for (const permission of [...(control.requiredPermissions || []), ...(control.fallbackPermissions || [])]) {
      checkPermission(issues, permission, `field_control.${control.entityType}.${control.field}`)
    }
  }

  for (const event of listEventContracts()) {
    if (!knownModuleKeys.has(event.moduleKey)) {
      issues.push(issue('event_module', 'warning', `${event.eventType} bilinmeyen moduleKey kullaniyor: ${event.moduleKey}.`, { eventType: event.eventType, moduleKey: event.moduleKey }))
    }
    for (const projectionKey of event.projectionKeys || []) {
      if (!getProjectionDefinition(projectionKey)) {
        issues.push(issue('event_projection', 'warning', `${event.eventType} projection key bulunamadi: ${projectionKey}.`, { eventType: event.eventType, projectionKey }))
      }
    }
  }

  for (const process of listProcessDefinitions()) {
    if (!knownModuleKeys.has(process.moduleKey)) {
      issues.push(issue('process_module', 'critical', `${process.key} bilinmeyen moduleKey kullaniyor: ${process.moduleKey}.`, { processKey: process.key, moduleKey: process.moduleKey }))
    }
    if (process.operationKey && !knownOperationKeys.has(process.operationKey)) {
      issues.push(issue('process_operation', 'warning', `${process.key} bilinmeyen operationKey referansi tasiyor: ${process.operationKey}.`, { processKey: process.key, operationKey: process.operationKey }))
    }
  }

  for (const readiness of listModuleReadinessDefinitions()) {
    if (!knownModuleKeys.has(readiness.moduleKey)) {
      issues.push(issue('readiness_module', 'critical', `Readiness tanimi bilinmeyen moduleKey kullaniyor: ${readiness.moduleKey}.`, { moduleKey: readiness.moduleKey }))
    }
    for (const moduleKey of [...(readiness.requiredDependencies || []), ...(readiness.optionalDependencies || [])]) {
      if (!knownModuleKeys.has(moduleKey)) {
        issues.push(issue('readiness_dependency', 'critical', `${readiness.moduleKey} readiness bilinmeyen dependency tasiyor: ${moduleKey}.`, { moduleKey: readiness.moduleKey, dependency: moduleKey }))
      }
    }
  }

  for (const flag of listFeatureFlags()) {
    if (!knownModuleKeys.has(flag.moduleKey)) {
      issues.push(issue('feature_flag_module', 'critical', `${flag.key} bilinmeyen moduleKey kullaniyor: ${flag.moduleKey}.`, { featureKey: flag.key, moduleKey: flag.moduleKey }))
    }
  }

  for (const item of listNavigationItems()) {
    if (item.moduleKey && !knownModuleKeys.has(item.moduleKey)) {
      issues.push(issue('navigation_module', 'critical', `${item.key} bilinmeyen moduleKey kullaniyor: ${item.moduleKey}.`, { itemKey: item.key, moduleKey: item.moduleKey }))
    }
    checkPermission(issues, item.permission, `navigation.${item.key}`)
    checkPermission(issues, item.fallbackPermission, `navigation_fallback.${item.key}`)
  }

  for (const check of listIntegrityChecks()) {
    if (!knownModuleKeys.has(check.moduleKey)) {
      issues.push(issue('integrity_module', 'critical', `${check.key} bilinmeyen moduleKey kullaniyor: ${check.moduleKey}.`, { checkKey: check.key, moduleKey: check.moduleKey }))
    }
    for (const operationKey of check.operationKeys || []) {
      if (!knownOperationKeys.has(operationKey)) {
        issues.push(issue('integrity_operation', 'warning', `${check.key} bilinmeyen operationKey referansi tasiyor: ${operationKey}.`, { checkKey: check.key, operationKey }))
      }
    }
  }

  return issues

  function checkPermission(target: PlatformConsistencyIssue[], permissionKey: string | undefined, area: string) {
    if (!permissionKey) return
    const normalized = normalizePermissionKey(permissionKey)
    if (!permissionKeys.has(normalized)) {
      target.push(issue(area, 'warning', `Permission Registry icinde bulunamadi: ${permissionKey}.`, { permissionKey }))
    }
  }
}

export function assertNoCriticalPlatformInconsistencies() {
  const report = runPlatformConsistencyCheck()
  if (!report.ok) {
    const detail = report.issues
      .filter(item => item.severity === 'critical')
      .map(item => `${item.area}: ${item.message}`)
      .join('\n')
    throw new Error(`Critical platform consistency issues found:\n${detail}`)
  }
  return report
}

function collectPermissionKeys() {
  const keys = new Set(listPermissionContracts().map(permission => normalizePermissionKey(permission.key)))
  for (const contract of listModuleContracts()) {
    for (const permission of contract.permissions) {
      keys.add(normalizePermissionKey(permission.key))
      for (const fallback of permission.fallback || []) keys.add(normalizePermissionKey(fallback))
    }
  }
  return keys
}

function addDuplicateIssues(issues: PlatformConsistencyIssue[], area: string, values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  for (const value of duplicates) {
    issues.push(issue(area, 'critical', `Duplicate registry key bulundu: ${value}.`, { key: value }))
  }
}

function issue(
  area: string,
  severity: PlatformConsistencySeverity,
  message: string,
  details?: Record<string, unknown>
): PlatformConsistencyIssue {
  return {
    key: `${area}:${message}`,
    area,
    severity,
    message,
    details,
  }
}
