// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: policy
// TARGET_ENDPOINT: /api/v1/policies/evaluate
// NOTES: Backend authorization source of truth should move to Python Policy Engine.

import 'server-only'

import { NextResponse } from 'next/server'
import { findActionContract } from '@/lib/modules/moduleRegistry'
import { createServiceClient } from '@/lib/supabase/server'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { expandPermissionFallbacks } from './permissionRegistry'
import { hasAnyPermission } from './serverPermissions'
import type { AccessContext } from './accessContext'
import {
  canAccessBranch,
  canAccessCompany,
  canAccessFacility,
  canAccessOrganizationUnit,
  canWriteBranch,
  canWriteCompany,
  canWriteFacility,
  canWriteOrganizationUnit,
  isClosedOrPassive,
  normalizeStatus,
} from './scopePolicy'

export interface PolicyDecision {
  allowed: boolean
  code: string
  message: string
  reasons: string[]
  warnings: string[]
  requiredPermissions?: string[]
  checkedPermissions?: string[]
  scope?: Record<string, any>
}

export interface PolicyInput {
  context: AccessContext
  actionKey: string
  moduleKey?: string
  resourceType?: string
  resourceId?: string
  resource?: Record<string, any>
  requiredPermissions?: string[]
  requiredRecordStatus?: string[]
  blockedRecordStatus?: string[]
  extraRules?: PolicyRule[]
}

export interface PolicyRule {
  key: string
  description?: string
  evaluate(context: AccessContext, input: PolicyInput): PolicyDecision | null | Promise<PolicyDecision | null>
}

export async function evaluatePolicy(input: PolicyInput): Promise<PolicyDecision> {
  const moduleDecision = evaluateModuleAvailability(input)
  if (moduleDecision && !moduleDecision.allowed) return moduleDecision

  const permissionDecision = evaluatePermission(input)
  if (!permissionDecision.allowed) return permissionDecision

  const tenantDecision = evaluateTenantScope(input)
  if (!tenantDecision.allowed) return tenantDecision

  const scopeDecision = await evaluateScope(input)
  if (!scopeDecision.allowed) return scopeDecision

  const statusDecision = evaluateRecordStatus(input)
  if (!statusDecision.allowed) return statusDecision

  for (const rule of input.extraRules || []) {
    const decision = await rule.evaluate(input.context, input)
    if (decision && !decision.allowed) return decision
  }

  return allowDecision({
    warnings: [
      ...(moduleDecision?.warnings || []),
      ...permissionDecision.warnings,
      ...tenantDecision.warnings,
      ...scopeDecision.warnings,
      ...statusDecision.warnings,
      ...(input.extraRules || []).flatMap(() => []),
    ],
    requiredPermissions: permissionDecision.requiredPermissions,
    checkedPermissions: permissionDecision.checkedPermissions,
    scope: scopeDecision.scope,
  })
}

export function allowDecision(overrides: Partial<PolicyDecision> = {}): PolicyDecision {
  return {
    allowed: true,
    code: 'POLICY_ALLOWED',
    message: 'Islem baslatilabilir.',
    reasons: [],
    warnings: [],
    ...overrides,
  }
}

export function denyDecision(
  code: string,
  message: string,
  reasons: string[] = [],
  overrides: Partial<PolicyDecision> = {}
): PolicyDecision {
  return {
    allowed: false,
    code,
    message,
    reasons: reasons.length ? reasons : [message],
    warnings: [],
    ...overrides,
  }
}

export function policyToResponse(decision: PolicyDecision, status = 403) {
  return NextResponse.json({
    error: decision.message || 'Bu islem mevcut kayit durumu veya yetkileriniz nedeniyle baslatilamaz.',
    code: decision.code || 'POLICY_DENIED',
    details: {
      reasons: decision.reasons,
      warnings: decision.warnings,
      required_permissions: decision.requiredPermissions,
      checked_permissions: decision.checkedPermissions,
      scope: decision.scope,
    },
  }, { status })
}

export async function assertPolicy(input: PolicyInput) {
  const decision = await evaluatePolicy(input)
  if (!decision.allowed) {
    await new AuditLogService(createServiceClient()).recordPolicyDenied({
      context: {
        tenantId: input.context.tenantId,
        companyId: input.context.companyId || null,
        branchId: input.context.branchId || null,
        moduleKey: input.moduleKey || input.context.moduleKey || null,
        entityType: input.resourceType || input.context.recordType || null,
        entityId: input.resourceId || input.context.recordId || null,
        userId: input.context.userId || null,
        policyKey: decision.code,
      },
      actionKey: input.actionKey,
      summary: 'Islem is kurali nedeniyle reddedildi.',
      reason: decision.reasons.join(' '),
      metadata: {
        warnings: decision.warnings,
        required_permissions: decision.requiredPermissions,
        checked_permissions: decision.checkedPermissions,
      },
    }).catch(() => null)
  }
  return decision.allowed ? null : policyToResponse(decision, policyStatus(decision))
}

function evaluateModuleAvailability(input: PolicyInput): PolicyDecision | null {
  const actionContract = findActionContract(input.actionKey)
  const moduleKey = input.moduleKey || actionContract?.module.key || input.context.moduleKey
  if (!moduleKey) return null

  const moduleStatus = input.context.moduleStatus?.[moduleKey]
  if (!moduleStatus) {
    return allowDecision({ warnings: [`${moduleKey} modul runtime durumu bulunamadi; mevcut permission davranisi kullanildi.`] })
  }
  if (moduleStatus.status === 'available') {
    return allowDecision({ warnings: moduleStatus.warnings || [] })
  }

  return denyDecision(
    moduleStatus.status === 'disabled'
      ? 'MODULE_DISABLED'
      : moduleStatus.status === 'unlicensed'
        ? 'MODULE_UNLICENSED'
        : moduleStatus.status === 'setup_required'
          ? 'MODULE_SETUP_REQUIRED'
          : 'MODULE_DEPENDENCY_MISSING',
    moduleStatus.blocking_reasons?.[0] || 'Bu modul bu calisma alaninda kullanilabilir degil.',
    moduleStatus.blocking_reasons || [],
    { warnings: moduleStatus.warnings || [] }
  )
}

function evaluatePermission(input: PolicyInput): PolicyDecision {
  const actionContract = findActionContract(input.actionKey)
  const requiredPermissions = input.requiredPermissions
    || [actionContract?.action.permission, actionContract?.action.fallbackPermission].filter(Boolean) as string[]

  if (!requiredPermissions.length) return allowDecision()

  const checkedPermissions = expandPermissionFallbacks(requiredPermissions)
  if (hasAnyPermission(input.context.permissions, requiredPermissions)) {
    return allowDecision({ requiredPermissions, checkedPermissions })
  }

  return denyDecision(
    'PERMISSION_DENIED',
    'Bu islemi yapmak icin gerekli yetkiniz bulunmuyor.',
    ['Yetki kontrolu basarisiz.'],
    { requiredPermissions, checkedPermissions }
  )
}

function evaluateTenantScope(input: PolicyInput): PolicyDecision {
  const resourceTenantId = input.resource?.tenant_id || input.resource?.tenantId
  if (!resourceTenantId || resourceTenantId === input.context.tenantId) return allowDecision()

  return denyDecision(
    'SCOPE_DENIED',
    'Bu kayit erisim kapsaminiz disinda.',
    ['Kayit farkli bir calisma alani kapsaminda.'],
    { scope: { resource_type: input.resourceType, resource_id: input.resourceId || input.resource?.id } }
  )
}

async function evaluateScope(input: PolicyInput): Promise<PolicyDecision> {
  const resourceType = input.resourceType || input.context.recordType
  const resource = input.resource || {}
  const companyId = resource.company_id || resource.companyId || input.context.companyId
  const branchId = resourceType === 'branch' ? input.resourceId || resource.id || input.context.branchId : input.context.branchId
  const organizationUnitId = resourceType === 'organization_unit' ? input.resourceId || resource.id || input.context.organizationUnitId : input.context.organizationUnitId
  const facilityId = resourceType === 'facility' ? input.resourceId || resource.id || input.context.facilityId : input.context.facilityId
  const write = isWritePolicy(input)

  if (branchId) {
    const ok = write ? await canWriteBranch(input.context, branchId) : await canAccessBranch(input.context, branchId)
    if (!ok) return scopeDenied('branch', branchId)
  }
  if (organizationUnitId) {
    const ok = write
      ? await canWriteOrganizationUnit(input.context, organizationUnitId)
      : await canAccessOrganizationUnit(input.context, organizationUnitId)
    if (!ok) return scopeDenied('organization_unit', organizationUnitId)
  }
  if (facilityId) {
    const ok = write ? await canWriteFacility(input.context, facilityId) : await canAccessFacility(input.context, facilityId)
    if (!ok) return scopeDenied('facility', facilityId)
  }
  if (companyId) {
    const ok = write ? await canWriteCompany(input.context, companyId) : await canAccessCompany(input.context, companyId)
    if (!ok) return scopeDenied('company', companyId)
  }

  return allowDecision({
    scope: {
      company_id: companyId || null,
      branch_id: branchId || null,
      organization_unit_id: organizationUnitId || null,
      facility_id: facilityId || null,
    },
  })
}

function evaluateRecordStatus(input: PolicyInput): PolicyDecision {
  const currentStatus = normalizeStatus(input.resource?.record_status || input.resource?.status || input.context.recordStatus)
  const required = (input.requiredRecordStatus || findActionContract(input.actionKey)?.action.requiredRecordStatus || []).map(normalizeStatus)
  const blocked = (input.blockedRecordStatus || findActionContract(input.actionKey)?.action.blockedRecordStatus || []).map(normalizeStatus)

  if (input.resource?.is_deleted === true) {
    return denyDecision('RECORD_DELETED', 'Silinmis kayit uzerinde bu islem baslatilamaz.', ['Kayit silinmis.'])
  }
  if (required.length && !required.includes(currentStatus)) {
    return denyDecision(
      'RECORD_STATUS_BLOCKED',
      'Bu islem mevcut kayit durumunda baslatilamaz.',
      [`Gerekli durum: ${required.join(', ') || '-'}, mevcut durum: ${currentStatus || '-'}.`]
    )
  }
  if (blocked.length && blocked.includes(currentStatus)) {
    return denyDecision(
      'RECORD_STATUS_BLOCKED',
      'Bu islem mevcut kayit durumunda baslatilamaz.',
      [`${currentStatus} durumundaki kayitlar bu isleme kapali.`]
    )
  }
  if (input.resource && isWritePolicy(input) && isClosedOrPassive(input.resource)) {
    return denyDecision(
      'RECORD_STATUS_BLOCKED',
      'Kapali veya pasif kayit uzerinde bu islem baslatilamaz.',
      ['Kayit kapali, pasif veya silinmis gorunuyor.']
    )
  }

  return allowDecision()
}

function scopeDenied(resourceType: string, resourceId?: string | null): PolicyDecision {
  return denyDecision(
    'SCOPE_DENIED',
    'Bu kayit erisim kapsaminiz disinda.',
    ['Kayit tenant, sirket veya alt kapsam yetkinizin disinda.'],
    { scope: { resource_type: resourceType, resource_id: resourceId || null } }
  )
}

function isWritePolicy(input: PolicyInput) {
  const category = findActionContract(input.actionKey)?.action.actionType
  const text = `${input.actionKey} ${category || ''}`.toLocaleLowerCase('tr-TR')
  return ['edit', 'opening', 'closing', 'start', 'update', 'terminate', 'suspend', 'document', 'operation'].some(token => text.includes(token))
}

function policyStatus(decision: PolicyDecision) {
  if (decision.code === 'PERMISSION_DENIED' || decision.code === 'SCOPE_DENIED') return 403
  if (decision.code === 'MODULE_UNLICENSED') return 402
  if (decision.code === 'RECORD_STATUS_BLOCKED' || decision.code === 'RECORD_DELETED') return 409
  return 403
}
