import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export type AuthorityScopeType = 'company_wide' | 'branch' | 'organization_unit' | 'facility'

export type RepresentativeAuthorityScopeInput = {
  scope_type?: AuthorityScopeType | string | null
  branch_id?: string | null
  organization_unit_id?: string | null
  facility_id?: string | null
  scope_label?: string | null
  scope_notes?: string | null
}

export async function resolveCompanyScope(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
) {
  let query = supabase.from('companies').select('id,record_status,company_status,is_deleted').eq('id', companyId)
  query = applyTenantQueryScope(query, 'companies', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data as Record<string, any> | null
}

export async function resolveBranchScope(
  supabase: SupabaseClient,
  branchId: string,
  tenantContext: TenantContext
) {
  return loadScopedRow(supabase, 'company_branches', 'id,company_id,status,record_status,is_deleted,version,updated_at', branchId, tenantContext)
}

export async function resolveOrganizationUnitScope(
  supabase: SupabaseClient,
  organizationUnitId: string,
  tenantContext: TenantContext
) {
  return loadScopedRow(supabase, 'organization_units', 'id,company_id,parent_unit_id,status,active,is_deleted', organizationUnitId, tenantContext)
}

export async function resolveFacilityScope(
  supabase: SupabaseClient,
  facilityId: string,
  tenantContext: TenantContext
) {
  return loadScopedRow(supabase, 'company_facilities', 'id,company_id,branch_id,status,record_status,is_deleted', facilityId, tenantContext)
}

export function assertSameCompanyScope(row: Record<string, any> | null, companyId: string, label = 'Kayit') {
  if (!row || row.company_id !== companyId) {
    return { ok: false as const, status: 400, code: 'SCOPE_COMPANY_MISMATCH', error: `${label} ayni sirket altinda olmalidir.` }
  }
  return { ok: true as const }
}

export function assertActiveBranch(row: Record<string, any> | null) {
  if (!row) return { ok: false as const, status: 404, code: 'BRANCH_NOT_FOUND', error: 'Sube bulunamadi.' }
  if (!isActiveScopedRow(row)) return { ok: false as const, status: 400, code: 'BRANCH_INACTIVE', error: 'Kapali veya pasif sube icin yeni aktif islem baslatilamaz.' }
  return { ok: true as const }
}

export function assertActiveOrganizationUnit(row: Record<string, any> | null) {
  if (!row) return { ok: false as const, status: 404, code: 'ORGANIZATION_UNIT_NOT_FOUND', error: 'Organizasyon birimi bulunamadi.' }
  if (!isActiveScopedRow(row)) return { ok: false as const, status: 400, code: 'ORGANIZATION_UNIT_INACTIVE', error: 'Kapali veya pasif organizasyon birimi icin yeni aktif islem baslatilamaz.' }
  return { ok: true as const }
}

export function assertActiveFacility(row: Record<string, any> | null) {
  if (!row) return { ok: false as const, status: 404, code: 'FACILITY_NOT_FOUND', error: 'Tesis/lokasyon bulunamadi.' }
  if (!isActiveScopedRow(row)) return { ok: false as const, status: 400, code: 'FACILITY_INACTIVE', error: 'Kapali veya pasif tesis/lokasyon icin yeni aktif islem baslatilamaz.' }
  return { ok: true as const }
}

export async function resolveRepresentativeAuthorityScope(
  supabase: SupabaseClient,
  companyId: string,
  input: RepresentativeAuthorityScopeInput,
  tenantContext: TenantContext
) {
  const scopeType = String(input.scope_type || 'company_wide') as AuthorityScopeType
  if (!['company_wide', 'branch', 'organization_unit', 'facility'].includes(scopeType)) {
    return { ok: false as const, status: 400, code: 'INVALID_AUTHORITY_SCOPE_TYPE', error: 'Yetki kapsami gecerli degil.' }
  }

  if (scopeType === 'company_wide') {
    if (input.branch_id || input.organization_unit_id || input.facility_id) {
      return { ok: false as const, status: 400, code: 'AUTHORITY_SCOPE_COMPANY_WIDE_ONLY', error: 'Sirket geneli kapsamda sube, birim veya tesis secilmemelidir.' }
    }
    return { ok: true as const, scope: normalizeAuthorityScope(input, scopeType) }
  }

  if (scopeType === 'branch') {
    if (!input.branch_id) return { ok: false as const, status: 400, code: 'AUTHORITY_BRANCH_REQUIRED', error: 'Sube kapsami icin sube secilmelidir.' }
    const branch = await resolveBranchScope(supabase, input.branch_id, tenantContext)
    const sameCompany = assertSameCompanyScope(branch, companyId, 'Sube')
    if (!sameCompany.ok) return sameCompany
    const active = assertActiveBranch(branch)
    if (!active.ok) return active
  }

  if (scopeType === 'organization_unit') {
    if (!input.organization_unit_id) return { ok: false as const, status: 400, code: 'AUTHORITY_ORGANIZATION_UNIT_REQUIRED', error: 'Organizasyon birimi kapsami icin birim secilmelidir.' }
    const unit = await resolveOrganizationUnitScope(supabase, input.organization_unit_id, tenantContext)
    const sameCompany = assertSameCompanyScope(unit, companyId, 'Organizasyon birimi')
    if (!sameCompany.ok) return sameCompany
    const active = assertActiveOrganizationUnit(unit)
    if (!active.ok) return active
  }

  if (scopeType === 'facility') {
    if (!input.facility_id) return { ok: false as const, status: 400, code: 'AUTHORITY_FACILITY_REQUIRED', error: 'Tesis/lokasyon kapsami icin tesis secilmelidir.' }
    const facility = await resolveFacilityScope(supabase, input.facility_id, tenantContext)
    const sameCompany = assertSameCompanyScope(facility, companyId, 'Tesis/lokasyon')
    if (!sameCompany.ok) return sameCompany
    const active = assertActiveFacility(facility)
    if (!active.ok) return active
  }

  return { ok: true as const, scope: normalizeAuthorityScope(input, scopeType) }
}

function normalizeAuthorityScope(input: RepresentativeAuthorityScopeInput, scopeType: AuthorityScopeType) {
  return {
    scope_type: scopeType,
    branch_id: scopeType === 'branch' ? input.branch_id || null : null,
    organization_unit_id: scopeType === 'organization_unit' ? input.organization_unit_id || null : null,
    facility_id: scopeType === 'facility' ? input.facility_id || null : null,
    scope_label: input.scope_label || '',
    scope_notes: input.scope_notes || '',
  }
}

async function loadScopedRow(
  supabase: SupabaseClient,
  tableName: 'company_branches' | 'organization_units' | 'company_facilities',
  select: string,
  id: string,
  tenantContext: TenantContext
) {
  let query = supabase.from(tableName).select(select).eq('id', id)
  query = applyTenantQueryScope(query, tableName, tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return data as Record<string, any> | null
}

function isActiveScopedRow(row: Record<string, any>) {
  const values = [row.record_status, row.status].map(value => String(value || '').toLocaleLowerCase('tr-TR'))
  return row.is_deleted !== true
    && row.active !== false
    && !values.some(value => ['passive', 'pasif', 'closed', 'kapali', 'kapalı', 'deregistered', 'terkin'].includes(value))
}
