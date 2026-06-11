import type { EdenEntityContract } from '../core/entity.contract'
import { standardLifecycleBoundary } from '../core/entity.contract'

export const employeeRecordStatuses = ['draft', 'active', 'passive'] as const
export const employeeEmploymentStatuses = ['draft', 'active', 'suspended', 'terminated', 'passive'] as const
export const employeeSgkStatuses = ['not_required', 'pending', 'submitted', 'completed', 'failed'] as const
export const employeeEmploymentTypes = ['full_time', 'part_time', 'contract', 'intern', 'temporary', 'consultant'] as const
export const employeeGenderValues = ['male', 'female', 'other', 'unspecified'] as const
export const employeeDocumentTypes = [
  'identity',
  'residence',
  'diploma',
  'health_report',
  'criminal_record',
  'contract',
  'sgk_entry',
  'sgk_exit',
  'training_certificate',
  'other',
] as const
export const employeeDocumentStatuses = ['missing', 'uploaded', 'expired', 'rejected', 'verified'] as const

export const employeeRecordStatusLabels: Record<string, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  passive: 'Pasif',
}

export const employeeEmploymentStatusLabels: Record<string, string> = {
  draft: 'Istihdam Yok',
  active: 'Aktif',
  suspended: 'Askida',
  terminated: 'Isten Ayrildi',
  passive: 'Pasif',
}

export const employeeEmploymentTypeLabels: Record<string, string> = {
  full_time: 'Tam Zamanli',
  part_time: 'Yari Zamanli',
  contract: 'Sozlesmeli',
  intern: 'Stajyer',
  temporary: 'Gecici',
  consultant: 'Danisman',
}

export const employeeSgkStatusLabels: Record<string, string> = {
  not_required: 'Gerekli Degil',
  pending: 'Bekliyor',
  submitted: 'Gonderildi',
  completed: 'Tamamlandi',
  failed: 'Hata',
}

export const employeeGenderLabels: Record<string, string> = {
  male: 'Erkek',
  female: 'Kadin',
  other: 'Diger',
  unspecified: 'Belirtilmedi',
}

export const employeeDocumentTypeLabels: Record<string, string> = {
  identity: 'Kimlik',
  residence: 'Ikametgah',
  diploma: 'Diploma',
  health_report: 'Saglik Raporu',
  criminal_record: 'Adli Sicil',
  contract: 'Sozlesme',
  sgk_entry: 'SGK Giris Bildirgesi',
  sgk_exit: 'SGK Cikis Bildirgesi',
  training_certificate: 'Egitim / Sertifika',
  other: 'Diger',
}

export const employeeDocumentStatusLabels: Record<string, string> = {
  missing: 'Eksik',
  uploaded: 'Yuklendi',
  expired: 'Suresi Doldu',
  rejected: 'Reddedildi',
  verified: 'Dogrulandi',
}

export const employeeEntityContract = {
  entityName: 'employee',
  tableName: 'hr_employees',
  resourceName: 'employees',
  primaryKey: 'id',
  draftStatusField: 'record_status',
  lifecycleStatusField: 'employment_status',
  allowedStatuses: employeeRecordStatuses,
  employmentStatuses: employeeEmploymentStatuses,
  sgkStatuses: employeeSgkStatuses,
  uniqueKeys: [['tenant_id', 'employee_no'], ['tenant_id', 'identity_number']],
  requiredFields: ['company_id', 'first_name', 'last_name'],
  optionalFields: [
    'employee_no',
    'identity_number',
    'passport_no',
    'nationality',
    'phone',
    'email',
    'education_level',
    'gender',
    'branch_id',
    'organization_unit_id',
    'position_id',
    'job_title',
    'employment_type',
    'start_date',
    'end_date',
    'sgk_status',
    'notes',
  ],
  readonlyFields: ['id', 'record_status', 'employment_status', 'sgk_status', 'created_at', 'updated_at'],
  auditFields: ['created_at', 'created_by', 'updated_at', 'updated_by'],
  ownershipFields: ['tenant_id', 'workspace_id', 'company_id'],
  listFields: [
    'employment_status',
    'employee_no',
    'full_name',
    'company_id',
    'branch_id',
    'organization_unit_id',
    'position_id',
    'employment_type',
    'start_date',
    'sgk_status',
    'phone',
    'email',
    'education_level',
    'gender',
    'updated_at',
  ],
  formFields: [
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
  detailFields: [
    'full_name',
    'record_status',
    'employment_status',
    'sgk_status',
    'company_id',
    'branch_id',
    'organization_unit_id',
    'position_id',
    'job_title',
    'employment_type',
    'start_date',
    'end_date',
    'phone',
    'email',
    'documents',
  ],
  fields: [
    { name: 'id', kind: 'uuid', label: 'Calisan ID', readonly: true },
    { name: 'tenant_id', kind: 'uuid', label: 'Tenant', hidden: true, optional: true },
    { name: 'workspace_id', kind: 'uuid', label: 'Calisma Alani', hidden: true, optional: true },
    { name: 'company_id', kind: 'uuid', label: 'Sirket', required: true },
    { name: 'employee_no', kind: 'string', label: 'Calisan No', optional: true },
    { name: 'first_name', kind: 'string', label: 'Ad', required: true },
    { name: 'last_name', kind: 'string', label: 'Soyad', required: true },
    { name: 'record_status', kind: 'enum', label: 'Kayit Durumu', readonly: true, enumValues: employeeRecordStatuses },
    { name: 'employment_status', kind: 'enum', label: 'Istihdam Durumu', readonly: true, enumValues: employeeEmploymentStatuses },
    { name: 'sgk_status', kind: 'enum', label: 'SGK Durumu', readonly: true, enumValues: employeeSgkStatuses },
    { name: 'start_date', kind: 'date', label: 'Ise Giris', optional: true },
    { name: 'end_date', kind: 'date', label: 'Isten Cikis', optional: true },
    { name: 'base_updated_at', kind: 'datetime', label: 'Base Updated At', optional: true, hidden: true },
  ],
  allowedOperations: ['create', 'read', 'update', 'soft_delete', 'lifecycle'],
  forbiddenOperations: ['hard_delete'],
  deletePolicy: 'draft_only_hard_delete',
  lifecycleBoundary: standardLifecycleBoundary,
  boundaryRules: [
    'Employee card creation = form/master-data draft operation.',
    'Employment start = lifecycle wizard.',
    'Employment termination = lifecycle wizard.',
    'Assignment/position change = lifecycle wizard.',
    'SGK entry completed = lifecycle wizard/manual confirmation.',
    'SGK exit completed = lifecycle wizard/manual confirmation.',
    'Documents = document operation/upload contract.',
    'Hard delete only allowed for draft employee cards with no lifecycle/transaction/document links.',
    'Activated employees cannot be hard deleted.',
  ],
} as const satisfies EdenEntityContract & {
  employmentStatuses: typeof employeeEmploymentStatuses
  sgkStatuses: typeof employeeSgkStatuses
  boundaryRules: readonly string[]
}
