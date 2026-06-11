import { auditFieldNames, tenantOwnershipFieldNames } from '../core/field.contract'
import { standardLifecycleBoundary, type EdenEntityContract } from '../core/entity.contract'

export const partnerEntityContract = {
  entityName: 'partner',
  tableName: 'company_partners',
  resourceName: 'partners',
  primaryKey: 'id',
  draftStatusField: 'record_status',
  lifecycleStatusField: 'ownership_status',
  allowedStatuses: ['draft', 'active', 'passive'],
  uniqueKeys: [['tenant_id', 'company_id', 'source_id']],
  requiredFields: ['company_id', 'partner_type', 'display_name'],
  optionalFields: ['share_percentage', 'capital_amount', 'start_date', 'end_date'],
  readonlyFields: ['id', 'tenant_id', 'created_at', 'created_by'],
  auditFields: auditFieldNames,
  ownershipFields: tenantOwnershipFieldNames,
  listFields: ['record_status', 'avatar', 'display_name', 'partner_type_label', 'company_name', 'current_share_ratio'],
  formFields: ['company_id', 'partner_type', 'display_name', 'identity_number', 'tax_number', 'share_percentage', 'capital_amount'],
  detailFields: ['display_name', 'partner_type', 'company_name', 'current_share_ratio', 'current_capital_amount'],
  fields: [
    { name: 'id', kind: 'uuid', label: 'ID', readonly: true },
    { name: 'tenant_id', kind: 'uuid', label: 'Tenant', readonly: true },
    { name: 'company_id', kind: 'uuid', label: 'Sirket', required: true },
    { name: 'partner_type', kind: 'enum', label: 'Ortak Turu', required: true },
    { name: 'display_name', kind: 'string', label: 'Ad / Unvan', required: true },
    { name: 'share_percentage', kind: 'percentage', label: 'Hisse', optional: true },
    { name: 'base_updated_at', kind: 'datetime', label: 'Base Updated At', optional: true },
  ],
  allowedOperations: ['create', 'read', 'update', 'soft_delete', 'lifecycle'],
  forbiddenOperations: ['hard_delete'],
  deletePolicy: 'draft_only_hard_delete',
  lifecycleBoundary: standardLifecycleBoundary,
} as const satisfies EdenEntityContract
