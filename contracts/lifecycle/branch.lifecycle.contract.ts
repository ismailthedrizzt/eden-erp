import type { EdenLifecycleContract } from '../core/lifecycle.contract'

export const branchLifecycleContract = {
  entityName: 'branch',
  operationTypes: ['branch_opening', 'branch_closing', 'branch_documents_update'],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active'],
  resultingStatuses: ['active', 'closed'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
