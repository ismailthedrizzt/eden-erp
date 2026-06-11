import type { EdenWizardContract } from '../../core/wizard.contract'

export const appSistemImportWizardContract = {
  wizardName: '/app/sistem/import workflow',
  lifecycleOperationType: 'importExport.operation',
  owningEntity: 'importExport',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'importExport.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
