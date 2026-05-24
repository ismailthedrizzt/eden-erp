import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'

type RoleTableName = 'employees' | 'company_partners' | 'stakeholders'

type RoleMasterIdentity = {
  person_id?: string | null
  organization_id?: string | null
  company_id?: string | null
}

export type RoleUniquenessResult =
  | { ok: true }
  | { ok: false; status: number; code: string; error: string; details?: unknown }

const roleTableConfig: Record<RoleTableName, { label: string; select: string; partnerFlow?: boolean }> = {
  employees: {
    label: 'Calisanlar',
    select: 'id,person_id,first_name,last_name,national_id,passport_no,record_status,employment_status,work_status',
  },
  company_partners: {
    label: 'Ortaklar',
    select: 'id,company_id,person_id,organization_id,display_name,partner_name,record_status,status',
    partnerFlow: true,
  },
  stakeholders: {
    label: 'Paydaslar',
    select: 'id,person_id,organization_id,display_name,status',
  },
}

export async function ensureUniqueRoleMaster(
  supabase: SupabaseClient,
  options: {
    tableName: RoleTableName
    identity: RoleMasterIdentity
    excludeId?: string | null
    tenantContext?: TenantContext | null
  }
): Promise<RoleUniquenessResult> {
  const personId = cleanId(options.identity.person_id)
  const organizationId = cleanId(options.identity.organization_id)
  const masterField = personId ? 'person_id' : organizationId ? 'organization_id' : null
  const masterId = personId || organizationId

  if (!masterField || !masterId) return { ok: true }

  const config = roleTableConfig[options.tableName]
  const companyId = options.tableName === 'company_partners' ? cleanId(options.identity.company_id) : null
  const queryResult = await queryExistingRole(supabase, {
    tableName: options.tableName,
    select: config.select,
    masterField,
    masterId,
    companyId,
    excludeId: options.excludeId,
    tenantContext: options.tenantContext,
    filterDeleted: true,
  })

  if (queryResult.error) {
    return {
      ok: false,
      status: 500,
      code: 'ROLE_UNIQUENESS_CHECK_FAILED',
      error: queryResult.error.message || 'Rol tekillik kontrolu tamamlanamadi.',
      details: queryResult.error,
    }
  }

  if (!queryResult.record) return { ok: true }

  const existingRecord = queryResult.record as Record<string, any>
  const subject = masterField === 'person_id' ? 'Bu kisi' : 'Bu kurum'
  const existingStatus = String(existingRecord.record_status || existingRecord.status || '').toLocaleLowerCase('tr-TR')
  const flowHint = config.partnerFlow
    ? existingStatus === 'draft' || existingStatus === 'taslak'
      ? ' Secilen sirkette bu kimlik icin zaten taslak ortak kaydi var. Mevcut taslagi acip devam edin.'
      : ' Secilen sirkette bu kimlik icin zaten aktif ortak kaydi var.'
    : ''

  return {
    ok: false,
    status: 409,
    code: 'DUPLICATE_ROLE_MASTER',
    error: config.partnerFlow
      ? `${subject} ${config.label} listesinde bu sirket icin zaten kayitli.${flowHint}`
      : `${subject} ${config.label} listesinde zaten kayitli. Ayni master kimlik bu listede tek kayitla temsil edilir.`,
    details: {
      tableName: options.tableName,
      masterField,
      masterId,
      existingRecord: queryResult.record,
    },
  }
}

export function roleUniquenessResponse(result: Extract<RoleUniquenessResult, { ok: false }>) {
  return NextResponse.json(
    { error: result.error, code: result.code, details: result.details },
    { status: result.status }
  )
}

async function queryExistingRole(
  supabase: SupabaseClient,
  options: {
    tableName: RoleTableName
    select: string
    masterField: 'person_id' | 'organization_id'
    masterId: string
    companyId?: string | null
    excludeId?: string | null
    tenantContext?: TenantContext | null
    filterDeleted: boolean
  }
) {
  let query = supabase
    .from(options.tableName)
    .select(options.select)
    .eq(options.masterField, options.masterId)
    .limit(1)

  query = applyTenantQueryScope(query, options.tableName, options.tenantContext)
  if (options.tableName === 'company_partners') {
    if (!options.companyId) return { record: null, error: null }
    query = query
      .eq('company_id', options.companyId)
      .or('record_status.eq.draft,record_status.eq.active,status.eq.Taslak,status.eq.Aktif')
  }
  if (options.excludeId) query = query.neq('id', options.excludeId)
  if (options.filterDeleted) query = query.eq('is_deleted', false)

  let { data, error } = await query

  if (error && options.filterDeleted && isMissingColumnError(error, 'is_deleted')) {
    let retry = supabase
      .from(options.tableName)
      .select(options.select)
      .eq(options.masterField, options.masterId)
      .limit(1)

    retry = applyTenantQueryScope(retry, options.tableName, options.tenantContext)
    if (options.tableName === 'company_partners') {
      if (!options.companyId) return { record: null, error: null }
      retry = retry
        .eq('company_id', options.companyId)
        .or('record_status.eq.draft,record_status.eq.active,status.eq.Taslak,status.eq.Aktif')
    }
    if (options.excludeId) retry = retry.neq('id', options.excludeId)
    const retryResult = await retry
    data = retryResult.data
    error = retryResult.error
  }

  return {
    record: Array.isArray(data) ? data[0] || null : null,
    error,
  }
}

function cleanId(value: unknown) {
  const text = String(value || '').trim()
  return text || null
}

function isMissingColumnError(error: { message?: string; code?: string } | null, columnName: string) {
  const message = error?.message || ''
  return (
    message.includes(columnName) &&
    (message.includes('does not exist') || message.includes('schema cache'))
  )
}
