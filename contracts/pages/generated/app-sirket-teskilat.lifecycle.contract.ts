import type { EdenLifecycleContract } from '../../core/lifecycle.contract'

export const appSirketTeskilatLifecycleContract = {
  entityName: 'organization',
  operationTypes: ['organization.operation'],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active'],
  resultingStatuses: ['active'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
