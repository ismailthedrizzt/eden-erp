import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSistemKurulumWizardContract = {
  wizardName: '/app/sistem/kurulum workflow',
  lifecycleOperationType: 'settings.operation',
  owningEntity: 'settings',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'settings.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
