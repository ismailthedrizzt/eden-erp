import type { EdenLifecycleContract } from '../../core/lifecycle.contract'

export const appSirketCompaniesBranchesLifecycleContract = {
  entityName: 'branch',
  operationTypes: ['branches.operation'],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active'],
  resultingStatuses: ['active'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
