import type { EdenWizardContract } from '../../core/wizard.contract'
import { sgkCompletedPayloadSchema } from './sgk-entry.wizard.contract'

export const sgkExitWizardContract = {
  wizardName: 'SGK Cikisi Yapildi',
  modalId: 'SgkCompletedModal',
  lifecycleOperationType: 'employee.sgk_exit_completed',
  owningEntity: 'employee',
  steps: [
    { id: 'completion', label: 'Tamamlanma', requiredFields: ['completed_date'] },
    { id: 'review', label: 'Onay', requiredFields: ['completed_date'] },
  ],
  submitOperation: 'employmentService.sgkExitCompleted',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['terminated'],
  resultingTargetStatus: 'terminated',
  rollbackRule: 'compensating_operation_required',
  validationSchema: sgkCompletedPayloadSchema,
  requiredOperationRecord: true,
  successMessage: 'SGK cikisi manuel tamamlandi.',
  errorMapping: 'employee.sgk_exit_completed.safe_error',
  allowedPermissions: ['hr.sgk.manage'],
} as const satisfies EdenWizardContract & {
  modalId: string
  validationSchema: typeof sgkCompletedPayloadSchema
  requiredOperationRecord: boolean
  successMessage: string
  errorMapping: string
  allowedPermissions: readonly string[]
}
