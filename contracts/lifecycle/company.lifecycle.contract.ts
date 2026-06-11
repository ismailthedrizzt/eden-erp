import type { EdenLifecycleContract } from '../core/lifecycle.contract'

export const companyLifecycleContract = {
  entityName: 'company',
  operationTypes: [
    'company.capital_increase',
    'company.capital_decrease',
    'company.title_change',
    'company.address_change',
    'company.public_registration_update',
    'company.nace_change',
    'company.activity_subject_change',
    'branch_opening',
    'branch_closing',
  ],
  masterDataMutationForbiddenInForms: true,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'active', 'liquidation'],
  resultingStatuses: ['active', 'liquidation', 'closed'],
  transactionTable: 'operation_requests',
} as const satisfies EdenLifecycleContract
