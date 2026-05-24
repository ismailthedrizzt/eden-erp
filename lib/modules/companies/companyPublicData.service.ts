import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'

export type CompanyPublicDataPayload = {
  public_tax?: Record<string, any>
  public_sgk?: Record<string, any>
  public_incentives?: Record<string, any>
  public_registry?: Record<string, any>
  public_licenses?: Record<string, any>[]
  public_channels?: Record<string, any>
}

export async function syncCompanyPublicData(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  payload: CompanyPublicDataPayload,
  tenantContext: TenantContext
) {
  const singleRows = [
    ['company_public_tax', payload.public_tax],
    ['company_public_sgk', payload.public_sgk],
    ['company_public_incentives', payload.public_incentives],
    ['company_public_registry', payload.public_registry],
    ['company_public_channels', payload.public_channels],
  ] as const

  for (const [table, row] of singleRows) {
    if (!row || Object.keys(row).length === 0) continue
    const { error } = await supabase
      .from(table)
      .upsert(withTenantInsertScopeForTable({ ...cleanPublicRow(row), company_id: companyId }, table, tenantContext), { onConflict: 'company_id' })
    if (error) return error
  }

  if (payload.public_licenses) {
    let existingQuery = supabase
      .from('company_public_licenses')
      .select('id')
      .eq('company_id', companyId)

    existingQuery = applyTenantQueryScope(existingQuery, 'company_public_licenses', tenantContext)
    const { data: existing, error: fetchError } = await existingQuery

    if (fetchError) return fetchError

    const incomingIds = new Set(payload.public_licenses.map((row) => row.id).filter(Boolean))
    const missingIds = (existing || [])
      .map((row) => row.id)
      .filter((licenseId) => !incomingIds.has(licenseId))

    if (missingIds.length > 0) {
      let deleteQuery = supabase
        .from('company_public_licenses')
        .update({
          is_deleted: true,
          status: 'Pasif',
          deleted_at: new Date().toISOString(),
          deleted_by: 'Sistem Kullanıcısı',
        })
        .in('id', missingIds)

      deleteQuery = applyTenantQueryScope(deleteQuery, 'company_public_licenses', tenantContext)
      const { error } = await deleteQuery

      if (error) return error
    }

    if (payload.public_licenses.length > 0) {
      const { error } = await supabase
        .from('company_public_licenses')
        .upsert(payload.public_licenses.map((license) => withTenantInsertScopeForTable({
          ...cleanPublicRow(license),
          ...(license.id ? { id: license.id } : {}),
          company_id: companyId,
          reminder_days: license.reminder_days ? Number(license.reminder_days) : null,
          is_deleted: !!license.is_deleted,
          deleted_at: license.deleted_at || null,
          deleted_by: license.deleted_by || null,
        }, 'company_public_licenses', tenantContext)), { onConflict: 'id' })

      if (error) return error
    }
  }

  return null
}

function cleanPublicRow(row: Record<string, any>) {
  const { id, company_id, created_at, updated_at, ...rest } = row
  return Object.fromEntries(
    Object.entries(rest)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (value === '') return [key, null]
        if (key === 'employee_count') return [key, value ? Number(value) : null]
        return [key, value]
      })
  )
}
