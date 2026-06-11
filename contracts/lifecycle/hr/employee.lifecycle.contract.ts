import type { EdenLifecycleContract } from '../../core/lifecycle.contract'

export const employeeLifecycleContract = {
  entityName: 'employee',
  operationTypes: [
    'employee.employment_start',
    'employee.employment_termination',
    'employee.assignment_change',
    'employee.sgk_entry_completed',
    'employee.sgk_exit_completed',
    'employee.document_upload',
  ],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active', 'suspended', 'terminated', 'passive'],
  resultingStatuses: ['draft', 'active', 'suspended', 'terminated', 'passive'],
  transactionTable: 'hr_employee_lifecycle_events',
} as const satisfies EdenLifecycleContract
