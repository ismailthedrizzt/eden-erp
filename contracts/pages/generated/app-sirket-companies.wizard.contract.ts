import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSirketCompaniesWizardContract = {
  wizardName: '/app/sirket/companies workflow',
  lifecycleOperationType: 'companies.operation',
  owningEntity: 'company',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'companies.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
