import { z } from 'zod'
import type { EdenWizardContract } from '../../core/wizard.contract'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const sgkCompletedPayloadSchema = z.object({
  completed_date: isoDate,
  reference_no: z.string().optional(),
  notes: z.string().optional(),
})

export const sgkEntryWizardContract = {
  wizardName: 'SGK Girisi Yapildi',
  modalId: 'SgkCompletedModal',
  lifecycleOperationType: 'employee.sgk_entry_completed',
  owningEntity: 'employee',
  steps: [
    { id: 'completion', label: 'Tamamlanma', requiredFields: ['completed_date'] },
    { id: 'review', label: 'Onay', requiredFields: ['completed_date'] },
  ],
  submitOperation: 'employmentService.sgkEntryCompleted',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['active', 'suspended'],
  resultingTargetStatus: 'active',
  rollbackRule: 'compensating_operation_required',
  validationSchema: sgkCompletedPayloadSchema,
  requiredOperationRecord: true,
  successMessage: 'SGK girisi manuel tamamlandi.',
  errorMapping: 'employee.sgk_entry_completed.safe_error',
  allowedPermissions: ['hr.sgk.manage'],
} as const satisfies EdenWizardContract & {
  modalId: string
  validationSchema: typeof sgkCompletedPayloadSchema
  requiredOperationRecord: boolean
  successMessage: string
  errorMapping: string
  allowedPermissions: readonly string[]
}
