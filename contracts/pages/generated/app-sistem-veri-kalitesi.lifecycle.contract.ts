import type { EdenLifecycleContract } from '../../core/lifecycle.contract'

export const appSistemVeriKalitesiLifecycleContract = {
  entityName: 'dataQuality',
  operationTypes: ['dataQuality.operation'],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active'],
  resultingStatuses: ['active'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
