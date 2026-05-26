import 'server-only'

import { evaluateActionEligibility } from '@/lib/security/actionEligibility'
import type { AccessContext } from '@/lib/security/accessContext'
import { getFieldControl } from './fieldControlRegistry'
import type {
  ControlledByOperation,
  FieldControlActionEligibility,
  FieldControlEntityType,
} from './fieldControl.types'

export async function evaluateFieldActionEligibility(
  entityType: FieldControlEntityType,
  field: string,
  context: AccessContext
): Promise<FieldControlActionEligibility[]> {
  const definition = getFieldControl(entityType, field)
  if (!definition) return []

  const operations = definition.suggestedOperations?.length
    ? definition.suggestedOperations
    : definition.controlledBy
      ? [definition.controlledBy]
      : []

  const results = await Promise.all(operations.map(async operation => {
    const eligibility = await evaluateActionEligibility(operation.operationKey, {
      ...context,
      actionKey: operation.operationKey,
    })
    return toFieldActionEligibility(operation, eligibility)
  }))

  return results
}

export async function evaluateSuggestedOperationForField(
  entityType: FieldControlEntityType,
  field: string,
  context: AccessContext
) {
  const results = await evaluateFieldActionEligibility(entityType, field, context)
  return results[0] || null
}

function toFieldActionEligibility(
  operation: ControlledByOperation,
  eligibility: Awaited<ReturnType<typeof evaluateActionEligibility>>
): FieldControlActionEligibility {
  return {
    actionKey: operation.operationKey,
    operationLabel: operation.operationLabel,
    wizardKey: eligibility.wizardKey || operation.wizardKey,
    targetPage: eligibility.targetPage || operation.targetPage,
    canStart: eligibility.canStart,
    disabled: eligibility.disabled,
    disabledReason: eligibility.reason,
    warnings: eligibility.warnings,
    missingModules: [],
    missingPermissions: [],
    requiredRecordStatuses: eligibility.requiredRecordStatus,
  }
}
