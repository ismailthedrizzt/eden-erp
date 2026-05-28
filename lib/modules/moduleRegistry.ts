import type {
  ModuleActionContract,
  ModuleContract,
  ModuleFeatureResolverContext,
  ModulePermissionContract,
  ModuleProjectionContract,
  ModuleRouteContract,
} from './moduleContract.types'
import { accountingModule } from './contracts/accounting.module'
import { afterSalesModule } from './contracts/afterSales.module'
import { branchesModule } from './contracts/branches.module'
import { companiesModule } from './contracts/companies.module'
import { crmModule } from './contracts/crm.module'
import { facilitiesModule } from './contracts/facilities.module'
import { hrModule } from './contracts/hr.module'
import { organizationModule } from './contracts/organization.module'
import { partnersModule } from './contracts/partners.module'
import { actionCenterModule, auditModule, outboxModule, processModule } from './contracts/platform.module'
import { productServicesModule } from './contracts/productServices.module'
import { projectManagementModule } from './contracts/projectManagement.module'
import { reportingModule } from './contracts/reporting.module'
import { representativesModule } from './contracts/representatives.module'
import { settingsModule } from './contracts/settings.module'
import { getProjectionDefinition } from '@/lib/read-models/registry'

export const allModuleContracts = [
  companiesModule,
  partnersModule,
  representativesModule,
  branchesModule,
  organizationModule,
  facilitiesModule,
  accountingModule,
  hrModule,
  projectManagementModule,
  productServicesModule,
  afterSalesModule,
  crmModule,
  reportingModule,
  processModule,
  auditModule,
  outboxModule,
  actionCenterModule,
  settingsModule,
] satisfies ModuleContract[]

const moduleContractByKey = new Map(allModuleContracts.map(contract => [contract.key, contract]))

export function getModuleContract(key: string) {
  return moduleContractByKey.get(key) || null
}

export function listModuleContracts() {
  return [...allModuleContracts]
}

export function listEnabledModuleContracts(context: ModuleFeatureResolverContext = {}) {
  return allModuleContracts.filter(contract => {
    if (context.disabledModuleKeys?.includes(contract.key)) return false
    if (context.enabledModuleKeys) return context.enabledModuleKeys.includes(contract.key)
    return contract.defaultEnabled
  })
}

export function getModuleActions(moduleKey: string): ModuleActionContract[] {
  return getModuleContract(moduleKey)?.actions || []
}

export function getModulePermissions(moduleKey: string): ModulePermissionContract[] {
  return getModuleContract(moduleKey)?.permissions || []
}

export function getModuleRoutes(moduleKey: string): ModuleRouteContract[] {
  return getModuleContract(moduleKey)?.routes || []
}

export function getModuleProjections(moduleKey: string): ModuleProjectionContract[] {
  return getModuleContract(moduleKey)?.projections || []
}

export function findActionContract(actionKey: string): { module: ModuleContract; action: ModuleActionContract } | null {
  for (const contract of allModuleContracts) {
    const action = contract.actions.find(item => item.key === actionKey)
    if (action) return { module: contract, action }
  }
  return null
}

export function findModuleByRoute(path: string) {
  const normalized = normalizeRoutePath(path)
  return allModuleContracts.find(contract =>
    contract.routes.some(route => route.path === normalized || routeMatches(route.path, normalized))
  ) || null
}

export function findModulesByDomain(domain: string) {
  return allModuleContracts.filter(contract => contract.domain === domain)
}

export function listAvailableActionsForModule(moduleKey: string, context: ModuleFeatureResolverContext = {}) {
  const contract = getModuleContract(moduleKey)
  if (!contract) return []
  if (context.disabledModuleKeys?.includes(moduleKey)) return []
  return contract.actions
}

export function getModuleProjectionWarnings(moduleKey?: string) {
  const modules = moduleKey ? [getModuleContract(moduleKey)].filter(Boolean) as ModuleContract[] : allModuleContracts
  return modules.flatMap(contract =>
    contract.projections
      .filter(projection => !getProjectionDefinition(projection.projectionKey))
      .map(projection => `${contract.key}.${projection.key} projection key bulunamadi: ${projection.projectionKey}`)
  )
}

function normalizeRoutePath(path: string) {
  const withoutQuery = path.split('?')[0] || '/'
  return withoutQuery.endsWith('/') && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery
}

function routeMatches(pattern: string, path: string) {
  const patternParts = normalizeRoutePath(pattern).split('/').filter(Boolean)
  const pathParts = normalizeRoutePath(path).split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return false
  return patternParts.every((part, index) => part.startsWith('[') && part.endsWith(']') || part === pathParts[index])
}
