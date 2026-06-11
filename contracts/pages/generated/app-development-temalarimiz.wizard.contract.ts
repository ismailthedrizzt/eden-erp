import type { EdenWizardContract } from '../../core/wizard.contract'

export const appDevelopmentTemalarimizWizardContract = {
  wizardName: '/app/development/temalarimiz workflow',
  lifecycleOperationType: 'adminConsole.operation',
  owningEntity: 'adminConsole',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'adminConsole.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
