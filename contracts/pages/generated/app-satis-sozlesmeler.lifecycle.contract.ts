import type { EdenLifecycleContract } from '../../core/lifecycle.contract'

export const appSatisSozlesmelerLifecycleContract = {
  entityName: 'contracts',
  operationTypes: ['contracts.operation'],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active'],
  resultingStatuses: ['active'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
