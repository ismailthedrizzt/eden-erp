import { z } from 'zod'
import type { EdenWizardContract } from '../../core/wizard.contract'
import { employeeEmploymentTypes, employeeSgkStatuses } from '../../entities/employee.contract'

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const optionalUuid = uuid.optional().or(z.literal(''))

export const employmentStartPayloadSchema = z.object({
  company_id: uuid,
  branch_id: optionalUuid,
  organization_unit_id: optionalUuid,
  position_id: optionalUuid,
  job_title: z.string().max(160).optional(),
  employment_type: z.enum(employeeEmploymentTypes),
  start_date: isoDate,
  trial_period_end_date: isoDate.optional().or(z.literal('')),
  sgk_status: z.enum(employeeSgkStatuses).default('pending'),
  sgk_workplace_registry_no: z.string().max(80).optional(),
  work_location_type: z.enum(['office', 'remote', 'hybrid', 'field']).optional(),
  manager_employee_id: optionalUuid,
  salary_type: z.string().max(80).optional(),
  currency: z.string().max(8).optional(),
  notes: z.string().optional(),
  document_files: z.array(z.record(z.unknown())).default([]),
  client_request_id: z.string().optional(),
  base_version: z.number().int().optional(),
  base_updated_at: z.string().optional(),
})

export const employmentStartWizardContract = {
  wizardName: 'Ise Giris',
  modalId: 'StartEmploymentModal',
  lifecycleOperationType: 'employee.employment_start',
  owningEntity: 'employee',
  steps: [
    { id: 'precheck', label: 'On Kontrol', requiredFields: [] },
    { id: 'assignment', label: 'Sirket / Organizasyon', requiredFields: ['company_id'] },
    { id: 'employment', label: 'Istihdam', requiredFields: ['employment_type', 'start_date'] },
    { id: 'sgk', label: 'SGK', requiredFields: ['sgk_status'] },
    { id: 'documents', label: 'Belgeler', requiredFields: [] },
    { id: 'review', label: 'Onay', requiredFields: ['company_id', 'employment_type', 'start_date'] },
  ],
  submitOperation: 'employmentService.start',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft'],
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
