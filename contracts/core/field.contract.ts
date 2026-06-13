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
  | 'custom'

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
  validationUi?: EdenFieldValidationUiContract
  badge?: EdenFieldBadgeContract
}

export type EdenFieldTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface EdenFieldBadgeContract {
  label: string
  tone: EdenFieldTone
  visibleWhen?: 'always' | 'has_value' | 'empty' | 'auto_filled' | 'invalid'
}

export interface EdenFieldValidationUiContract {
  className: 'eden-required-field' | 'eden-reactive-field' | 'eden-readonly-field'
  emptyTone?: 'danger' | 'warning'
  completeTone?: 'success' | 'neutral'
  showBadge?: boolean
  badge?: EdenFieldBadgeContract
}

export interface EdenReactiveFieldContract {
  id: string
  className: 'eden-reactive-field' | 'eden-reactive-document-slot'
  source: {
    kind: 'field' | 'document_slot' | 'image_slot' | 'api_response'
    fieldName?: string
    slotIds?: readonly string[]
    event: 'change' | 'upload' | 'import' | 'select' | 'api_success'
  }
  hydratesFields: readonly string[]
  completionRule:
    | 'valid_non_empty_value'
    | 'valid_eden_theme_json'
    | 'valid_reference_payload'
    | 'valid_api_response'
  validationBadge: EdenFieldBadgeContract
  requiredBeforeSubmit?: boolean
}

export const auditFieldNames = ['created_at', 'created_by', 'updated_at', 'updated_by'] as const
export const tenantOwnershipFieldNames = ['tenant_id', 'workspace_id'] as const
