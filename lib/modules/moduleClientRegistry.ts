import type { ModuleActionContract, ModuleContract } from './moduleContract.types'
import { accountingModule } from './contracts/accounting.module'
import { afterSalesModule } from './contracts/afterSales.module'
import { branchesModule } from './contracts/branches.module'
import { companiesModule } from './contracts/companies.module'
import { crmModule } from './contracts/crm.module'
import { documentsModule } from './contracts/documents.module'
import { facilitiesModule } from './contracts/facilities.module'
import { hrModule } from './contracts/hr.module'
import { importExportModule } from './contracts/importExport.module'
import { notificationsModule } from './contracts/notifications.module'
import { organizationModule } from './contracts/organization.module'
import { partnersModule } from './contracts/partners.module'
import { actionCenterModule, auditModule, outboxModule, processModule } from './contracts/platform.module'
import { productServicesModule } from './contracts/productServices.module'
import { projectManagementModule } from './contracts/projectManagement.module'
import { reportingModule } from './contracts/reporting.module'
import { representativesModule } from './contracts/representatives.module'
import { securityModule } from './contracts/security.module'
import { settingsModule } from './contracts/settings.module'

export const clientModuleContracts = [
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
  documentsModule,
  importExportModule,
  notificationsModule,
  reportingModule,
  securityModule,
  processModule,
  auditModule,
  outboxModule,
  actionCenterModule,
  settingsModule,
] satisfies ModuleContract[]

const moduleContractByKey = new Map(clientModuleContracts.map(contract => [contract.key, contract]))

export function getClientModuleContract(key: string) {
  return moduleContractByKey.get(key) || null
}

export function listClientModuleContracts() {
  return [...clientModuleContracts]
}

export function findClientActionContract(actionKey: string): { module: ModuleContract; action: ModuleActionContract } | null {
  for (const contract of clientModuleContracts) {
    const action = contract.actions.find(item => item.key === actionKey)
    if (action) return { module: contract, action }
  }
  return null
}

export function findClientModuleByRoute(path: string) {
  const normalized = normalizeRoutePath(path)
  return clientModuleContracts.find(contract =>
    contract.routes.some(route => route.path === normalized || routeMatches(route.path, normalized))
  ) || null
}

function normalizeRoutePath(path: string) {
  const withoutQuery = path.split('?')[0] || '/'
  return withoutQuery.endsWith('/') && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery
}

function routeMatches(pattern: string, path: string) {
  const patternParts = normalizeRoutePath(pattern).split('/').filter(Boolean)
  const pathParts = normalizeRoutePath(path).split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return false
  return patternParts.every((part, index) => (part.startsWith('[') && part.endsWith(']')) || part === pathParts[index])
}
