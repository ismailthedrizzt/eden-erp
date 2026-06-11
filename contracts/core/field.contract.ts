export type EdenFieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'uuid'
  | 'enum'
  | 'money'
  | 'percentage'
  | 'jsonb'
  | 'array'

export interface EdenFieldContract {
  name: string
  kind: EdenFieldKind
  label: string
  required?: boolean
  readonly?: boolean
  hidden?: boolean
  nullable?: boolean
  optional?: boolean
  enumValues?: readonly string[]
}

export const auditFieldNames = ['created_at', 'created_by', 'updated_at', 'updated_by'] as const
export const tenantOwnershipFieldNames = ['tenant_id', 'workspace_id'] as const
