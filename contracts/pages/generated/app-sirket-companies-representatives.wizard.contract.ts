import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSirketCompaniesRepresentativesWizardContract = {
  wizardName: '/app/sirket/companies/representatives workflow',
  lifecycleOperationType: 'representatives.operation',
  owningEntity: 'representative',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'representatives.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
