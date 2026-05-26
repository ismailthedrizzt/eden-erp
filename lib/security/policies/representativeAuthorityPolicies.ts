import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import { normalizeStatus } from '../scopePolicy'

export type RepresentativeAuthorityPolicyAction =
  | 'representative.authorityStart'
  | 'representative.authorityUpdate'
  | 'representative.authoritySuspend'
  | 'representative.authorityTerminate'

export type RepresentativeAuthorityScopeType = 'company_wide' | 'branch' | 'organization_unit' | 'facility'

export interface RepresentativeAuthorityScopeInput {
  scope_type?: string | null
  branch_id?: string | null
  organization_unit_id?: string | null
  facility_id?: string | null
  scope_label?: string | null
  scope_notes?: string | null
}

export async function validateRepresentativeAuthorityScopePolicy({
  supabase,
  tenantContext,
  companyId,
  scope,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  companyId?: string | null
  scope: RepresentativeAuthorityScopeInput
}) {
  if (!companyId) return failure(400, 'COMPANY_REQUIRED', 'Temsil yetkisi icin bagli sirket zorunludur.')

  const scopeType = String(scope.scope_type || 'company_wide') as RepresentativeAuthorityScopeType
  if (!['company_wide', 'branch', 'organization_unit', 'facility'].includes(scopeType)) {
    return failure(400, 'INVALID_AUTHORITY_SCOPE_TYPE', 'Yetki kapsami gecerli degil.')
  }
  if (scopeType === 'company_wide') {
    if (scope.branch_id || scope.organization_unit_id || scope.facility_id) {
      return failure(400, 'AUTHORITY_SCOPE_COMPANY_WIDE_ONLY', 'Sirket geneli yetkide sube, organizasyon birimi veya tesis/lokasyon secilmemelidir.', {
        fieldErrors: {
          branch_id: 'Sirket geneli yetkide sube secilmez.',
          organization_unit_id: 'Sirket geneli yetkide organizasyon birimi secilmez.',
          facility_id: 'Sirket geneli yetkide tesis/lokasyon secilmez.',
        },
      })
    }
    return null
  }

  if (scopeType === 'branch') {
    if (!scope.branch_id) return fieldFailure('AUTHORITY_BRANCH_REQUIRED', 'Sube kapsami icin sube secilmelidir.', 'branch_id', 'Sube secimi zorunludur.')
    const branch = await loadScopedAuthorityReference(supabase, 'company_branches', 'id,company_id,status,record_status,is_deleted', scope.branch_id, tenantContext)
    if (!branch || branch.company_id !== companyId) return fieldFailure('AUTHORITY_BRANCH_INVALID', 'Secilen sube bu sirkete bagli degildir.', 'branch_id', 'Ayni sirketten aktif sube secin.')
    if (!isActiveAuthorityReference(branch)) return fieldFailure('AUTHORITY_BRANCH_INACTIVE', 'Kapali veya pasif subeye yeni aktif temsil yetkisi verilemez.', 'branch_id', 'Aktif sube secin.')
  }

  if (scopeType === 'organization_unit') {
    if (!scope.organization_unit_id) return fieldFailure('AUTHORITY_ORGANIZATION_UNIT_REQUIRED', 'Organizasyon birimi kapsami icin birim secilmelidir.', 'organization_unit_id', 'Organizasyon birimi zorunludur.')
    const unit = await loadScopedAuthorityReference(supabase, 'organization_units', 'id,company_id,status,active,is_deleted', scope.organization_unit_id, tenantContext)
    if (!unit || unit.company_id !== companyId) return fieldFailure('AUTHORITY_ORGANIZATION_UNIT_INVALID', 'Secilen organizasyon birimi bu sirkete bagli degildir.', 'organization_unit_id', 'Ayni sirketten aktif birim secin.')
    if (!isActiveAuthorityReference(unit)) return fieldFailure('AUTHORITY_ORGANIZATION_UNIT_INACTIVE', 'Kapali veya pasif organizasyon birimi icin yeni aktif temsil yetkisi verilemez.', 'organization_unit_id', 'Aktif birim secin.')
  }

  if (scopeType === 'facility') {
    if (!scope.facility_id) return fieldFailure('AUTHORITY_FACILITY_REQUIRED', 'Tesis/lokasyon kapsami icin tesis secilmelidir.', 'facility_id', 'Tesis/lokasyon zorunludur.')
    const facility = await loadScopedAuthorityReference(supabase, 'company_facilities', 'id,company_id,status,record_status,is_deleted', scope.facility_id, tenantContext)
    if (!facility || facility.company_id !== companyId) return fieldFailure('AUTHORITY_FACILITY_INVALID', 'Secilen tesis/lokasyon bu sirkete bagli degildir.', 'facility_id', 'Ayni sirketten aktif tesis secin.')
    if (!isActiveAuthorityReference(facility)) return fieldFailure('AUTHORITY_FACILITY_INACTIVE', 'Kapali veya pasif tesis/lokasyon icin yeni aktif temsil yetkisi verilemez.', 'facility_id', 'Aktif tesis/lokasyon secin.')
  }

  return null
}

export const validateRepresentativeAuthorityScope = validateRepresentativeAuthorityScopePolicy

export async function canStartRepresentativeAuthorityForScope(input: Parameters<typeof validateRepresentativeAuthorityScopePolicy>[0]) {
  return validateRepresentativeAuthorityScopePolicy(input)
}

export async function canChangeRepresentativeAuthorityScope(input: Parameters<typeof validateRepresentativeAuthorityScopePolicy>[0]) {
  return validateRepresentativeAuthorityScopePolicy(input)
}

export function assertSingleRepresentativeCardPolicy(input: {
  companyId?: string | null
  personId?: string | null
  organizationId?: string | null
}) {
  if (!input.companyId) return failure(400, 'COMPANY_REQUIRED', 'Temsilci karti icin bagli sirket zorunludur.')
  if (!input.personId && !input.organizationId) {
    return failure(400, 'REPRESENTATIVE_IDENTITY_REQUIRED', 'Temsilci karti kisi veya kurum kimligiyle baglanmalidir.')
  }
  return null
}

async function loadScopedAuthorityReference(
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

function isActiveAuthorityReference(row: Record<string, any>) {
  return row.is_deleted !== true
    && row.active !== false
    && !['passive', 'closed', 'deleted', 'deregistered'].includes(normalizeStatus(row.record_status || row.status))
}

function failure(status: number, code: string, error: string, details?: unknown) {
  return { ok: false as const, status, code, error, details }
}

function fieldFailure(code: string, error: string, field: string, fieldError: string) {
  return failure(400, code, error, { fieldErrors: { [field]: fieldError } })
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
