import type { EdenLifecycleContract } from '../core/lifecycle.contract'

export const representativeLifecycleContract = {
  entityName: 'representative',
  operationTypes: [
    'representative.authority_start',
    'representative.authority_renew',
    'representative.authority_scope_change',
    'representative.authority_limit_change',
    'representative.authority_suspend',
    'representative.authority_terminate',
    'representative.authority_correction',
    'representative.authority_reverse',
  ],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active', 'suspended'],
  resultingStatuses: ['active', 'suspended', 'terminated'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
