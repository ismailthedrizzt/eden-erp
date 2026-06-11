import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSistemVeriKalitesiWizardContract = {
  wizardName: '/app/sistem/veri-kalitesi workflow',
  lifecycleOperationType: 'dataQuality.operation',
  owningEntity: 'dataQuality',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'dataQuality.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
