import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSistemKullaniciTalepleriWizardContract = {
  wizardName: '/app/sistem/kullanici-talepleri workflow',
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
