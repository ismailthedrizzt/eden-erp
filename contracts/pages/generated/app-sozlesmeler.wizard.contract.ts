import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSozlesmelerWizardContract = {
  wizardName: '/app/sozlesmeler workflow',
  lifecycleOperationType: 'contracts.operation',
  owningEntity: 'contracts',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'contracts.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
