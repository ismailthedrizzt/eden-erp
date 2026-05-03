export const PERMISSION_ACTIONS = ['view', 'insert', 'edit', 'approve', 'passivate', 'export'] as const

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
  },
  employees: {
    view: 'employees.view',
    insert: 'employees.insert',
    edit: 'employees.edit',
    approve: 'employees.approve',
    passivate: 'employees.passivate',
    export: 'employees.export',
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
} as const

export function buildPermission(resource: string, action: PermissionAction): PermissionKey {
  return `${resource}.${action}`
}
