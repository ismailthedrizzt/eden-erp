import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/security/serverPermissions'
import {
  applyTenantQueryScope,
  resolveTenantContext,
  type TenantContext,
  withTenantInsertScopeForTable,
} from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'

export const COMPANY_NACE_SELECT = 'id,company_id,nace_code_id,is_primary,status,start_date,end_date,notes,is_deleted,created_at,updated_at,version,nace_code:nace_codes(id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at)'

type CompanyNaceAccessMode = 'view' | 'edit'

export type CompanyNaceAccess = {
  userId: string | null
  tenantContext: TenantContext
}

export async function requireCompanyNaceAccess(
  request: NextRequest,
  supabase: SupabaseClient,
  companyId: string,
  mode: CompanyNaceAccessMode
): Promise<CompanyNaceAccess | NextResponse> {
  const permission = await requirePermission(request, supabase, mode === 'view' ? 'companies.view' : 'companies.edit')
  if (permission instanceof NextResponse) return permission

  const tenantContext = resolveTenantContext(request)
  try {
    const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
    if (!companyScope) {
      return NextResponse.json({ error: 'Sirket bulunamadi', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }

    if (mode === 'edit' && !isWritableCompanyScope(companyScope)) {
      return NextResponse.json({ error: 'Bu sirket icin yalnizca goruntuleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY' }, { status: 403 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sirket kapsami kontrol edilemedi.', code: 'COMPANY_SCOPE_CHECK_FAILED' },
      { status: 500 }
    )
  }

  return { userId: permission.userId, tenantContext }
}

export function scopeCompanyNaceQuery<TQuery extends { eq: (field: string, value: unknown) => TQuery }>(
  query: TQuery,
  tenantContext: TenantContext
) {
  return applyTenantQueryScope(query, 'company_nace_codes', tenantContext)
}

export function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')
}

export async function syncPrimaryRiskClass(
  supabase: SupabaseClient,
  companyId: string,
  naceCode: any,
  tenantContext: TenantContext
) {
  const payload = withTenantInsertScopeForTable({
    company_id: companyId,
    nace_code: naceCode?.nace_code || null,
    risk_class: naceCode?.hazard_class || null,
    updated_at: new Date().toISOString(),
  }, 'company_public_sgk', tenantContext)

  const { error } = await supabase
    .from('company_public_sgk')
    .upsert(payload, { onConflict: 'company_id' })

  return isMissingTableError(error) ? null : error
}
