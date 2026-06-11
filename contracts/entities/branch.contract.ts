import { auditFieldNames, tenantOwnershipFieldNames } from '../core/field.contract'
import { standardLifecycleBoundary, type EdenEntityContract } from '../core/entity.contract'

export const branchEntityContract = {
  entityName: 'branch',
  tableName: 'company_branches',
  resourceName: 'branches',
  primaryKey: 'id',
  draftStatusField: 'record_status',
  lifecycleStatusField: 'status',
  allowedStatuses: ['draft', 'active', 'passive', 'closed'],
  uniqueKeys: [['tenant_id', 'company_id', 'branch_name']],
  requiredFields: ['company_id', 'branch_name', 'branch_type'],
  optionalFields: ['branch_short_name', 'phone', 'email', 'city', 'district', 'address'],
  readonlyFields: ['id', 'tenant_id', 'created_at', 'created_by'],
  auditFields: auditFieldNames,
  ownershipFields: tenantOwnershipFieldNames,
  listFields: ['record_status', 'branch_name', 'branch_short_name', 'company_name', 'branch_type', 'city', 'district'],
  formFields: ['branch_name', 'branch_short_name', 'company_name', 'branch_type', 'city', 'district', 'address', 'phone', 'email'],
  detailFields: ['branch_name', 'company_name', 'branch_type', 'city', 'district', 'address'],
  fields: [
    { name: 'id', kind: 'uuid', label: 'ID', readonly: true },
    { name: 'tenant_id', kind: 'uuid', label: 'Tenant', readonly: true },
    { name: 'company_id', kind: 'uuid', label: 'Sirket', required: true },
    { name: 'branch_name', kind: 'string', label: 'Sube Adi', required: true },
    { name: 'branch_type', kind: 'enum', label: 'Sube Turu', required: true },
    { name: 'opening_date', kind: 'date', label: 'Acilis Tarihi', optional: true },
    { name: 'base_updated_at', kind: 'datetime', label: 'Base Updated At', optional: true },
  ],
  allowedOperations: ['create', 'read', 'update', 'soft_delete', 'lifecycle'],
  forbiddenOperations: ['hard_delete'],
  deletePolicy: 'draft_only_hard_delete',
  lifecycleBoundary: standardLifecycleBoundary,
} as const satisfies EdenEntityContract
