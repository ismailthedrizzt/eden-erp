import { z } from 'zod'
import type { EdenWizardContract } from '../../core/wizard.contract'
import { employeeSgkStatuses } from '../../entities/employee.contract'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const employmentTerminationPayloadSchema = z.object({
  end_date: isoDate,
  termination_reason: z.string().min(1),
  sgk_status: z.enum(employeeSgkStatuses),
  sgk_exit_reference_no: z.string().optional(),
  notes: z.string().optional(),
})

export const employmentTerminationWizardContract = {
  wizardName: 'Isten Cikis',
  modalId: 'TerminateEmploymentModal',
  lifecycleOperationType: 'employee.employment_termination',
  owningEntity: 'employee',
  steps: [
    { id: 'precheck', label: 'On Kontrol', requiredFields: [] },
    { id: 'summary', label: 'Calisan Ozeti', requiredFields: [] },
    { id: 'termination', label: 'Ayrilis', requiredFields: ['end_date', 'termination_reason'] },
    { id: 'sgk', label: 'SGK Cikis', requiredFields: ['sgk_status'] },
    { id: 'effects', label: 'Etkiler', requiredFields: [] },
    { id: 'documents', label: 'Belgeler', requiredFields: [], requiredDocuments: ['sgk_exit'] },
    { id: 'review', label: 'Onay', requiredFields: ['end_date', 'termination_reason'] },
  ],
  submitOperation: 'employmentService.terminate',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['active', 'suspended'],
  resultingTargetStatus: 'terminated',
  rollbackRule: 'compensating_operation_required',
  validationSchema: employmentTerminationPayloadSchema,
  requiredOperationRecord: true,
  successMessage: 'Isten cikis lifecycle kaydi tamamlandi.',
  errorMapping: 'employee.employment_termination.safe_error',
  allowedPermissions: ['hr.employment.terminate'],
} as const satisfies EdenWizardContract & {
  modalId: string
  validationSchema: typeof employmentTerminationPayloadSchema
  requiredOperationRecord: boolean
  successMessage: string
  errorMapping: string
  allowedPermissions: readonly string[]
}
