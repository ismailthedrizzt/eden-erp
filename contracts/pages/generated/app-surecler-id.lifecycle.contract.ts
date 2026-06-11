import type { EdenLifecycleContract } from '../../core/lifecycle.contract'

export const appSureclerIdLifecycleContract = {
  entityName: 'process',
  operationTypes: ['process.operation'],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active'],
  resultingStatuses: ['active'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
