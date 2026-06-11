import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSirketCompaniesBranchesWizardContract = {
  wizardName: '/app/sirket/companies/branches workflow',
  lifecycleOperationType: 'branches.operation',
  owningEntity: 'branch',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'branches.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
