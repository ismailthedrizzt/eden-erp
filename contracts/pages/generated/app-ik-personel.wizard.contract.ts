import type { EdenWizardContract } from '../../core/wizard.contract'

export const appIkPersonelWizardContract = {
  wizardName: '/app/ik/personel workflow',
  lifecycleOperationType: 'hr.operation',
  owningEntity: 'hr',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'hr.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
