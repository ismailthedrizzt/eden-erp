import 'server-only'

import { findActionContract } from '@/lib/modules/moduleRegistry'
import { evaluatePolicy } from './policyEngine'
import type { AccessContext } from './accessContext'

export interface ActionEligibilityResult {
  actionKey: string
  canView: boolean
  canStart: boolean
  disabled: boolean
  reason?: string
  warnings: string[]
  targetPage?: string
  wizardKey?: string
  requiredRecordStatus?: string[]
}

export async function evaluateActionEligibility(
  actionKey: string,
  context: AccessContext
): Promise<ActionEligibilityResult> {
  const contract = findActionContract(actionKey)
  if (!contract) {
    return {
      actionKey,
      canView: true,
      canStart: false,
      disabled: true,
      reason: 'Islem sozlesmesi bulunamadi.',
      warnings: ['Module Registry icinde action contract bulunamadi.'],
    }
  }

  const decision = await evaluatePolicy({
    context: {
      ...context,
      moduleKey: contract.module.key,
      actionKey,
    },
    actionKey,
    moduleKey: contract.module.key,
    requiredPermissions: [contract.action.permission, contract.action.fallbackPermission].filter(Boolean) as string[],
    requiredRecordStatus: contract.action.requiredRecordStatus,
    blockedRecordStatus: contract.action.blockedRecordStatus,
    resourceType: context.recordType,
    resourceId: context.recordId,
    resource: context.recordStatus ? { status: context.recordStatus, company_id: context.companyId } : undefined,
  })

  return {
    actionKey,
    canView: decision.code !== 'MODULE_DISABLED' && decision.code !== 'MODULE_UNLICENSED',
    canStart: decision.allowed,
    disabled: !decision.allowed,
    reason: decision.allowed ? undefined : decision.message,
    warnings: decision.warnings,
    targetPage: contract.action.targetPage,
    wizardKey: contract.action.wizardKey,
    requiredRecordStatus: contract.action.requiredRecordStatus,
  }
}
