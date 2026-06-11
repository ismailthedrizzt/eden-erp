import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSirketCompaniesPartnersWizardContract = {
  wizardName: '/app/sirket/companies/partners workflow',
  lifecycleOperationType: 'partners.operation',
  owningEntity: 'partner',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'partners.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
