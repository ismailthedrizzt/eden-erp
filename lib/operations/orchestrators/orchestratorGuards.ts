import type { SupabaseClient } from '@supabase/supabase-js'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import type { TenantContext } from '@/lib/tenancy/server'
import type { OperationOrchestratorResult } from './types'
import { orchestratorError } from './orchestratorResponse'

export function detectVersionConflict(
  current: Record<string, any>,
  baseVersion?: number | null,
  baseUpdatedAt?: string | null
) {
  const details = {
    current_version: current.version,
    base_version: baseVersion ?? null,
    current_updated_at: current.updated_at ?? null,
    base_updated_at: baseUpdatedAt ?? null,
  }

  if (baseVersion !== undefined && baseVersion !== null && Number(current.version || 0) !== Number(baseVersion)) {
    return {
      ok: false as const,
      status: 409,
      code: 'VERSION_CONFLICT',
      error: 'Kayit bu islem hazirlanirken degismis. Lutfen kaydi yenileyip tekrar deneyin.',
      details,
    }
  }

  if (baseUpdatedAt && current.updated_at && new Date(current.updated_at).getTime() !== new Date(baseUpdatedAt).getTime()) {
    return {
      ok: false as const,
      status: 409,
      code: 'VERSION_CONFLICT',
      error: 'Kayit bu islem hazirlanirken guncellenmis. Lutfen kaydi yenileyip tekrar deneyin.',
      details,
    }
  }

  return null
}

export function normalizeLifecycleStatus(value: unknown) {
  const status = String(value || '').trim().toLocaleLowerCase('tr-TR')
  if (['active', 'aktif', 'opened'].includes(status)) return 'active'
  if (['draft', 'taslak'].includes(status)) return 'draft'
  if (['liquidation', 'tasfiye', 'tasfiye halinde'].includes(status)) return 'liquidation'
  if (['closed', 'kapali', 'kapalı', 'passive', 'pasif', 'deregistered', 'terkin'].includes(status)) return 'deregistered'
  return status
}

export function isActiveStatus(row: Record<string, any>) {
  const values = [row.record_status, row.status, row.company_status].map(normalizeLifecycleStatus)
  return row.is_deleted !== true && values.includes('active')
}

export async function assertCompanyWritableScope({
  supabase,
  tenantContext,
  companyId,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  companyId: string
}): Promise<OperationOrchestratorResult | null> {
  const scope = await getTenantCompanyScope(supabase as any, tenantContext.tenantId, companyId)
  if (!scope) return orchestratorError('Sirket bulunamadi.', 'COMPANY_NOT_FOUND', 404)
  if (!isWritableCompanyScope(scope)) {
    return orchestratorError('Bu sirket icin yalnizca goruntuleme yetkiniz var.', 'COMPANY_SCOPE_READONLY', 403)
  }
  return null
}

export function assertActiveCompany(company: Record<string, any> | null | undefined) {
  if (!company) return orchestratorError('Sirket bulunamadi.', 'COMPANY_NOT_FOUND', 404)
  if (!isActiveStatus(company)) {
    return orchestratorError('Islem yalnizca aktif sirketlerde baslatilabilir.', 'COMPANY_NOT_ACTIVE', 409)
  }
  return null
}

export function assertRequiredField(value: unknown, field: string, label = field) {
  if (value !== undefined && value !== null && String(value).trim() !== '') return null
  return orchestratorError(`${label} zorunludur.`, 'REQUIRED_FIELD_MISSING', 400, {
    fieldErrors: { [field]: `${label} zorunludur.` },
  })
}

export function assertSameCompany(
  row: Record<string, any> | null | undefined,
  companyId: string,
  label = 'Kayit'
) {
  if (!row) return orchestratorError(`${label} bulunamadi.`, 'RECORD_NOT_FOUND', 404)
  if (row.company_id && row.company_id !== companyId) {
    return orchestratorError(`${label} ayni sirket altinda olmalidir.`, 'COMPANY_ID_MISMATCH', 400)
  }
  return null
}

export function assertNotClosed(row: Record<string, any> | null | undefined, label = 'Kayit') {
  if (!row) return orchestratorError(`${label} bulunamadi.`, 'RECORD_NOT_FOUND', 404)
  const values = [row.record_status, row.status, row.company_status].map(normalizeLifecycleStatus)
  if (row.is_deleted || values.some(value => ['deregistered', 'passive'].includes(value))) {
    return orchestratorError(`${label} kapali veya pasif durumda.`, 'RECORD_CLOSED', 409)
  }
  return null
}
