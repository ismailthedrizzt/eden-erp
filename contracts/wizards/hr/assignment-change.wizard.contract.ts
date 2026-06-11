import { z } from 'zod'
import type { EdenWizardContract } from '../../core/wizard.contract'

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const assignmentChangePayloadSchema = z.object({
  effective_date: isoDate,
  branch_id: uuid.optional().or(z.literal('')),
  organization_unit_id: uuid.optional().or(z.literal('')),
  position_id: uuid.optional().or(z.literal('')),
  job_title: z.string().optional(),
  reason: z.string().optional(),
})

export const assignmentChangeWizardContract = {
  wizardName: 'Organizasyon / Pozisyon Degisikligi',
  modalId: 'AssignmentModal',
  lifecycleOperationType: 'employee.assignment_change',
  owningEntity: 'employee',
  steps: [
    { id: 'effective-date', label: 'Gecerlilik', requiredFields: ['effective_date'] },
    { id: 'assignment', label: 'Organizasyon / Pozisyon', requiredFields: [] },
    { id: 'reason', label: 'Gerekce', requiredFields: [] },
    { id: 'review', label: 'Onay', requiredFields: ['effective_date'] },
  ],
  submitOperation: 'employmentService.assignmentChange',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'compensating_operation_required',
  validationSchema: assignmentChangePayloadSchema,
  requiredOperationRecord: true,
  successMessage: 'Organizasyon ve pozisyon degisikligi kaydedildi.',
  errorMapping: 'employee.assignment_change.safe_error',
  allowedPermissions: ['hr.assignment.change'],
} as const satisfies EdenWizardContract & {
  modalId: string
  validationSchema: typeof assignmentChangePayloadSchema
  requiredOperationRecord: boolean
  successMessage: string
  errorMapping: string
  allowedPermissions: readonly string[]
}
