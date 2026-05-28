export const PERMISSION_ACTIONS = ['view', 'insert', 'create', 'edit', 'delete', 'manage', 'approve', 'passivate', 'export', 'set_default', 'view_sensitive', 'verify', 'start', 'complete', 'update', 'manual_sgk'] as const

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
  'tenancy',
  'product_services',
  'after_sales',
  'project_management',
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
  branches: {
    view: 'branches.view',
    edit: 'branches.edit',
    openingStart: 'branches.opening.start',
    closingStart: 'branches.closing.start',
    documentsUpdate: 'branches.documents.update',
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
  tenancy: {
    view: 'tenants.view',
    create: 'tenants.create',
    edit: 'tenants.edit',
    delete: 'tenants.delete',
    manage: 'tenants.manage',
  },
  productServices: {
    view: 'product_services.view',
    create: 'product_services.create',
    edit: 'product_services.edit',
    delete: 'product_services.delete',
    manage: 'product_services.manage',
  },
  afterSales: {
    view: 'after_sales.view',
    create: 'after_sales.create',
    edit: 'after_sales.edit',
    delete: 'after_sales.delete',
    manage: 'after_sales.manage',
  },
  projectManagement: {
    view: 'projects.view',
    projectsView: 'projects.view',
    projectsEdit: 'projects.edit',
    projectsCreate: 'projects.create',
    projectsDelete: 'projects.delete',
    createTask: 'tasks.create',
    editTask: 'tasks.edit',
    deleteTask: 'tasks.delete',
    assignTask: 'tasks.assign',
    transitionTask: 'tasks.transition',
    commentTask: 'tasks.comment',
    attachmentsManage: 'tasks.attachmentsManage',
    manageProjects: 'projects.edit',
    manageBoards: 'tasks.transition',
    manageWorkflows: 'projects.admin',
    viewReports: 'projects.view',
    manageAll: 'projects.admin',
  },
} as const

export function buildPermission(resource: string, action: PermissionAction): PermissionKey {
  return `${resource}.${action}`
}
