import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSirketTesislerWizardContract = {
  wizardName: '/app/sirket/tesisler workflow',
  lifecycleOperationType: 'facilities.operation',
  owningEntity: 'facilities',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'facilities.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
