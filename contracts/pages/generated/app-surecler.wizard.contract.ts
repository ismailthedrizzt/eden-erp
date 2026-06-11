import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSureclerWizardContract = {
  wizardName: '/app/surecler workflow',
  lifecycleOperationType: 'process.operation',
  owningEntity: 'process',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'process.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
