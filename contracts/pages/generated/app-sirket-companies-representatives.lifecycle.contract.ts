import type { EdenLifecycleContract } from '../../core/lifecycle.contract'

export const appSirketCompaniesRepresentativesLifecycleContract = {
  entityName: 'representative',
  operationTypes: ['representatives.operation'],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active'],
  resultingStatuses: ['active'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
