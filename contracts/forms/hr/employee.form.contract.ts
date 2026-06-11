import { z } from 'zod'
import type { EdenFormContract } from '../../core/form.contract'
import {
  employeeDocumentStatuses,
  employeeDocumentTypes,
  employeeGenderValues,
} from '../../entities/employee.contract'

const uuid = z.string().uuid()
const emptyStringToUndefined = z.literal('').transform(() => undefined)
const optionalUuid = uuid.optional().or(emptyStringToUndefined)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDatetime = z.string().datetime({ offset: true }).optional()

export const employeeCreateFormSchema = z.object({
  company_id: uuid,
  employee_no: z.string().trim().optional().or(emptyStringToUndefined),
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  identity_number: z.string().trim().optional().or(emptyStringToUndefined),
  passport_no: z.string().trim().optional().or(emptyStringToUndefined),
  nationality: z.string().trim().optional().or(emptyStringToUndefined),
  phone: z.string().trim().optional().or(emptyStringToUndefined),
  email: z.string().trim().email().optional().or(emptyStringToUndefined),
  education_level: z.string().trim().optional().or(emptyStringToUndefined),
  gender: z.enum(employeeGenderValues).optional(),
  notes: z.string().optional(),
  base_updated_at: isoDatetime,
})

export const employeeDocumentFormSchema = z.object({
  employee_id: uuid.optional(),
  document_type: z.enum(employeeDocumentTypes),
  status: z.enum(employeeDocumentStatuses).default('uploaded'),
  document_no: z.string().trim().optional().or(emptyStringToUndefined),
  issue_date: isoDate.optional().or(emptyStringToUndefined),
  expiry_date: isoDate.optional().or(emptyStringToUndefined),
  notes: z.string().optional(),
  base_updated_at: isoDatetime,
})

export const employeeFormContract = {
  fields: [
    { name: 'company_id', kind: 'uuid', label: 'Sirket', required: true },
    { name: 'employee_no', kind: 'string', label: 'Calisan No', optional: true },
    { name: 'first_name', kind: 'string', label: 'Ad', required: true },
    { name: 'last_name', kind: 'string', label: 'Soyad', required: true },
    { name: 'identity_number', kind: 'string', label: 'T.C. Kimlik No', optional: true },
    { name: 'passport_no', kind: 'string', label: 'Pasaport No', optional: true },
    { name: 'nationality', kind: 'string', label: 'Uyruk', optional: true },
    { name: 'phone', kind: 'string', label: 'Telefon', optional: true },
    { name: 'email', kind: 'string', label: 'E-posta', optional: true },
    { name: 'education_level', kind: 'string', label: 'Egitim', optional: true },
    { name: 'gender', kind: 'enum', label: 'Cinsiyet', optional: true, enumValues: employeeGenderValues },
    { name: 'notes', kind: 'string', label: 'Notlar', optional: true },
    { name: 'base_updated_at', kind: 'datetime', label: 'Base Updated At', hidden: true, optional: true },
  ],
  fieldOrder: [
    'company_id',
    'employee_no',
    'first_name',
    'last_name',
    'identity_number',
    'passport_no',
    'nationality',
    'phone',
    'email',
    'education_level',
    'gender',
    'notes',
  ],
  defaultValues: {
    company_id: '',
    employee_no: '',
    first_name: '',
    last_name: '',
    identity_number: '',
    passport_no: '',
    nationality: 'Türkiye',
    phone: '',
    email: '',
    education_level: '',
    gender: 'unspecified',
    notes: '',
  },
  readonlyFields: [],
  hiddenFields: ['base_updated_at'],
  submitBehavior: 'save_draft',
  cancelBehavior: 'return_to_list',
  draftSaveBehavior: 'create_draft',
  forbiddenBehaviors: ['employment_start', 'employment_termination', 'assignment_change', 'sgk_entry_completed', 'sgk_exit_completed'],
  validationSchema: employeeCreateFormSchema,
} as const satisfies EdenFormContract & {
  validationSchema: typeof employeeCreateFormSchema
}

export const employeeDocumentFormContract = {
  fields: [
    { name: 'document_type', kind: 'enum', label: 'Belge Turu', required: true, enumValues: employeeDocumentTypes },
    { name: 'document_no', kind: 'string', label: 'Belge No', optional: true },
    { name: 'issue_date', kind: 'date', label: 'Duzenleme Tarihi', optional: true },
    { name: 'expiry_date', kind: 'date', label: 'Gecerlilik Tarihi', optional: true },
    { name: 'status', kind: 'enum', label: 'Durum', enumValues: employeeDocumentStatuses, optional: true },
    { name: 'notes', kind: 'string', label: 'Notlar', optional: true },
  ],
  fieldOrder: ['document_type', 'document_no', 'issue_date', 'expiry_date', 'status', 'notes'],
  defaultValues: { document_type: 'identity', status: 'uploaded' },
  readonlyFields: [],
  hiddenFields: ['base_updated_at'],
  submitBehavior: 'update_master_data',
  cancelBehavior: 'return_to_detail',
  draftSaveBehavior: 'update_draft',
  forbiddenBehaviors: ['employment_lifecycle_mutation'],
  validationSchema: employeeDocumentFormSchema,
} as const satisfies EdenFormContract & {
  validationSchema: typeof employeeDocumentFormSchema
}

export const employeeModalContracts = {
  create: {
    modalId: 'CreateEmployeeModal',
    operationType: 'employee.create_draft',
    sourceStatus: 'none',
    targetStatus: 'draft',
    requiredFields: ['company_id', 'first_name', 'last_name'],
    optionalFields: ['employee_no', 'identity_number', 'phone', 'email', 'gender', 'notes'],
    validationSchema: employeeCreateFormSchema,
    apiServiceCommand: 'employeesService.create',
    requiredOperationRecord: false,
    successMessage: 'Calisan karti taslak olarak olusturuldu.',
    errorMapping: 'employee.create.safe_error',
    allowedPermissions: ['hr.employee.create'],
  },
  document: {
    modalId: 'DocumentModal',
    operationType: 'employee.document_upload',
    sourceStatus: 'draft_or_active',
    targetStatus: 'unchanged',
    requiredFields: ['document_type'],
    optionalFields: ['document_no', 'issue_date', 'expiry_date', 'notes'],
    validationSchema: employeeDocumentFormSchema,
    apiServiceCommand: 'employeesService.createDocument',
    requiredOperationRecord: true,
    successMessage: 'Calisan belgesi kaydedildi.',
    errorMapping: 'employee.document.safe_error',
    allowedPermissions: ['hr.documents.manage'],
  },
} as const
