import { getFieldControl } from './fieldControlRegistry'
import type { FieldControlDefinition, FieldControlEntityType } from './fieldControl.types'

export function getFieldControlMessage(
  entityType: FieldControlEntityType,
  field: string,
  recordStatus?: string | null
) {
  const definition = getFieldControl(entityType, field)
  if (!definition) return null
  return buildFieldControlMessage(definition, recordStatus)
}

export function buildFieldControlMessage(
  definition: FieldControlDefinition,
  _recordStatus?: string | null
) {
  if (definition.lockExplanation) return definition.lockExplanation
  if (definition.message) return definition.message

  if (definition.controlType === 'relation_controlled') {
    return `${definition.label} ana kart PATCH'i ile guncellenemez. Ilgili islem endpointini kullanin.`
  }

  if (definition.controlType === 'system_controlled') {
    return `${definition.label} sistem/projection kontrollu bir alandir. Normal form edit ile degistirilemez.`
  }

  if (definition.controlType === 'read_only') {
    return `${definition.label} salt okunur bir alandir.`
  }

  if (definition.controlType === 'module_blocked') {
    return `${definition.label} icin gerekli modul veya kurulum aktif degil.`
  }

  if (definition.controlType === 'operation_controlled') {
    const operation = definition.controlledBy?.operationLabel || 'ilgili resmi islem'
    return `${definition.label} resmi islem kontrollu bir alandir. ${operation} sihirbazi/API route'u ile guncellenir.`
  }

  if (definition.controlType === 'draft_edit') {
    return `${definition.label} yalnizca taslak kayitlarda dogrudan duzenlenebilir.`
  }

  return null
}

export function buildPatchViolationMessage(fields: Array<{ label: string }>) {
  const labels = fields.map(field => field.label).filter(Boolean).join(', ')
  return labels
    ? `${labels} resmi islem kontrollu alanlardir. Bu alanlar ilgili sihirbaz/API route uzerinden degistirilmelidir.`
    : 'Bu alanlar resmi islem kontrolludur. Ilgili sihirbaz/API route uzerinden degistirilmelidir.'
}

export function buildRelationPatchViolationMessage(fields: Array<{ label: string }>) {
  const labels = fields.map(field => field.label).filter(Boolean).join(', ')
  return labels
    ? `${labels} ana kart PATCH'i ile guncellenemez. Ilgili islem endpointini kullanin.`
    : 'Bu iliskiler ana kart PATCH ile guncellenemez. Ilgili islem endpointini kullanin.'
}
