import { NextResponse } from 'next/server'
import { listFieldControls } from './fieldControlRegistry'
import { getPatchViolation, getRelationPatchViolation } from './fieldControlResolver'
import type {
  FieldControlEntityType,
  FieldControlPatchViolation,
  StripFieldControlOptions,
} from './fieldControl.types'

export function getOperationControlledPatchViolation(
  entityType: FieldControlEntityType,
  payload: Record<string, unknown>,
  currentRecord?: Record<string, unknown> | null
) {
  const violation = getPatchViolation(entityType, payload, currentRecord)
  return violation?.code === 'OPERATION_CONTROLLED_FIELDS' ? violation : null
}

export function stripOperationControlledFields<T extends Record<string, any>>(
  entityType: FieldControlEntityType,
  payload: T,
  options: StripFieldControlOptions = {}
): T {
  const next = { ...payload }
  const includeOperationControlled = options.includeOperationControlled ?? true
  const includeSystemControlled = options.includeSystemControlled ?? true
  const includeReadOnly = options.includeReadOnly ?? true
  const includeRelations = options.includeRelations ?? true

  for (const definition of listFieldControls(entityType)) {
    if (definition.controlType === 'operation_controlled' && !includeOperationControlled) continue
    if (definition.controlType === 'system_controlled' && !includeSystemControlled) continue
    if (definition.controlType === 'read_only' && !includeReadOnly) continue
    if (definition.controlType === 'relation_controlled' && !includeRelations) continue
    if (!['operation_controlled', 'system_controlled', 'read_only', 'relation_controlled', 'module_blocked'].includes(definition.controlType)) continue
    if (options.currentRecord && isDraftRecord(options.currentRecord) && definition.allowDraftEdit && options.allowDraftEdit) continue
    delete next[definition.field]
  }

  return next
}

export function assertNoOperationControlledPatch(
  entityType: FieldControlEntityType,
  payload: Record<string, unknown>,
  currentRecord?: Record<string, unknown> | null
) {
  const violation = getPatchViolation(entityType, payload, currentRecord)
  if (!violation) return null
  return fieldControlViolationResponse(violation)
}

export function getRelationControlledPatchViolation(
  entityType: FieldControlEntityType,
  payload: Record<string, unknown>
) {
  return getRelationPatchViolation(entityType, payload)
}

export { getRelationPatchViolation }

export function fieldControlViolationResponse(violation: FieldControlPatchViolation, status = 409) {
  if (violation.code === 'RELATION_PATCH_NOT_ALLOWED') {
    return NextResponse.json({
      error: 'Bu iliskiler ana kart PATCH ile guncellenemez. Ilgili islem endpointini kullanin.',
      code: 'RELATION_PATCH_NOT_ALLOWED',
      details: { fields: violation.fields },
    }, { status })
  }

  return NextResponse.json({
    error: 'Bu alanlar resmi islem kontrolludur. Ilgili sihirbaz/API route uzerinden degistirilmelidir.',
    code: 'OPERATION_CONTROLLED_FIELDS',
    details: { fields: violation.fields },
  }, { status })
}

function isDraftRecord(record: Record<string, unknown>) {
  const status = String(record.record_status || record.company_status || record.status || '').toLocaleLowerCase('tr-TR')
  return status === 'draft' || status === 'taslak'
}
