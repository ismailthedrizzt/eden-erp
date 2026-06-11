import { z } from 'zod'
import type { EdenWizardContract } from '../../core/wizard.contract'
import { employeeEmploymentTypes, employeeSgkStatuses } from '../../entities/employee.contract'

const uuid = z.string().uuid()
const emptyStringToUndefined = z.literal('').transform(() => undefined)
const optionalUuid = uuid.optional().or(emptyStringToUndefined)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDatetime = z.string().datetime({ offset: true }).optional()

export const employmentStartPayloadSchema = z.object({
  company_id: uuid,
  start_date: isoDate,
  employment_type: z.enum(employeeEmploymentTypes),
  branch_id: optionalUuid,
  organization_unit_id: optionalUuid,
  position_id: optionalUuid,
  manager_employee_id: optionalUuid,
  job_title: z.string().optional(),
  trial_period_end_date: isoDate.optional().or(emptyStringToUndefined),
  sgk_status: z.enum(employeeSgkStatuses).default('pending'),
  notes: z.string().optional(),
  base_updated_at: isoDatetime,
})

export const employmentStartWizardContract = {
  wizardName: 'Ise Giris',
  modalId: 'StartEmploymentModal',
  lifecycleOperationType: 'employee.employment_start',
  owningEntity: 'employee',
  steps: [
    { id: 'precheck', label: 'On Kontrol', requiredFields: [] },
    { id: 'employment', label: 'Istihdam Bilgileri', requiredFields: ['company_id', 'start_date', 'employment_type'] },
    { id: 'assignment', label: 'Organizasyon / Pozisyon', requiredFields: [] },
    { id: 'sgk', label: 'SGK', requiredFields: ['sgk_status'] },
    { id: 'documents', label: 'Belgeler', requiredFields: [], requiredDocuments: ['contract', 'sgk_entry'] },
    { id: 'review', label: 'Onay', requiredFields: ['company_id', 'start_date', 'employment_type'] },
  ],
  submitOperation: 'employmentService.start',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'passive'],
  resultingTargetStatus: 'active',
  rollbackRule: 'compensating_operation_required',
  validationSchema: employmentStartPayloadSchema,
  requiredOperationRecord: true,
  successMessage: 'Ise giris lifecycle kaydi tamamlandi.',
  errorMapping: 'employee.employment_start.safe_error',
  allowedPermissions: ['hr.employment.start'],
} as const satisfies EdenWizardContract & {
  modalId: string
  validationSchema: typeof employmentStartPayloadSchema
  requiredOperationRecord: boolean
  successMessage: string
  errorMapping: string
  allowedPermissions: readonly string[]
}
