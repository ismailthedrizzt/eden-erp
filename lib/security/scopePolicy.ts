// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: policy
// TARGET_FASTAPI_ENDPOINT: /api/v1/policies/scope
// NOTES: Scope enforcement should move to Python; TS may remain UI preview/client helper only.

import 'server-only'

import { applyTenantQueryScope } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import type { AccessContext } from './accessContext'

type ScopeItem = {
  company_id?: string | null
  companyId?: string | null
}

export async function canAccessCompany(context: AccessContext, companyId?: string | null) {
  if (!context.supabase || !companyId) return false
  if (context.companyScope?.company_id === companyId) return true
  const scope = await getTenantCompanyScope(context.supabase, context.tenantId, companyId).catch(() => null)
  return Boolean(scope)
}

export async function canWriteCompany(context: AccessContext, companyId?: string | null) {
  if (!context.supabase || !companyId) return false
  if (context.companyScope?.company_id === companyId) return isWritableCompanyScope(context.companyScope as any)
  const scope = await getTenantCompanyScope(context.supabase, context.tenantId, companyId).catch(() => null)
  return isWritableCompanyScope(scope)
}

export async function canAccessBranch(context: AccessContext, branchId?: string | null) {
  const branch = await loadBranchScope(context, branchId)
  if (!branch) return false
  return canAccessCompany(context, branch.company_id)
}

export async function canWriteBranch(context: AccessContext, branchId?: string | null) {
  const branch = await loadBranchScope(context, branchId)
  if (!branch || isClosedOrPassive(branch)) return false
  return canWriteCompany(context, branch.company_id)
}

export async function canAccessOrganizationUnit(context: AccessContext, organizationUnitId?: string | null) {
  const unit = await loadScopedReference(context, 'organization_units', 'id,tenant_id,company_id,status,active,is_deleted', organizationUnitId)
  if (!unit || unit.is_deleted === true) return false
  return canAccessCompany(context, unit.company_id)
}

export async function canWriteOrganizationUnit(context: AccessContext, organizationUnitId?: string | null) {
  const unit = await loadScopedReference(context, 'organization_units', 'id,tenant_id,company_id,status,active,is_deleted', organizationUnitId)
  if (!unit || unit.is_deleted === true || unit.active === false || isClosedOrPassive(unit)) return false
  return canWriteCompany(context, unit.company_id)
}

export async function canAccessFacility(context: AccessContext, facilityId?: string | null) {
  const facility = await loadScopedReference(context, 'company_facilities', 'id,tenant_id,company_id,status,record_status,is_deleted', facilityId)
  if (!facility || facility.is_deleted === true) return false
  return canAccessCompany(context, facility.company_id)
}

export async function canWriteFacility(context: AccessContext, facilityId?: string | null) {
  const facility = await loadScopedReference(context, 'company_facilities', 'id,tenant_id,company_id,status,record_status,is_deleted', facilityId)
  if (!facility || facility.is_deleted === true || isClosedOrPassive(facility)) return false
  return canWriteCompany(context, facility.company_id)
}

export function assertSameCompanyScope(scopeItems: ScopeItem[]) {
  const companyIds = Array.from(new Set(scopeItems.map(item => item.company_id || item.companyId).filter(Boolean)))
  return {
    ok: companyIds.length <= 1,
    companyId: companyIds[0] || null,
    companyIds,
  }
}

export async function loadBranchScope(context: AccessContext, branchId?: string | null) {
  return loadScopedReference(context, 'company_branches', 'id,tenant_id,company_id,status,record_status,is_deleted', branchId)
}

export async function loadOrganizationUnitScope(context: AccessContext, organizationUnitId?: string | null) {
  return loadScopedReference(context, 'organization_units', 'id,tenant_id,company_id,status,active,is_deleted', organizationUnitId)
}

export async function loadFacilityScope(context: AccessContext, facilityId?: string | null) {
  return loadScopedReference(context, 'company_facilities', 'id,tenant_id,company_id,status,record_status,is_deleted', facilityId)
}

export function isClosedOrPassive(row: Record<string, any> | null | undefined) {
  if (!row) return true
  const statuses = [row.record_status, row.status].map(normalizeStatus)
  return row.is_deleted === true
    || statuses.some(status => ['closed', 'passive', 'deleted', 'deregistered', 'liquidation'].includes(status))
}

export function normalizeStatus(value: unknown) {
  const normalized = String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (['aktif', 'active'].includes(normalized)) return 'active'
  if (['taslak', 'draft'].includes(normalized)) return 'draft'
  if (['pasif', 'passive', 'inactive'].includes(normalized)) return 'passive'
  if (['kapali', 'closed'].includes(normalized)) return 'closed'
  if (['terkin', 'deregistered'].includes(normalized)) return 'deregistered'
  if (['tasfiye', 'liquidation'].includes(normalized)) return 'liquidation'
  return normalized
}

async function loadScopedReference(
  context: AccessContext,
  tableName: 'company_branches' | 'organization_units' | 'company_facilities',
  select: string,
  id?: string | null
) {
  if (!context.supabase || !id) return null
  let query = context.supabase.from(tableName).select(select).eq('id', id)
  query = applyTenantQueryScope(query, tableName, {
    tenantId: context.tenantId,
    workspaceId: context.tenantId,
    schemaName: 'public',
    isolationMode: 'shared_schema',
    source: 'header',
    isDefault: false,
    activation: {
      headerForwarding: true,
      tenantColumnWrites: true,
      tenantFiltering: true,
      databaseRouting: false,
    },
  })
  const { data, error } = await query.maybeSingle()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return data as Record<string, any> | null
}

function isMissingInfrastructureError(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}
