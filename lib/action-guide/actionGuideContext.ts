import 'server-only'

import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { fetchScopedCompanyIds } from '@/lib/tenancy/companyScopes'
import { listUserEffectivePermissions } from '@/lib/security/serverPermissions'
import {
  listModuleRuntimeStatuses,
  loadModuleFeatureContext,
} from '@/lib/modules/moduleFeatureResolver'
import { getTenantReadiness } from '@/lib/setup/tenantReadinessService'
import { getActionCenterSummary } from '@/lib/action-center/actionCenterService'
import { canSeeSystemActionItems } from '@/lib/action-center/actionCenterGuards'
import type { ActionGuideContext, ActionGuideRequest } from './actionGuide.types'

type BuildActionGuideContextArgs = {
  request: NextRequest
  supabase: SupabaseClient
  userId: string
  tenantId: string
  input: ActionGuideRequest
}

export async function buildActionGuideContext({
  request,
  supabase,
  userId,
  tenantId,
  input,
}: BuildActionGuideContextArgs): Promise<ActionGuideContext> {
  const rawContext = input.context || {}
  const permissionContext = await listUserEffectivePermissions(request, supabase as any).catch(() => ({ permissions: [] }))
  const permissions = 'permissions' in permissionContext ? permissionContext.permissions || [] : []
  const moduleFeatureContext = await loadModuleFeatureContext(supabase as any, {
    tenantId,
    userPermissions: permissions,
  }).catch(() => ({ moduleLicenses: [], userPermissions: permissions }))
  const moduleStatuses = listModuleRuntimeStatuses(moduleFeatureContext)
  const readiness = await getTenantReadiness(supabase as any, {
    ...resolveTenantContext(request),
    tenantId,
    workspaceId: tenantId,
  }).catch(() => null)
  const actionCenterSummary = await buildOptionalActionCenterSummary(supabase, tenantId, userId, permissions)
  const moduleStatusMap: Record<string, string> = Object.fromEntries(moduleStatuses.map(item => [item.moduleKey, item.status]))
  const moduleBlockingReasons = Object.fromEntries(moduleStatuses.map(item => [item.moduleKey, item.blocking_reasons]))
  const moduleWarnings = Object.fromEntries(moduleStatuses.map(item => [item.moduleKey, item.warnings]))
  if (readiness) {
    for (const readinessModule of readiness.modules) {
      if (!readinessModule.ready) moduleStatusMap[readinessModule.moduleKey] = readinessModule.status
      if (readinessModule.blockingReasons.length) moduleBlockingReasons[readinessModule.moduleKey] = readinessModule.blockingReasons
      if (readinessModule.warnings.length) moduleWarnings[readinessModule.moduleKey] = unique([...(moduleWarnings[readinessModule.moduleKey] || []), ...readinessModule.warnings])
    }
  }
  const baseContext: ActionGuideContext = {
    ...rawContext,
    userId,
    tenantId,
    permissions,
    userPermissions: permissions,
    currentPage: input.currentPage ?? rawContext.currentPage ?? null,
    selectedRecordType: input.selectedRecordType ?? rawContext.selectedRecordType ?? null,
    selectedRecordId: input.selectedRecordId ?? rawContext.selectedRecordId ?? null,
    selectedRecordStatus: input.selectedRecordStatus ?? rawContext.selectedRecordStatus ?? null,
    companyId: input.companyId ?? rawContext.companyId ?? rawContext.activeCompanyId ?? null,
    branchId: input.branchId ?? rawContext.branchId ?? rawContext.activeBranchId ?? null,
    organizationUnitId: input.organizationUnitId ?? rawContext.organizationUnitId ?? null,
    facilityId: input.facilityId ?? rawContext.facilityId ?? null,
    route: rawContext.route ?? input.currentPage ?? null,
    moduleStatuses: moduleStatusMap,
    moduleBlockingReasons,
    moduleWarnings,
    availableModules: Object.entries(moduleStatusMap).filter(([, status]) => status === 'available').map(([moduleKey]) => moduleKey),
    actionCenterSummary,
    context: {
      ...rawContext,
      actionCenterSummary,
    },
  }

  const record = await hydrateSelectedRecord(supabase, baseContext)
  if (record) {
    baseContext.record = record
    baseContext.selectedRecordStatus = baseContext.selectedRecordStatus || record.record_status || record.status || record.company_status || null
    baseContext.companyId = baseContext.companyId || record.company_id || (baseContext.selectedRecordType === 'company' ? record.id : null)
    baseContext.branchId = baseContext.branchId || (baseContext.selectedRecordType === 'branch' ? record.id : null)
  }

  return baseContext
}

async function buildOptionalActionCenterSummary(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  permissions: string[]
) {
  try {
    const scopedCompanyIds = await fetchScopedCompanyIds(supabase as any, tenantId).catch(() => [])
    return await getActionCenterSummary({
      supabase,
      tenantId,
      userId,
      permissions,
      scopedCompanyIds,
      isSystemUser: canSeeSystemActionItems({ permissions, isSystemUser: false }),
    })
  } catch {
    return null
  }
}

export function getAccessContextFromSessionBootstrap(context: ActionGuideContext) {
  return {
    userId: context.userId || null,
    tenantId: context.tenantId || null,
    permissions: context.permissions || context.userPermissions || [],
    availableModules: context.availableModules || [],
  }
}

async function hydrateSelectedRecord(supabase: SupabaseClient, context: ActionGuideContext) {
  if (!context.selectedRecordId || !context.selectedRecordType || !context.tenantId) return null
  const tenantContext = resolveTenantContext({
    headers: new Headers({ 'x-eden-tenant-id': context.tenantId }),
    cookies: { get: () => undefined },
  } as any)
  const table = recordTable(context.selectedRecordType)
  if (!table) return null
  let query = supabase.from(table).select(recordSelect(context.selectedRecordType)).eq('id', context.selectedRecordId).limit(1)
  query = applyTenantQueryScope(query, table, tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return null
  return (data || null) as Record<string, any> | null
}

function recordTable(recordType: string) {
  if (recordType === 'company') return 'companies'
  if (recordType === 'branch') return 'company_branches'
  if (recordType === 'partner') return 'company_partners'
  if (recordType === 'representative') return 'company_representatives'
  return null
}

function recordSelect(recordType: string) {
  if (recordType === 'company') return 'id,tenant_id,record_status,company_status,status'
  if (recordType === 'branch') return 'id,tenant_id,company_id,record_status,status'
  if (recordType === 'partner') return 'id,tenant_id,company_id,record_status,status'
  if (recordType === 'representative') return 'id,tenant_id,company_id,record_status,status'
  return 'id,tenant_id,record_status,status'
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}
