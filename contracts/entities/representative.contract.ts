import { auditFieldNames, tenantOwnershipFieldNames } from '../core/field.contract'
import { standardLifecycleBoundary, type EdenEntityContract } from '../core/entity.contract'

export const representativeAuthorityTransactionValues = [
  'authority_start',
  'authority_renew',
  'authority_scope_change',
  'authority_limit_change',
  'authority_suspend',
  'authority_terminate',
  'authority_correction',
  'authority_reverse',
] as const

export const representativeEntityContract = {
  entityName: 'representative',
  tableName: 'company_representatives',
  resourceName: 'representatives',
  primaryKey: 'id',
  draftStatusField: 'record_status',
  lifecycleStatusField: 'authority_status',
  allowedStatuses: ['draft', 'active', 'passive', 'suspended', 'expired', 'terminated'],
  uniqueKeys: [['tenant_id', 'company_id', 'source_id']],
  requiredFields: ['company_id', 'person_kind', 'display_name'],
  optionalFields: ['authority_types', 'signature_type', 'transaction_limit', 'start_date', 'end_date'],
  readonlyFields: ['id', 'tenant_id', 'created_at', 'created_by'],
  auditFields: auditFieldNames,
  ownershipFields: tenantOwnershipFieldNames,
  listFields: ['record_status', 'avatar', 'display_name', 'company_name', 'primary_authority_type', 'authority_status_label'],
  formFields: ['company_id', 'person_kind', 'display_name', 'primary_authority_type', 'signature_type', 'authority_limit'],
  detailFields: ['display_name', 'company_name', 'primary_authority_type', 'authority_status_label', 'scope_label'],
  fields: [
    { name: 'id', kind: 'uuid', label: 'ID', readonly: true },
    { name: 'tenant_id', kind: 'uuid', label: 'Tenant', readonly: true },
    { name: 'company_id', kind: 'uuid', label: 'Sirket', required: true },
    { name: 'person_kind', kind: 'enum', label: 'Kisi / Kurum Tipi', required: true, enumValues: ['person', 'organization'] },
    { name: 'display_name', kind: 'string', label: 'Ad / Unvan', required: true },
    { name: 'transaction_type', kind: 'enum', label: 'Islem Tipi', optional: true, enumValues: representativeAuthorityTransactionValues },
    { name: 'base_updated_at', kind: 'datetime', label: 'Base Updated At', optional: true },
  ],
  allowedOperations: ['create', 'read', 'update', 'soft_delete', 'lifecycle'],
  forbiddenOperations: ['hard_delete'],
  deletePolicy: 'draft_only_hard_delete',
  lifecycleBoundary: standardLifecycleBoundary,
} as const satisfies EdenEntityContract
