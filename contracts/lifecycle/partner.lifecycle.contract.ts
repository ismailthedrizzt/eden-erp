import type { EdenLifecycleContract } from '../core/lifecycle.contract'

export const partnerLifecycleContract = {
  entityName: 'partner',
  operationTypes: [
    'ownership.initial_entry',
    'ownership.share_transfer',
    'ownership.capital_increase',
    'ownership.capital_decrease',
    'ownership.beneficial_owner_change',
  ],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active'],
  resultingStatuses: ['active', 'passive'],
  transactionTable: 'ownership_transactions',
} as const satisfies EdenLifecycleContract
