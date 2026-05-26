export type FieldControlType =
  | 'free_edit'
  | 'draft_edit'
  | 'operation_controlled'
  | 'system_controlled'
  | 'read_only'
  | 'relation_controlled'
  | 'module_blocked'

export type FieldControlMode = 'create' | 'draft_edit' | 'active_edit' | 'view' | 'operation'

export type FieldControlOperationCategory = 'lifecycle' | 'registration' | 'update' | 'other'

export type FieldControlEntityType =
  | 'company'
  | 'company_partner'
  | 'company_representative'
  | 'company_branch'
  | string

export type ControlledByOperation = {
  operationKey: string
  operationLabel: string
  wizardKey?: string
  targetPage?: string
}

export type FieldControlDefinition = {
  entityType: FieldControlEntityType
  field: string
  label: string
  controlType: FieldControlType
  controlledBy?: ControlledByOperation
  suggestedOperations?: ControlledByOperation[]
  requiredModules?: string[]
  optionalModules?: string[]
  requiredPermissions?: string[]
  fallbackPermissions?: string[]
  requiredRecordStatuses?: string[]
  blockedRecordStatuses?: string[]
  lockExplanation?: string
  helperText?: string
  disabledReasonResolver?: string
  allowedModes?: FieldControlMode[]
  lockInStatuses?: string[]
  allowDraftEdit?: boolean
  allowSystemPatch?: boolean
  message?: string
}

export type FieldControlActionContext = {
  recordStatus?: string | null
  permissions?: Iterable<string> | null
  moduleStatuses?: Record<string, string | { status?: string; enabled?: boolean; blocking_reasons?: string[]; warnings?: string[] }> | null
  enabledModules?: string[] | null
  actionEligibility?: Record<string, Partial<FieldControlActionEligibility>> | null
}

export type FieldControlActionEligibility = {
  actionKey: string
  operationLabel: string
  wizardKey?: string
  targetPage?: string
  canStart: boolean
  disabled: boolean
  disabledReason?: string
  warnings: string[]
  missingModules: string[]
  missingPermissions: string[]
  requiredRecordStatuses?: string[]
}

export type ResolvedFieldControl = {
  definition: FieldControlDefinition
  readOnly: boolean
  controlledByOperation?: {
    category: FieldControlOperationCategory
    operations?: string[]
    message?: string
    lockInModes?: string[]
    allowDraftEdit?: boolean
    operationKey?: string
    wizardKey?: string
    targetPage?: string
    requiredModules?: string[]
    optionalModules?: string[]
    requiredPermissions?: string[]
    fallbackPermissions?: string[]
    requiredRecordStatuses?: string[]
    blockedRecordStatuses?: string[]
    lockExplanation?: string
    helperText?: string
    suggestedOperations?: ControlledByOperation[]
  }
  helpText?: string
  lockReason?: string
  suggestedOperation?: ControlledByOperation
  suggestedOperations?: ControlledByOperation[]
}

export type FieldControlPatchViolationItem = {
  field: string
  label: string
  controlType: FieldControlType
  operation?: string
  operationKey?: string
  wizardKey?: string
  targetPage?: string
  message?: string
}

export type FieldControlPatchViolation = {
  code: 'OPERATION_CONTROLLED_FIELDS' | 'RELATION_PATCH_NOT_ALLOWED'
  message: string
  fields: FieldControlPatchViolationItem[]
}

export type StripFieldControlOptions = {
  includeRelations?: boolean
  includeSystemControlled?: boolean
  includeReadOnly?: boolean
  includeOperationControlled?: boolean
  allowDraftEdit?: boolean
  mode?: FieldControlMode
  currentRecord?: Record<string, unknown> | null
}
