import 'server-only'

import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PERMISSIONS } from '@/packages/shared/src'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { buildAccessContext, type AccessContext } from '../accessContext'
import {
  denyDecision,
  evaluatePolicy,
  policyToResponse,
  type PolicyDecision,
  type PolicyRule,
} from '../policyEngine'
import { isClosedOrPassive, normalizeStatus } from '../scopePolicy'

export type BranchPolicyAction =
  | 'branch.view'
  | 'branch.edit'
  | 'branch.openingStart'
  | 'branch.closingStart'
  | 'branch.documentsUpdate'

export interface BranchPolicyInput {
  request: NextRequest
  supabase: SupabaseClient
  actionKey: BranchPolicyAction
  companyId?: string | null
  branchId?: string | null
  resource?: Record<string, any> | null
}

export async function evaluateBranchPolicy(input: BranchPolicyInput): Promise<{
  context: AccessContext
  decision: PolicyDecision
  resource?: Record<string, any> | null
}> {
  const tenantContext = resolveTenantContext(input.request)
  const context = await buildAccessContext(input.request, input.supabase, {
    moduleKey: 'branches',
    actionKey: input.actionKey,
    companyId: input.companyId || null,
    branchId: input.branchId || null,
    recordType: input.branchId ? 'branch' : input.companyId ? 'company' : undefined,
    recordId: input.branchId || input.companyId || undefined,
  })
  if (context.authResponse) {
    return {
      context,
      decision: denyDecision('AUTH_REQUIRED', 'Oturum bulunamadi.', ['Oturum dogrulamasi tamamlanamadi.']),
      resource: null,
    }
  }

  const resource = input.resource !== undefined
    ? input.resource
    : input.branchId
      ? await loadBranch(input.supabase, input.branchId, tenantContext)
      : input.companyId
        ? await loadCompany(input.supabase, input.companyId, tenantContext)
        : null

  const company = input.actionKey === 'branch.openingStart'
    ? resource
    : input.companyId
      ? await loadCompany(input.supabase, input.companyId, tenantContext)
      : resource?.company_id
        ? await loadCompany(input.supabase, resource.company_id, tenantContext)
        : null

  const policyResource = policyResourceForAction(input.actionKey, resource, company)
  const decision = await evaluatePolicy({
    context: {
      ...context,
      companyId: context.companyId || company?.id || resource?.company_id || null,
      branchId: policyBranchIdForAction(input.actionKey, input.branchId || resource?.id || null),
      recordStatus: policyResource?.record_status || policyResource?.status || null,
    },
    actionKey: input.actionKey,
    moduleKey: 'branches',
    resourceType: resourceTypeForAction(input.actionKey, input.branchId),
    resourceId: input.branchId || input.companyId || undefined,
    resource: policyResource || undefined,
    requiredPermissions: permissionForAction(input.actionKey),
    requiredRecordStatus: requiredRecordStatuses(input.actionKey),
    blockedRecordStatus: blockedRecordStatuses(input.actionKey),
    extraRules: branchRules(input.actionKey, { company, branch: input.actionKey === 'branch.openingStart' ? null : resource }),
  })

  return { context, decision, resource }
}

export async function requireBranchPolicy(input: BranchPolicyInput) {
  const result = await evaluateBranchPolicy(input)
  if (result.context.authResponse) return result.context.authResponse
  if (result.decision.allowed) return result
  return policyToResponse(result.decision, branchPolicyStatus(result.decision))
}

function permissionForAction(actionKey: BranchPolicyAction) {
  if (actionKey === 'branch.view') return [PERMISSIONS.branches.view, PERMISSIONS.companies.view]
  if (actionKey === 'branch.edit') return [PERMISSIONS.branches.edit, PERMISSIONS.companies.edit]
  if (actionKey === 'branch.openingStart') return [PERMISSIONS.branches.openingStart, PERMISSIONS.companies.edit]
  if (actionKey === 'branch.closingStart') return [PERMISSIONS.branches.closingStart, PERMISSIONS.companies.edit]
  return [PERMISSIONS.branches.documentsUpdate, PERMISSIONS.companies.edit]
}

function requiredRecordStatuses(actionKey: BranchPolicyAction) {
  if (actionKey === 'branch.openingStart') return ['active']
  if (actionKey === 'branch.closingStart') return ['active']
  return []
}

function blockedRecordStatuses(actionKey: BranchPolicyAction) {
  if (actionKey === 'branch.documentsUpdate') return ['deleted']
  return []
}

function resourceTypeForAction(actionKey: BranchPolicyAction, branchId?: string | null) {
  if (actionKey === 'branch.openingStart') return 'company'
  if (actionKey === 'branch.closingStart' || actionKey === 'branch.view') return branchId ? 'branch' : undefined
  return 'company'
}

function policyBranchIdForAction(actionKey: BranchPolicyAction, branchId?: string | null) {
  return actionKey === 'branch.closingStart' || actionKey === 'branch.view' ? branchId || null : null
}

function policyResourceForAction(actionKey: BranchPolicyAction, resource?: Record<string, any> | null, company?: Record<string, any> | null) {
  if (actionKey === 'branch.openingStart') return company || resource || null
  if (actionKey === 'branch.closingStart' || actionKey === 'branch.view') return resource || null
  if (!resource) return null
  return {
    id: company?.id || resource.company_id,
    tenant_id: resource.tenant_id,
    company_id: resource.company_id,
    is_deleted: resource.is_deleted,
  }
}

function branchRules(actionKey: BranchPolicyAction, resources: { company?: Record<string, any> | null; branch?: Record<string, any> | null }): PolicyRule[] {
  return [{
    key: `${actionKey}.business_rules`,
    evaluate() {
      if (actionKey === 'branch.openingStart') return validateBranchOpening(resources.company)
      if (actionKey === 'branch.closingStart') return validateBranchClosing(resources.company, resources.branch)
      if (actionKey === 'branch.edit') return validateBranchEditable(resources.branch)
      if (actionKey === 'branch.documentsUpdate') return validateBranchDocumentUpdate(resources.branch)
      return null
    },
  }]
}

function validateBranchOpening(company?: Record<string, any> | null) {
  if (!company) return denyDecision('COMPANY_NOT_FOUND', 'Sirket bulunamadi.', ['Sube acilisi icin sirket kaydi bulunamadi.'])
  const lifecycle = normalizeCompanyLifecycle(company)
  if (lifecycle !== 'active') {
    return denyDecision(
      'BRANCH_OPENING_COMPANY_NOT_ACTIVE',
      'Sube acilisi yalnizca aktif sirketler icin baslatilabilir.',
      [`Sirket durumu: ${lifecycle || 'bilinmiyor'}.`]
    )
  }
  return null
}

function validateBranchClosing(company?: Record<string, any> | null, branch?: Record<string, any> | null) {
  if (!company) return denyDecision('COMPANY_NOT_FOUND', 'Sirket bulunamadi.', ['Sube kapanisi icin sirket kaydi bulunamadi.'])
  if (!branch) return denyDecision('BRANCH_NOT_FOUND', 'Sube bulunamadi.', ['Kapatilacak sube kaydi bulunamadi.'])
  if (branch.company_id !== company.id) {
    return denyDecision('BRANCH_COMPANY_MISMATCH', 'Sube bu sirkete bagli degil.', ['Sube ve sirket eslesmesi gecersiz.'])
  }
  if (isClosedOrPassive(branch)) {
    return denyDecision('BRANCH_ALREADY_CLOSED', 'Kapali veya pasif sube icin kapanis islemi baslatilamaz.', ['Sube aktif degil.'])
  }
  return null
}

function validateBranchEditable(branch?: Record<string, any> | null) {
  if (!branch) return denyDecision('BRANCH_NOT_FOUND', 'Sube bulunamadi.', ['Sube kaydi bulunamadi.'])
  if (branch.is_deleted === true) return denyDecision('BRANCH_DELETED', 'Silinmis sube guncellenemez.', ['Sube silinmis.'])
  return null
}

function validateBranchDocumentUpdate(branch?: Record<string, any> | null) {
  if (!branch) return denyDecision('BRANCH_NOT_FOUND', 'Sube bulunamadi.', ['Sube kaydi bulunamadi.'])
  if (branch.is_deleted === true) return denyDecision('BRANCH_DELETED', 'Silinmis subeye belge eklenemez.', ['Sube silinmis.'])
  return null
}

async function loadCompany(supabase: SupabaseClient, companyId: string, tenantContext: ReturnType<typeof resolveTenantContext>) {
  let query = supabase
    .from('companies')
    .select('id,tenant_id,status,record_status,is_deleted,liquidation_start_date,deregistration_date')
    .eq('id', companyId)
  query = applyTenantQueryScope(query, 'companies', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return null
  return data as Record<string, any> | null
}

async function loadBranch(supabase: SupabaseClient, branchId: string, tenantContext: ReturnType<typeof resolveTenantContext>) {
  let query = supabase
    .from('company_branches')
    .select('id,tenant_id,company_id,status,record_status,is_deleted')
    .eq('id', branchId)
  query = applyTenantQueryScope(query, 'company_branches', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return null
  return data as Record<string, any> | null
}

function normalizeCompanyLifecycle(company: Record<string, any>) {
  if (company.is_deleted === true) return 'deleted'
  if (company.deregistration_date) return 'deregistered'
  if (company.liquidation_start_date) return 'liquidation'
  return normalizeStatus(company.record_status || company.status)
}

function branchPolicyStatus(decision: PolicyDecision) {
  if (decision.code.endsWith('_NOT_FOUND') || decision.code === 'COMPANY_NOT_FOUND' || decision.code === 'BRANCH_NOT_FOUND') return 404
  if (decision.code === 'PERMISSION_DENIED' || decision.code === 'SCOPE_DENIED') return 403
  if (decision.code === 'MODULE_UNLICENSED') return 402
  return 409
}
