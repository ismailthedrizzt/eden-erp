import {
  getFieldControl,
  listFieldControls,
  suggestOperationForField,
} from './fieldControlRegistry'
import { buildFieldControlMessage, buildPatchViolationMessage, buildRelationPatchViolationMessage } from './fieldControlMessages'
import type {
  FieldControlDefinition,
  FieldControlActionContext,
  FieldControlActionEligibility,
  FieldControlEntityType,
  FieldControlMode,
  FieldControlPatchViolation,
  FieldControlPatchViolationItem,
  FieldControlType,
  ResolvedFieldControl,
} from './fieldControl.types'

type FieldLike = {
  name?: string
  key?: string
  readOnly?: boolean
  controlledByOperation?: unknown
  helpText?: string
  lockReason?: string
  suggestedOperation?: unknown
  fieldControl?: unknown
}

type TabLike<TField extends FieldLike = FieldLike> = {
  fields?: TField[]
}

export function resolveFieldControl(
  entityType: FieldControlEntityType,
  field: string,
  recordStatus?: string | null,
  mode: FieldControlMode = 'active_edit'
): ResolvedFieldControl | null {
  const definition = getFieldControl(entityType, field)
  if (!definition) return null

  const readOnly = isFieldReadOnly(definition, recordStatus, mode)
  const message = getFieldLockExplanation(entityType, field, { recordStatus }) || buildFieldControlMessage(definition, recordStatus) || undefined
  const suggestedOperations = definition.suggestedOperations?.length ? definition.suggestedOperations : definition.controlledBy ? [definition.controlledBy] : []
  const operationControl = shouldExposeLockControl(definition)
    ? {
      category: operationCategory(definition.controlType),
      operations: suggestedOperations.map(operation => operation.operationLabel),
      message,
      lockInModes: ['edit'],
      allowDraftEdit: definition.allowDraftEdit,
      operationKey: definition.controlledBy?.operationKey,
      wizardKey: definition.controlledBy?.wizardKey,
      targetPage: definition.controlledBy?.targetPage,
      requiredModules: definition.requiredModules,
      optionalModules: definition.optionalModules,
      requiredPermissions: definition.requiredPermissions,
      fallbackPermissions: definition.fallbackPermissions,
      requiredRecordStatuses: definition.requiredRecordStatuses,
      blockedRecordStatuses: definition.blockedRecordStatuses,
      lockExplanation: definition.lockExplanation,
      helperText: definition.helperText,
      suggestedOperations,
    }
    : undefined

  return {
    definition,
    readOnly,
    controlledByOperation: operationControl,
    helpText: message,
    lockReason: readOnly ? message : undefined,
    suggestedOperation: definition.controlledBy,
    suggestedOperations,
  }
}

export function applyFieldControlsToFields<TField extends FieldLike>(
  entityType: FieldControlEntityType,
  fields: TField[],
  recordStatus?: string | null,
  mode: FieldControlMode = 'active_edit'
): TField[] {
  return fields.map(field => applyFieldControlToField(entityType, field, recordStatus, mode))
}

export function applyFieldControlsToTabs<TTab extends TabLike<TField>, TField extends FieldLike = FieldLike>(
  entityType: FieldControlEntityType,
  tabs: TTab[],
  recordStatus?: string | null,
  mode: FieldControlMode = 'active_edit'
): TTab[] {
  return tabs.map(tab => ({
    ...tab,
    fields: tab.fields ? applyFieldControlsToFields(entityType, tab.fields, recordStatus, mode) : tab.fields,
  } as TTab))
}

export function getPatchViolation(
  entityType: FieldControlEntityType,
  payload: Record<string, unknown>,
  currentRecord?: Record<string, unknown> | null
): FieldControlPatchViolation | null {
  const relationViolation = getRelationPatchViolation(entityType, payload)
  if (relationViolation) return relationViolation

  const fields = listFieldControls(entityType)
    .filter(definition => isPatchControlled(definition))
    .filter(definition => hasOwn(payload, definition.field))
    .filter(definition => shouldRejectPatchField(definition, payload[definition.field], currentRecord))
    .map(toViolationItem)

  if (!fields.length) return null

  return {
    code: 'OPERATION_CONTROLLED_FIELDS',
    message: buildPatchViolationMessage(fields),
    fields,
  }
}

export function getRelationPatchViolation(
  entityType: FieldControlEntityType,
  payload: Record<string, unknown>
): FieldControlPatchViolation | null {
  const fields = listFieldControls(entityType)
    .filter(definition => definition.controlType === 'relation_controlled')
    .filter(definition => hasOwn(payload, definition.field))
    .map(toViolationItem)

  if (!fields.length) return null
  return {
    code: 'RELATION_PATCH_NOT_ALLOWED',
    message: buildRelationPatchViolationMessage(fields),
    fields,
  }
}

export function mapFieldsToOperations(entityType: FieldControlEntityType, fields: string[]) {
  return fields.map(field => ({
    field,
    operation: suggestOperationForField(entityType, field),
  }))
}

export function getFieldLockExplanation(
  entityType: FieldControlEntityType,
  field: string,
  context: FieldControlActionContext = {}
) {
  const definition = getFieldControl(entityType, field)
  if (!definition) return null
  const base = definition.lockExplanation || buildFieldControlMessage(definition, context.recordStatus)
  const eligibility = getFieldActionEligibility(entityType, field, context)
  if (!eligibility?.disabledReason) return base
  return base ? `${base} ${eligibility.disabledReason}` : eligibility.disabledReason
}

export function getSuggestedOperationForField(
  entityType: FieldControlEntityType,
  field: string,
  context: FieldControlActionContext = {}
) {
  const definition = getFieldControl(entityType, field)
  if (!definition) return null
  const operations = definition.suggestedOperations?.length ? definition.suggestedOperations : definition.controlledBy ? [definition.controlledBy] : []
  const eligibility = operations.map(operation => getOperationEligibility(definition, operation, context))
  return eligibility[0] || null
}

export function getFieldActionEligibility(
  entityType: FieldControlEntityType,
  field: string,
  context: FieldControlActionContext = {}
): FieldControlActionEligibility | null {
  const definition = getFieldControl(entityType, field)
  if (!definition) return null
  const operation = definition.controlledBy || definition.suggestedOperations?.[0]
  return operation ? getOperationEligibility(definition, operation, context) : null
}

export function getFieldActionEligibilities(
  entityType: FieldControlEntityType,
  field: string,
  context: FieldControlActionContext = {}
) {
  const definition = getFieldControl(entityType, field)
  if (!definition) return []
  const operations = definition.suggestedOperations?.length ? definition.suggestedOperations : definition.controlledBy ? [definition.controlledBy] : []
  return operations.map(operation => getOperationEligibility(definition, operation, context))
}

export function getMissingModulesForFieldAction(
  entityType: FieldControlEntityType,
  field: string,
  context: FieldControlActionContext = {}
) {
  const definition = getFieldControl(entityType, field)
  if (!definition) return []
  return missingModules(definition.requiredModules || [], context)
}

export function getMissingPermissionsForFieldAction(
  entityType: FieldControlEntityType,
  field: string,
  context: FieldControlActionContext = {}
) {
  const definition = getFieldControl(entityType, field)
  if (!definition) return []
  return missingPermissions(definition.requiredPermissions || [], definition.fallbackPermissions || [], context)
}

export { suggestOperationForField }

function applyFieldControlToField<TField extends FieldLike>(
  entityType: FieldControlEntityType,
  field: TField,
  recordStatus?: string | null,
  mode: FieldControlMode = 'active_edit'
): TField {
  const fieldName = String(field.name || field.key || '')
  if (!fieldName) return field
  const resolved = resolveFieldControl(entityType, fieldName, recordStatus, mode)
  if (!resolved) return field

  const next: Record<string, unknown> = {
    ...field,
    fieldControl: resolved.definition,
    helpText: field.helpText || resolved.helpText,
    lockReason: field.lockReason || resolved.lockReason,
    suggestedOperation: field.suggestedOperation || resolved.suggestedOperation,
  }

  if (resolved.readOnly) next.readOnly = true
  if (resolved.controlledByOperation) {
    next.controlledByOperation = {
      ...(typeof field.controlledByOperation === 'object' && field.controlledByOperation ? field.controlledByOperation : {}),
      ...resolved.controlledByOperation,
    }
  }

  return next as TField
}

function isFieldReadOnly(
  definition: FieldControlDefinition,
  recordStatus?: string | null,
  mode: FieldControlMode = 'active_edit'
) {
  if (mode === 'view') return true
  if (mode === 'operation') return definition.controlType === 'system_controlled' || definition.controlType === 'read_only'
  if (definition.controlType === 'free_edit') return false
  if (definition.controlType === 'read_only' || definition.controlType === 'system_controlled' || definition.controlType === 'relation_controlled' || definition.controlType === 'module_blocked') return true
  if (isDraftLikeStatus(recordStatus) && definition.allowDraftEdit && (mode === 'draft_edit' || mode === 'active_edit')) return false
  if (definition.controlType === 'draft_edit') return !(mode === 'create' || mode === 'draft_edit' || isDraftLikeStatus(recordStatus))
  if (definition.allowedModes?.length) return !definition.allowedModes.includes(mode)
  return definition.controlType === 'operation_controlled'
}

function isPatchControlled(definition: FieldControlDefinition) {
  return ['operation_controlled', 'system_controlled', 'read_only', 'module_blocked'].includes(definition.controlType)
}

function shouldRejectPatchField(
  definition: FieldControlDefinition,
  nextValue: unknown,
  currentRecord?: Record<string, unknown> | null
) {
  if (definition.allowSystemPatch) return false
  if (currentRecord && samePatchValue(definition.field, nextValue, currentRecord[definition.field])) return false
  if (currentRecord && isDraftLikeStatus(getRecordStatus(currentRecord)) && definition.allowDraftEdit) return false
  return true
}

function toViolationItem(definition: FieldControlDefinition): FieldControlPatchViolationItem {
  return {
    field: definition.field,
    label: definition.label,
    controlType: definition.controlType,
    operation: definition.controlledBy?.operationLabel,
    operationKey: definition.controlledBy?.operationKey,
    wizardKey: definition.controlledBy?.wizardKey,
    targetPage: definition.controlledBy?.targetPage,
    message: buildFieldControlMessage(definition) || undefined,
  }
}

function operationCategory(controlType: FieldControlType) {
  if (controlType === 'operation_controlled' || controlType === 'relation_controlled') return 'registration' as const
  if (controlType === 'system_controlled' || controlType === 'read_only') return 'other' as const
  return 'update' as const
}

function shouldExposeLockControl(definition: FieldControlDefinition) {
  return ['operation_controlled', 'relation_controlled', 'system_controlled', 'read_only', 'module_blocked'].includes(definition.controlType)
}

function getOperationEligibility(
  definition: FieldControlDefinition,
  operation: NonNullable<FieldControlDefinition['controlledBy']>,
  context: FieldControlActionContext
): FieldControlActionEligibility {
  const external = context.actionEligibility?.[operation.operationKey]
  if (external?.canStart !== undefined || external?.disabledReason || external?.disabled !== undefined) {
    return {
      actionKey: operation.operationKey,
      operationLabel: operation.operationLabel,
      wizardKey: operation.wizardKey,
      targetPage: operation.targetPage,
      canStart: external.canStart ?? !external.disabled,
      disabled: external.disabled ?? !(external.canStart ?? false),
      disabledReason: external.disabledReason,
      warnings: external.warnings || [],
      missingModules: external.missingModules || [],
      missingPermissions: external.missingPermissions || [],
      requiredRecordStatuses: external.requiredRecordStatuses || definition.requiredRecordStatuses,
    }
  }

  const requiredModules = definition.requiredModules || []
  const optionalModules = definition.optionalModules || []
  const requiredPermissions = definition.requiredPermissions || []
  const fallbackPermissions = definition.fallbackPermissions || []
  const missingModuleKeys = missingModules(requiredModules, context)
  const missingPermissionKeys = missingPermissions(requiredPermissions, fallbackPermissions, context)
  const statusReason = recordStatusReason(definition, context)
  const optionalWarnings = missingModules(optionalModules, context).map(moduleKey => optionalModuleWarning(moduleKey, operation.operationKey))
  const disabledReason = missingModuleKeys.length
    ? moduleMissingReason(missingModuleKeys[0], operation.operationKey)
    : missingPermissionKeys.length
      ? 'Bu islem icin yetkiniz bulunmuyor.'
      : statusReason

  return {
    actionKey: operation.operationKey,
    operationLabel: operation.operationLabel,
    wizardKey: operation.wizardKey,
    targetPage: operation.targetPage,
    canStart: !disabledReason,
    disabled: !!disabledReason,
    disabledReason: disabledReason || undefined,
    warnings: optionalWarnings.filter(Boolean),
    missingModules: missingModuleKeys,
    missingPermissions: missingPermissionKeys,
    requiredRecordStatuses: definition.requiredRecordStatuses,
  }
}

function missingModules(moduleKeys: string[], context: FieldControlActionContext) {
  if (!moduleKeys.length) return []
  if (!context.moduleStatuses && !context.enabledModules) return []
  return moduleKeys.filter(moduleKey => !isModuleAvailable(moduleKey, context))
}

function isModuleAvailable(moduleKey: string, context: FieldControlActionContext) {
  if (context.enabledModules?.includes(moduleKey)) return true
  const runtime = context.moduleStatuses?.[moduleKey]
  if (!runtime) return !context.enabledModules
  if (typeof runtime === 'string') return runtime === 'available' || runtime === 'enabled' || runtime === 'beta'
  if (typeof runtime.enabled === 'boolean' && !runtime.enabled) return false
  return !runtime.status || runtime.status === 'available' || runtime.status === 'enabled' || runtime.status === 'beta'
}

function missingPermissions(required: string[], fallback: string[], context: FieldControlActionContext) {
  if (!required.length && !fallback.length) return []
  if (!context.permissions) return []
  const permissions = Array.from(context.permissions)
  if (permissions.includes('__eden_demo_allow_all__')) return []
  const allowed = [...required, ...fallback].some(permission => permissions.includes(permission))
  return allowed ? [] : required.length ? required : fallback
}

function recordStatusReason(definition: FieldControlDefinition, context: FieldControlActionContext) {
  const status = normalizeStatus(context.recordStatus)
  const required = definition.requiredRecordStatuses?.map(normalizeStatus).filter(Boolean) || []
  const blocked = definition.blockedRecordStatuses?.map(normalizeStatus).filter(Boolean) || []
  if (blocked.length && blocked.includes(status)) return 'Bu kayit durumunda bu islem baslatilamaz.'
  if (!required.length) return null
  if (!status) return `Bu islem ${required.map(statusLabel).join(' veya ')} kayitlarda yapilabilir.`
  if (required.includes(status)) return null
  if (required.includes('active')) return 'Bu islem yalnizca aktif kayitlarda yapilabilir.'
  if (required.includes('draft')) return 'Bu islem yalnizca taslak kayitlarda yapilabilir.'
  return `Bu islem ${required.map(statusLabel).join(' veya ')} kayitlarda yapilabilir.`
}

function moduleMissingReason(moduleKey: string, operationKey: string) {
  if (operationKey === 'capital_increase' || operationKey === 'capital_decrease') {
    return 'Sermaye Artirimi ortak bazli pay ve sermaye dagilimi gerektirir. Bu islem icin Ortaklarimiz modulu ve guncel ortaklik dagilimi aktif olmalidir.'
  }
  if (operationKey === 'branch_opening' && moduleKey === 'branches') return 'Bu islem icin Subelerimiz modulu aktif olmalidir.'
  if (operationKey === 'branch_document_update') return 'Sube belgeleri resmi islem kapsaminda yonetilir. Bu islem icin Subelerimiz ve belge yukleme altyapisi aktif olmalidir.'
  if (moduleKey === 'branches') return 'Sube bazli yetki verebilmek icin Subelerimiz modulu aktif olmalidir.'
  if (moduleKey === 'organization') return 'Bu islem icin Teskilat/Kadro modulu aktif olmalidir.'
  if (moduleKey === 'facilities') return 'Bu islem icin Tesisler/Lokasyonlar modulu aktif olmalidir.'
  if (moduleKey === 'partners') return 'Bu islem icin Ortaklarimiz modulu aktif olmalidir.'
  return `Bu islem icin ${moduleLabel(moduleKey)} modulu aktif olmalidir.`
}

function optionalModuleWarning(moduleKey: string, operationKey: string) {
  if (operationKey === 'branch_opening' && moduleKey === 'facilities') {
    return 'Sube acilisi yapilabilir; ancak Tesisler/Lokasyonlar modulu aktif olmadigi icin fiziksel lokasyon kaydi otomatik olusturulamayacak.'
  }
  if (operationKey === 'branch_opening' && moduleKey === 'organization') {
    return 'Sube acilisi yapilabilir; ancak Teskilat/Kadro modulu aktif olmadigi icin organizasyon birimi otomatik olusturulamayacak.'
  }
  return `${moduleLabel(moduleKey)} modulu aktif olmadigi icin ilgili otomasyon atlanabilir.`
}

function moduleLabel(moduleKey: string) {
  const labels: Record<string, string> = {
    companies: 'Sirketlerimiz',
    partners: 'Ortaklarimiz',
    branches: 'Subelerimiz',
    representatives: 'Temsilcilerimiz',
    organization: 'Teskilat/Kadro',
    facilities: 'Tesisler/Lokasyonlar',
  }
  return labels[moduleKey] || moduleKey
}

function normalizeStatus(value: unknown) {
  const status = String(value || '').trim().toLocaleLowerCase('tr-TR')
  if (['active', 'aktif', 'opened'].includes(status)) return 'active'
  if (['draft', 'taslak'].includes(status)) return 'draft'
  if (['passive', 'pasif'].includes(status)) return 'passive'
  if (['closed', 'kapali', 'kapalı', 'deregistered', 'terkin'].includes(status)) return 'closed'
  if (['liquidation', 'tasfiye'].includes(status)) return 'liquidation'
  return status
}

function statusLabel(status: string) {
  if (status === 'active') return 'aktif'
  if (status === 'draft') return 'taslak'
  if (status === 'passive') return 'pasif'
  if (status === 'closed') return 'kapali'
  return status
}

function hasOwn(payload: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(payload, field)
}

function getRecordStatus(record: Record<string, unknown>) {
  return String(record.record_status || record.company_status || record.status || '')
}

function isDraftLikeStatus(status?: string | null) {
  const normalized = String(status || '').toLocaleLowerCase('tr-TR')
  return normalized === 'draft' || normalized === 'taslak'
}

function samePatchValue(field: string, nextValue: unknown, currentValue: unknown) {
  if (nextValue === undefined) return true
  if (nextValue === null && (currentValue === null || currentValue === undefined || currentValue === '')) return true

  if (field.includes('amount') || field.includes('ratio') || field.includes('limit') || ['share_units', 'nominal_value'].includes(field)) {
    const nextNumber = Number(nextValue ?? 0)
    const currentNumber = Number(currentValue ?? 0)
    return Number.isFinite(nextNumber) && Number.isFinite(currentNumber) && Math.abs(nextNumber - currentNumber) < 0.0001
  }

  return JSON.stringify(normalizeComparableValue(nextValue)) === JSON.stringify(normalizeComparableValue(currentValue))
}

function normalizeComparableValue(value: unknown) {
  if (value === undefined || value === '') return null
  return value
}
