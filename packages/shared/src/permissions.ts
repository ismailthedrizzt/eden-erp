export const PERMISSION_ACTIONS = ['view', 'insert', 'edit', 'approve', 'passivate', 'export', 'set_default', 'view_sensitive', 'verify', 'start', 'complete', 'update', 'manual_sgk'] as const

export type PermissionAction = typeof PERMISSION_ACTIONS[number]

export const MODULE_CODES = [
  'companies',
  'employees',
  'organization',
  'vehicles',
  'accounting',
  'crm',
  'workflow',
  'inventory',
  'documents',
  'identity',
] as const

export type ModuleCode = typeof MODULE_CODES[number]
export type PermissionKey = `${string}.${PermissionAction}`

export const PERMISSIONS = {
  companies: {
    view: 'companies.view',
    insert: 'companies.insert',
    edit: 'companies.edit',
    approve: 'companies.approve',
    passivate: 'companies.passivate',
    export: 'companies.export',
    openingStart: 'companies.opening.start',
    openingComplete: 'companies.opening.complete',
    liquidationStart: 'companies.liquidation.start',
    liquidationComplete: 'companies.liquidation.complete',
    liquidationUpdate: 'companies.liquidation.update',
    deregistrationStart: 'companies.deregistration.start',
    deregistrationComplete: 'companies.deregistration.complete',
    lifecycleView: 'companies.lifecycle.view',
  },
  employees: {
    view: 'employees.view',
    insert: 'employees.insert',
    edit: 'employees.edit',
    approve: 'employees.approve',
    passivate: 'employees.passivate',
    export: 'employees.export',
    entryStart: 'employees.entry.start',
    entryComplete: 'employees.entry.complete',
    entryManualSgk: 'employees.entry.manual_sgk',
    exitStart: 'employees.exit.start',
    exitComplete: 'employees.exit.complete',
    exitManualSgk: 'employees.exit.manual_sgk',
    workRelationView: 'employees.work_relation.view',
    workRelationEdit: 'employees.work_relation.edit',
    lifecycleView: 'employees.lifecycle.view',
  },
  vehicles: {
    view: 'vehicles.view',
    insert: 'vehicles.insert',
    edit: 'vehicles.edit',
    approve: 'vehicles.approve',
    passivate: 'vehicles.passivate',
    export: 'vehicles.export',
  },
  workflow: {
    view: 'workflow.view',
    approve: 'workflow.approve',
  },
  documents: {
    export: 'documents.export',
  },
  identity: {
    view: 'identity.view',
    insert: 'identity.insert',
    edit: 'identity.edit',
    approve: 'identity.approve',
    passivate: 'identity.passivate',
  },
  entityBankAccounts: {
    view: 'entity_bank_accounts.view',
    insert: 'entity_bank_accounts.insert',
    edit: 'entity_bank_accounts.edit',
    passivate: 'entity_bank_accounts.passivate',
    setDefault: 'entity_bank_accounts.set_default',
    viewSensitive: 'entity_bank_accounts.view_sensitive',
    verify: 'entity_bank_accounts.verify',
  },
} as const

export function buildPermission(resource: string, action: PermissionAction): PermissionKey {
  return `${resource}.${action}`
}
