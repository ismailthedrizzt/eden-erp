import type { EdenWizardContract } from '../../core/wizard.contract'

export const appMuhasebeCariHareketlerWizardContract = {
  wizardName: '/app/muhasebe/cari-hareketler workflow',
  lifecycleOperationType: 'accounting.operation',
  owningEntity: 'accounting',
  steps: [
    { id: 'review', label: 'Kontrol', requiredFields: [] },
  ],
  submitOperation: 'accounting.operation.submit',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
} as const satisfies EdenWizardContract
