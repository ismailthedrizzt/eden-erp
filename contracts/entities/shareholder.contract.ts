import { auditFieldNames, tenantOwnershipFieldNames } from '../core/field.contract'
import { standardLifecycleBoundary, type EdenEntityContract } from '../core/entity.contract'

export const shareholderEntityContract = {
  entityName: 'shareholder',
  tableName: 'current_ownership',
  resourceName: 'shareholders',
  primaryKey: 'partner_id',
  draftStatusField: 'record_status',
  lifecycleStatusField: 'ownership_status',
  allowedStatuses: ['active', 'passive'],
  uniqueKeys: [['tenant_id', 'company_id', 'partner_id']],
  requiredFields: ['company_id', 'partner_id'],
  optionalFields: ['current_share_ratio', 'current_voting_ratio', 'current_profit_ratio'],
  readonlyFields: ['company_id', 'partner_id'],
  auditFields: auditFieldNames,
  ownershipFields: tenantOwnershipFieldNames,
  listFields: ['company_id', 'partner_id', 'current_share_ratio', 'current_voting_ratio', 'current_profit_ratio'],
  formFields: [],
  detailFields: ['company_id', 'partner_id', 'current_share_ratio'],
  fields: [
    { name: 'tenant_id', kind: 'uuid', label: 'Tenant', readonly: true },
    { name: 'company_id', kind: 'uuid', label: 'Sirket', readonly: true },
    { name: 'partner_id', kind: 'uuid', label: 'Ortak', readonly: true },
    { name: 'current_share_ratio', kind: 'percentage', label: 'Hisse', readonly: true },
  ],
  allowedOperations: ['read', 'lifecycle'],
  forbiddenOperations: ['create', 'update', 'hard_delete', 'soft_delete'],
  deletePolicy: 'forbidden',
  lifecycleBoundary: standardLifecycleBoundary,
} as const satisfies EdenEntityContract
