import { getFieldControl } from '@/lib/field-controls/fieldControlRegistry'
import {
  getOperationControlledPatchViolation,
  getRelationPatchViolation,
} from '@/lib/field-controls/fieldControlGuards'
import type { FieldControlPatchViolationItem } from '@/lib/field-controls/fieldControl.types'

type OperationControlledField = {
  field: string
  label: string
  operation: string
}

export type CompanyPatchViolation = {
  code: 'COMPANY_OPERATION_CONTROLLED_FIELDS' | 'COMPANY_RELATION_PATCH_NOT_ALLOWED'
  message: string
  fields: OperationControlledField[]
}

export function getDisallowedCompanyRelationPatchViolation(payload: Record<string, unknown>): CompanyPatchViolation | null {
  const violation = getRelationPatchViolation('company', payload)
  if (!violation) return null

  return {
    code: 'COMPANY_RELATION_PATCH_NOT_ALLOWED',
    fields: violation.fields.map(toCompanyField),
    message: violation.message,
  }
}

export function getOperationControlledCompanyPatchViolation(
  payload: Record<string, unknown>,
  current: Record<string, unknown>
): CompanyPatchViolation | null {
  const violation = getOperationControlledPatchViolation('company', payload, current)
  if (!violation) return null

  return {
    code: 'COMPANY_OPERATION_CONTROLLED_FIELDS',
    fields: violation.fields.map(toCompanyField),
    message: violation.message,
  }
}

export function getCompanyOperationControlledField(field: string): OperationControlledField | null {
  const definition = getFieldControl('company', field)
  if (!definition) return null
  return {
    field: definition.field,
    label: definition.label,
    operation: definition.controlledBy?.operationLabel || 'Ilgili islem',
  }
}

function toCompanyField(field: FieldControlPatchViolationItem): OperationControlledField {
  return {
    field: field.field,
    label: field.label,
    operation: field.operation || 'Ilgili islem',
  }
}
