import 'server-only'

import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantCompanyScope } from '@/lib/tenancy/companyScopes'
import {
  loadModuleFeatureContext,
  moduleRuntimeStatusMap,
} from '@/lib/modules/moduleFeatureResolver'
import { listUserEffectivePermissions } from './serverPermissions'

export interface AccessContext {
  supabase?: SupabaseClient
  userId: string | null
  tenantId: string
  companyId?: string | null
  branchId?: string | null
  organizationUnitId?: string | null
  facilityId?: string | null
  moduleKey?: string
  actionKey?: string
  recordType?: string
  recordId?: string
  recordStatus?: string
  permissions: string[]
  moduleStatus?: Record<string, any>
  companyScope?: Record<string, any> | null
  branchScope?: Record<string, any> | null
  authResponse?: Response
}

export interface BuildAccessContextInput {
  companyId?: string | null
  branchId?: string | null
  organizationUnitId?: string | null
  facilityId?: string | null
  moduleKey?: string
  actionKey?: string
  recordType?: string
  recordId?: string
  recordStatus?: string
  permissions?: string[]
  userId?: string | null
}

export async function buildAccessContext(
  request: NextRequest,
  supabase: SupabaseClient,
  input: BuildAccessContextInput = {}
): Promise<AccessContext> {
  const tenantContext = resolveTenantContext(request)
  const permissionContext = await listUserEffectivePermissions(request, supabase)
  const permissions = permissionContext instanceof Response
    ? input.permissions || []
    : input.permissions || permissionContext.permissions || []
  const userId = input.userId !== undefined
    ? input.userId
    : permissionContext instanceof Response
      ? null
      : permissionContext.userId
  const tenantId = permissionContext instanceof Response
    ? tenantContext.tenantId
    : permissionContext.tenantId || tenantContext.tenantId

  const moduleContext = await loadModuleFeatureContext(supabase, {
    tenantId,
    userPermissions: permissions,
  }).catch(() => ({ moduleLicenses: [] }))

  return {
    supabase,
    userId,
    tenantId,
    companyId: input.companyId ?? null,
    branchId: input.branchId ?? null,
    organizationUnitId: input.organizationUnitId ?? null,
    facilityId: input.facilityId ?? null,
    moduleKey: input.moduleKey,
    actionKey: input.actionKey,
    recordType: input.recordType,
    recordId: input.recordId,
    recordStatus: input.recordStatus,
    permissions,
    moduleStatus: moduleRuntimeStatusMap(moduleContext),
    authResponse: permissionContext instanceof Response ? permissionContext : undefined,
  }
}

export async function enrichAccessContextWithCompanyScope(context: AccessContext) {
  if (!context.supabase || !context.companyId) return { ...context, companyScope: null }
  const companyScope = await getTenantCompanyScope(context.supabase, context.tenantId, context.companyId).catch(() => null)
  return { ...context, companyScope }
}

export async function enrichAccessContextWithBranchScope(context: AccessContext) {
  if (!context.supabase || !context.branchId) return { ...context, branchScope: null }
  let branch: Record<string, any> | null = null
  try {
    const query = context.supabase
      .from('company_branches')
      .select('id,tenant_id,company_id,status,record_status,is_deleted')
      .eq('id', context.branchId)
      .eq('tenant_id', context.tenantId)
    const result = await query.maybeSingle()
    branch = result.error ? null : result.data
  } catch {
    branch = null
  }

  return {
    ...context,
    branchScope: branch,
    companyId: context.companyId || branch?.company_id || null,
  }
}

export function getAccessContextFromSessionBootstrap(input: {
  userId?: string | null
  tenantId: string
  permissions?: string[]
  modules?: Array<{ key: string; status: string }>
}): AccessContext {
  return {
    userId: input.userId ?? null,
    tenantId: input.tenantId,
    permissions: input.permissions || [],
    moduleStatus: Object.fromEntries((input.modules || []).map(item => [item.key, item])),
  }
}
