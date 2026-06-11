import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSirketTeskilatWizardContract = {
  wizardName: '/app/sirket/teskilat workflow',
  lifecycleOperationType: 'organization.operation',
  owningEntity: 'organization',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'organization.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
