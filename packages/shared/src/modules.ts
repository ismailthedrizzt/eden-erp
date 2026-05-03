import type { ModuleCode } from './permissions'

export const MODULE_STATUSES = ['enabled', 'disabled', 'readonly', 'beta'] as const

export type ModuleStatus = typeof MODULE_STATUSES[number]

export interface InstanceModule {
  id: string
  instance_id: string
  module_code: ModuleCode | string
  status: ModuleStatus
  enabled_at?: string | null
  disabled_at?: string | null
  settings_json: Record<string, unknown>
}

export const ERP_MODULES: Array<{ code: ModuleCode; label: string }> = [
  { code: 'companies', label: 'Companies' },
  { code: 'employees', label: 'Employees' },
  { code: 'organization', label: 'Organization' },
  { code: 'vehicles', label: 'Vehicles' },
  { code: 'accounting', label: 'Accounting' },
  { code: 'crm', label: 'CRM' },
  { code: 'workflow', label: 'Workflow' },
  { code: 'inventory', label: 'Inventory' },
  { code: 'documents', label: 'Documents' },
]
