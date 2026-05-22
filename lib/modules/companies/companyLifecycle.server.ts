import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'

export const COMPANY_LIFECYCLE_PERMISSIONS = {
  lifecycleView: 'companies.lifecycle.view',
  openingStart: 'companies.opening.start',
  openingComplete: 'companies.opening.complete',
  liquidationStart: 'companies.liquidation.start',
  liquidationComplete: 'companies.liquidation.complete',
  liquidationUpdate: 'companies.liquidation.update',
  deregistrationStart: 'companies.deregistration.start',
  deregistrationComplete: 'companies.deregistration.complete',
} as const

type Supabase = ReturnType<typeof createServiceClient>
type WizardMode = 'opening' | 'liquidation' | 'deregistration'
type PermissionResult = { userId: string | null }
type OpeningNacePayloadRow = {
  nace_code_id: string
  is_primary: boolean
}

const COMPANY_CONTEXT_SELECT = [
  'id',
  'organization_id',
  'short_name',
  'trade_name',
  'tax_number',
  'tax_office',
  'company_type',
  'record_status',
  'company_status',
  'is_deleted',
  'mersis_number',
  'trade_registry_number',
  'foundation_date',
  'trade_registry_office',
  'electronic_notification_address',
  'sgk_workplace_registry_no',
  'hero_documents',
  'created_at',
  'updated_at',
].join(',')

export async function getCompanyLifecycle(request: NextRequest, companyId: string) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, COMPANY_LIFECYCLE_PERMISSIONS.lifecycleView)
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const scopeError = await requireCompanyScopeAccess(supabase, tenantContext, companyId)
  if (scopeError) return scopeError

  const lifecycle = await buildCompanyLifecyclePayload(supabase, companyId, tenantContext)
  if (lifecycle.error) return lifecycle.error
  return NextResponse.json({ data: lifecycle.data })
}

export async function getCompanyLifecycleEvents(request: NextRequest, companyId: string) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, COMPANY_LIFECYCLE_PERMISSIONS.lifecycleView)
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const scopeError = await requireCompanyScopeAccess(supabase, tenantContext, companyId)
  if (scopeError) return scopeError

  const events = await safeList(
    supabase,
    'company_lifecycle_events',
    'id,company_id,event_type,event_date,old_status,new_status,payload_json,document_reference_id,created_at,created_by',
    query => applyTenantQueryScope(query.eq('company_id', companyId), 'company_lifecycle_events', tenantContext).order('created_at', { ascending: false })
  )
  if (events.error) return NextResponse.json({ error: events.error.message, code: events.error.code || 'LIFECYCLE_EVENTS_FAILED' }, { status: 500 })
  return NextResponse.json({ data: events.data || [] })
}

export async function getCompanyWizardContext(
  request: NextRequest,
  companyId: string,
  mode: WizardMode
) {
  const supabase = createServiceClient()
  const permission = await requireModeStartPermission(request, supabase, mode)
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const scopeError = await requireCompanyScopeAccess(supabase, tenantContext, companyId, true)
  if (scopeError) return scopeError

  const lifecycle = await buildCompanyLifecyclePayload(supabase, companyId, tenantContext)
  if (lifecycle.error) return lifecycle.error
  const company = lifecycle.data.company as Record<string, any>
  const status = getCompanyStatus(company)

  const invalid = validateModeStatus(mode, status)
  if (invalid) return invalid

  const [documents, representatives, partners, stakeholders, naceCodes] = await Promise.all([
    safeCompanyDocuments(company),
    safeList(supabase, 'company_representatives', 'id,display_name,full_name,person_id,organization_id,status,is_deleted', query => applyTenantQueryScope(query.eq('company_id', companyId), 'company_representatives', tenantContext)),
    safeList(supabase, 'company_partners', 'id,display_name,partner_name,person_id,organization_id,status,is_deleted', query => applyTenantQueryScope(query.eq('company_id', companyId), 'company_partners', tenantContext)),
    safeList(supabase, 'stakeholders', 'id,display_name,person_id,organization_id,status,is_deleted', query => applyTenantQueryScope(query.eq('company_id', companyId), 'stakeholders', tenantContext)),
    safeList(supabase, 'company_nace_codes', 'id,nace_code_id,is_primary,status,is_deleted,nace_code:nace_codes(id,nace_code,description,hazard_class)', query => applyTenantQueryScope(query.eq('company_id', companyId).eq('is_deleted', false), 'company_nace_codes', tenantContext)),
  ])

  const referenceError = [representatives.error, partners.error, stakeholders.error, naceCodes.error].find(Boolean)
  if (referenceError) return NextResponse.json({ error: referenceError.message, code: referenceError.code || 'WIZARD_CONTEXT_FAILED' }, { status: 500 })

  return NextResponse.json({
    data: {
      ...lifecycle.data,
      permissions: { userId: permission.userId },
      references: {
        documents,
        representatives: filterActive(representatives.data),
        partners: filterActive(partners.data),
        stakeholders: filterActive(stakeholders.data),
        naceCodes: filterActive(naceCodes.data),
      },
    },
  })
}

export async function completeCompanyWizard(
  request: NextRequest,
  companyId: string,
  mode: WizardMode
) {
  const supabase = createServiceClient()
  const permission = await requireModeCompletePermission(request, supabase, mode)
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const scopeError = await requireCompanyScopeAccess(supabase, tenantContext, companyId, true)
  if (scopeError) return scopeError

  const parsedBody = await request.json().catch(() => ({}))
  const openingNaceCodes = mode === 'opening' ? normalizeOpeningNaceCodes(parsedBody?.nace_codes) : []
  const primaryNaceCode = openingNaceCodes.find(row => row.is_primary)
  const body = mode === 'opening'
    ? { ...parsedBody, nace_codes: openingNaceCodes, primary_nace_id: primaryNaceCode?.nace_code_id || '' }
    : parsedBody
  const statusError = validateRequiredPayload(mode, body)
  if (statusError) return statusError

  let companyQuery = supabase
    .from('companies')
    .select('id,record_status,company_status,is_deleted')
    .eq('id', companyId)
  companyQuery = applyTenantQueryScope(companyQuery, 'companies', tenantContext)
  const { data: company, error: companyError } = await companyQuery.single()
  if (companyError) {
    if (companyError.code === 'PGRST116') return NextResponse.json({ error: 'Sirket bulunamadi.', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ error: companyError.message, code: companyError.code || 'COMPANY_FETCH_FAILED' }, { status: 500 })
  }
  const invalid = validateModeStatus(mode, getCompanyStatus(company as Record<string, any>))
  if (invalid) return invalid

  if (mode === 'opening') {
    const naceSyncError = await syncOpeningNaceCodes(supabase, companyId, openingNaceCodes, permission.userId, tenantContext)
    if (naceSyncError) return naceSyncError
  }

  const rpcName = mode === 'opening'
    ? 'complete_company_opening_wizard'
    : mode === 'liquidation'
      ? 'complete_company_liquidation_wizard'
      : 'complete_company_deregistration_wizard'

  const { data, error } = await supabase.rpc(rpcName, {
    p_company_id: companyId,
    p_payload: body,
    p_user_id: permission.userId,
  })

  if (error) {
    return NextResponse.json({
      error: normalizeLifecycleError(error.message),
      code: error.code || modeErrorCode(mode),
    }, { status: lifecycleErrorStatus(error.message) })
  }

  if (mode === 'opening') {
    const identitySync = await syncOpeningCompanyIdentity(supabase, companyId, body, permission.userId, data, tenantContext)
    if (identitySync instanceof NextResponse) return identitySync
    return NextResponse.json({ data: identitySync })
  }

  return NextResponse.json({ data })
}

async function requireCompanyScopeAccess(
  supabase: Supabase,
  tenantContext: TenantContext,
  companyId: string,
  writable = false
) {
  const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
  if (!scope) return NextResponse.json({ error: 'Sirket bulunamadi.', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
  if (writable && !isWritableCompanyScope(scope)) {
    return NextResponse.json({ error: 'Bu sirket icin yalnizca goruntuleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY' }, { status: 403 })
  }
  return null
}

async function buildCompanyLifecyclePayload(supabase: Supabase, companyId: string, tenantContext: TenantContext) {
  let companyQuery = supabase
    .from('companies')
    .select(COMPANY_CONTEXT_SELECT)
    .eq('id', companyId)
  companyQuery = applyTenantQueryScope(companyQuery, 'companies', tenantContext)
  const { data: company, error } = await companyQuery.single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: NextResponse.json({ error: 'Sirket bulunamadi.', code: 'COMPANY_NOT_FOUND' }, { status: 404 }) }
    }
    return { data: null, error: NextResponse.json({ error: error.message, code: error.code || 'COMPANY_FETCH_FAILED' }, { status: 500 }) }
  }

  const [opening, liquidation, deregistration, events, publicTax, publicSgk, publicRegistry, publicChannels] = await Promise.all([
    safeMaybeSingle(supabase, 'company_opening_details', '*', query => query.eq('company_id', companyId)),
    safeMaybeSingle(supabase, 'company_liquidation_details', '*', query => query.eq('company_id', companyId)),
    safeMaybeSingle(supabase, 'company_deregistration_details', '*', query => query.eq('company_id', companyId)),
    safeList(supabase, 'company_lifecycle_events', 'id,company_id,event_type,event_date,old_status,new_status,payload_json,document_reference_id,created_at,created_by', query => applyTenantQueryScope(query.eq('company_id', companyId), 'company_lifecycle_events', tenantContext).order('created_at', { ascending: false }).limit(25)),
    safeMaybeSingle(supabase, 'company_public_tax', '*', query => applyTenantQueryScope(query.eq('company_id', companyId), 'company_public_tax', tenantContext)),
    safeMaybeSingle(supabase, 'company_public_sgk', '*', query => applyTenantQueryScope(query.eq('company_id', companyId), 'company_public_sgk', tenantContext)),
    safeMaybeSingle(supabase, 'company_public_registry', '*', query => applyTenantQueryScope(query.eq('company_id', companyId), 'company_public_registry', tenantContext)),
    safeMaybeSingle(supabase, 'company_public_channels', '*', query => applyTenantQueryScope(query.eq('company_id', companyId), 'company_public_channels', tenantContext)),
  ])

  const relatedError = [opening.error, liquidation.error, deregistration.error, events.error, publicTax.error, publicSgk.error, publicRegistry.error, publicChannels.error].find(Boolean)
  if (relatedError) {
    return { data: null, error: NextResponse.json({ error: relatedError.message, code: relatedError.code || 'COMPANY_LIFECYCLE_FAILED' }, { status: 500 }) }
  }

  return {
    data: {
      company: {
        ...(company as Record<string, any>),
        record_status: getCompanyStatus(company as Record<string, any>),
      },
      opening: opening.data || null,
      liquidation: liquidation.data || null,
      deregistration: deregistration.data || null,
      events: events.data || [],
      lastEvent: events.data?.[0] || null,
      public: {
        tax: publicTax.data || null,
        sgk: publicSgk.data || null,
        registry: publicRegistry.data || null,
        channels: publicChannels.data || null,
      },
    },
    error: null,
  }
}

async function requireModeStartPermission(request: NextRequest, supabase: Supabase, mode: WizardMode): Promise<PermissionResult | NextResponse> {
  if (mode === 'opening') return requirePermission(request, supabase, COMPANY_LIFECYCLE_PERMISSIONS.openingStart)
  if (mode === 'deregistration') return requirePermission(request, supabase, COMPANY_LIFECYCLE_PERMISSIONS.deregistrationStart)
  return requireAnyPermission(request, supabase, [
    COMPANY_LIFECYCLE_PERMISSIONS.liquidationStart,
    COMPANY_LIFECYCLE_PERMISSIONS.liquidationUpdate,
  ])
}

async function requireModeCompletePermission(request: NextRequest, supabase: Supabase, mode: WizardMode): Promise<PermissionResult | NextResponse> {
  if (mode === 'opening') return requirePermission(request, supabase, COMPANY_LIFECYCLE_PERMISSIONS.openingComplete)
  if (mode === 'deregistration') return requirePermission(request, supabase, COMPANY_LIFECYCLE_PERMISSIONS.deregistrationComplete)
  return requireAnyPermission(request, supabase, [
    COMPANY_LIFECYCLE_PERMISSIONS.liquidationComplete,
    COMPANY_LIFECYCLE_PERMISSIONS.liquidationUpdate,
  ])
}

async function requireAnyPermission(request: NextRequest, supabase: Supabase, permissionKeys: string[]) {
  let lastDenied: NextResponse | null = null
  for (const permissionKey of permissionKeys) {
    const permission = await requirePermission(request, supabase, permissionKey)
    if (!(permission instanceof NextResponse)) return permission
    lastDenied = permission
  }
  return lastDenied || NextResponse.json({ error: 'Permission denied', code: 'PERMISSION_DENIED' }, { status: 403 })
}

async function safeMaybeSingle(
  supabase: Supabase,
  table: string,
  select: string,
  apply: (query: any) => any
) {
  const result = await apply(supabase.from(table).select(select)).maybeSingle()
  if (result.error && isMissingTableError(result.error)) return { data: null, error: null }
  if (result.error && result.error.code === 'PGRST116') return { data: null, error: null }
  return result
}

async function safeList(
  supabase: Supabase,
  table: string,
  select: string,
  apply: (query: any) => any
) {
  const result = await apply(supabase.from(table).select(select))
  if (result.error && isMissingTableError(result.error)) return { data: [], error: null }
  return result
}

function safeCompanyDocuments(company: Record<string, any>) {
  return Array.isArray(company.hero_documents) ? company.hero_documents : []
}

function filterActive(rows: any[] | null | undefined) {
  return (rows || []).filter(row => !row.is_deleted && row.status !== 'Pasif' && row.status !== 'passive')
}

function getCompanyStatus(company: Record<string, any>) {
  return company.record_status || company.company_status || (company.is_deleted ? 'deregistered' : 'active')
}

function validateModeStatus(mode: WizardMode, status: string) {
  if (mode === 'opening' && status !== 'draft') {
    return NextResponse.json({ error: 'Sirket acilisi yalnizca taslak kayitlarda baslatilabilir.', code: 'INVALID_LIFECYCLE_STATUS' }, { status: 409 })
  }
  if (mode === 'liquidation' && status !== 'active' && status !== 'liquidation') {
    return NextResponse.json({ error: 'Tasfiye yalnizca aktif veya tasfiye halindeki sirketlerde acilabilir.', code: 'INVALID_LIFECYCLE_STATUS' }, { status: 409 })
  }
  if (mode === 'deregistration' && status !== 'liquidation') {
    return NextResponse.json({ error: 'Terkin yalnizca tasfiye halindeki sirketlerde acilabilir.', code: 'INVALID_LIFECYCLE_STATUS' }, { status: 409 })
  }
  return null
}

function validateRequiredPayload(mode: WizardMode, payload: Record<string, any>) {
  const required = mode === 'opening'
    ? ['foundation_date', 'registration_date']
    : mode === 'liquidation'
      ? ['liquidation_decision_date', 'liquidation_start_date']
      : ['liquidation_completion_decision_date', 'deregistration_registration_date']
  const missing = required.filter(field => !payload[field])
  if (!missing.length) return null
  return NextResponse.json({
    error: `Eksik zorunlu alan: ${missing.join(', ')}`,
    code: 'VALIDATION_FAILED',
    details: { fieldErrors: Object.fromEntries(missing.map(field => [field, ['Zorunlu alan']])) },
  }, { status: 400 })
}

function validateOpeningNaceCodes(rows: OpeningNacePayloadRow[]) {
  if (rows.length === 0) {
    return NextResponse.json({
      error: 'En az 1 NACE kodu seçilmelidir.',
      code: 'VALIDATION_FAILED',
      details: { fieldErrors: { nace_codes: ['En az 1 NACE kodu seçilmelidir.'] } },
    }, { status: 400 })
  }

  if (rows.length > 5) {
    return NextResponse.json({
      error: 'En fazla 5 NACE kodu seçilebilir.',
      code: 'VALIDATION_FAILED',
      details: { fieldErrors: { nace_codes: ['En fazla 5 NACE kodu seçilebilir.'] } },
    }, { status: 400 })
  }

  const primaryCount = rows.filter(row => row.is_primary).length
  if (primaryCount !== 1) {
    return NextResponse.json({
      error: 'Tam olarak 1 birincil NACE kodu seçilmelidir.',
      code: 'VALIDATION_FAILED',
      details: { fieldErrors: { nace_codes: ['Tam olarak 1 birincil NACE kodu seçilmelidir.'] } },
    }, { status: 400 })
  }

  return null
}

function normalizeOpeningNaceCodes(value: unknown): OpeningNacePayloadRow[] {
  const rows = Array.isArray(value) ? value : []
  const seen = new Set<string>()
  const normalized = rows
    .map((row: any) => {
      const naceCodeId = String(row?.nace_code_id || row?.naceCodeId || row?.nace_code?.id || '').trim()
      if (!naceCodeId || seen.has(naceCodeId)) return null
      seen.add(naceCodeId)
      return {
        nace_code_id: naceCodeId,
        is_primary: row?.is_primary === true || row?.isPrimary === true,
      }
    })
    .filter((row): row is OpeningNacePayloadRow => !!row)
    .slice(0, 5)

  if (normalized.length === 0) return []
  const primaryIndex = normalized.findIndex(row => row.is_primary)
  return normalized.map((row, index) => ({
    ...row,
    is_primary: primaryIndex >= 0 ? index === primaryIndex : index === 0,
  }))
}

async function syncOpeningNaceCodes(
  supabase: Supabase,
  companyId: string,
  rows: OpeningNacePayloadRow[],
  userId: string | null,
  tenantContext: TenantContext
) {
  const validation = validateOpeningNaceCodes(rows)
  if (validation) return validation

  const selectedIds = rows.map(row => row.nace_code_id)
  const selectedSet = new Set(selectedIds)
  const primaryRow = rows.find(row => row.is_primary)

  const { data: naceCodes, error: naceError } = await supabase
    .from('nace_codes')
    .select('id,nace_code,hazard_class')
    .in('id', selectedIds)
    .eq('is_active', true)

  if (naceError) {
    if (isMissingTableError(naceError)) {
      return NextResponse.json({ error: 'NACE referans tablosu bulunamadı.', code: 'NACE_REFERENCE_MISSING' }, { status: 500 })
    }
    return NextResponse.json({ error: naceError.message, code: naceError.code || 'NACE_REFERENCE_FAILED' }, { status: 500 })
  }

  if ((naceCodes || []).length !== selectedIds.length) {
    return NextResponse.json({
      error: 'Seçilen NACE kodlarından biri aktif referans listesinde bulunamadı.',
      code: 'NACE_REFERENCE_INVALID',
    }, { status: 400 })
  }

  let existingQuery = supabase
    .from('company_nace_codes')
    .select('id,nace_code_id,status,is_deleted')
    .eq('company_id', companyId)
  existingQuery = applyTenantQueryScope(existingQuery, 'company_nace_codes', tenantContext)
  const { data: existingRows, error: existingError } = await existingQuery

  if (existingError) {
    if (isMissingTableError(existingError)) return null
    return NextResponse.json({ error: existingError.message, code: existingError.code || 'COMPANY_NACE_FETCH_FAILED' }, { status: 500 })
  }

  const existing = existingRows || []
  const activeUnselectedIds = existing
    .filter(row => !row.is_deleted && row.status !== 'passive' && !selectedSet.has(row.nace_code_id))
    .map(row => row.id)

  if (activeUnselectedIds.length > 0) {
    let passivateQuery = supabase
      .from('company_nace_codes')
      .update({
        status: 'passive',
        is_deleted: true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .in('id', activeUnselectedIds)
    passivateQuery = applyTenantQueryScope(passivateQuery, 'company_nace_codes', tenantContext)
    const { error } = await passivateQuery

    if (error) return NextResponse.json({ error: error.message, code: error.code || 'COMPANY_NACE_PASSIVATE_FAILED' }, { status: 500 })
  }

  for (const row of rows) {
    const matching = existing.find(existingRow => existingRow.nace_code_id === row.nace_code_id)
    if (matching) {
      let updateQuery = supabase
        .from('company_nace_codes')
        .update({
          is_primary: row.is_primary,
          status: 'active',
          is_deleted: false,
          end_date: null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matching.id)
      updateQuery = applyTenantQueryScope(updateQuery, 'company_nace_codes', tenantContext)
      const { error } = await updateQuery

      if (error) return NextResponse.json({ error: error.message, code: error.code || 'COMPANY_NACE_UPDATE_FAILED' }, { status: 500 })
      continue
    }

    const { error } = await supabase
      .from('company_nace_codes')
      .insert(withTenantInsertScopeForTable({
        company_id: companyId,
        nace_code_id: row.nace_code_id,
        is_primary: row.is_primary,
        status: 'active',
        start_date: new Date().toISOString().slice(0, 10),
        created_by: userId,
        updated_by: userId,
      }, 'company_nace_codes', tenantContext))

    if (error) return NextResponse.json({ error: error.message, code: error.code || 'COMPANY_NACE_INSERT_FAILED' }, { status: 500 })
  }

  const primaryCode = (naceCodes || []).find(code => code.id === primaryRow?.nace_code_id)
  if (primaryCode) {
    const { error } = await supabase.from('company_public_sgk').upsert({
      ...withTenantInsertScopeForTable({
        company_id: companyId,
        nace_code: primaryCode.nace_code || null,
        risk_class: primaryCode.hazard_class || null,
        updated_at: new Date().toISOString(),
      }, 'company_public_sgk', tenantContext),
    }, { onConflict: 'company_id' })

    if (error && !isMissingTableError(error)) {
      return NextResponse.json({ error: error.message, code: error.code || 'PRIMARY_NACE_SYNC_FAILED' }, { status: 500 })
    }
  }

  return null
}

async function syncOpeningCompanyIdentity(
  supabase: Supabase,
  companyId: string,
  payload: Record<string, any>,
  userId: string | null,
  rpcData: any,
  tenantContext: TenantContext
) {
  const updates: Record<string, any> = {}
  const tradeName = String(payload.trade_name || '').trim()

  if (tradeName) updates.trade_name = tradeName
  if (Object.prototype.hasOwnProperty.call(payload, 'short_name')) {
    updates.short_name = String(payload.short_name || '').trim() || null
  }

  if (Object.keys(updates).length === 0) return rpcData

  let updateQuery = supabase
    .from('companies')
    .update({
      ...updates,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', companyId)
    .select('id,short_name,trade_name,updated_at')
  updateQuery = applyTenantQueryScope(updateQuery, 'companies', tenantContext)
  const { data: company, error } = await updateQuery.single()

  if (error) {
    return NextResponse.json({
      error: error.message,
      code: error.code || 'COMPANY_IDENTITY_SYNC_FAILED',
    }, { status: 500 })
  }

  if (rpcData?.company && company) {
    return { ...rpcData, company: { ...rpcData.company, ...company } }
  }

  return rpcData
}

function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')
}

function modeErrorCode(mode: WizardMode) {
  if (mode === 'opening') return 'OPENING_WIZARD_FAILED'
  if (mode === 'liquidation') return 'LIQUIDATION_WIZARD_FAILED'
  return 'DEREGISTRATION_WIZARD_FAILED'
}

function lifecycleErrorStatus(message: string) {
  if (message.includes('COMPANY_NOT_FOUND')) return 404
  if (message.includes('COMPANY_NOT_IN_LIQUIDATION') || message.includes('COMPANY_ALREADY_DEREGISTERED')) return 409
  return 500
}

function normalizeLifecycleError(message: string) {
  if (message.includes('COMPANY_NOT_FOUND')) return 'Sirket bulunamadi.'
  if (message.includes('COMPANY_ALREADY_DEREGISTERED')) return 'Terkin edilmis sirketlerde yeni operasyon baslatilamaz.'
  if (message.includes('COMPANY_NOT_IN_LIQUIDATION')) return 'Terkin islemi icin sirketin tasfiye halinde olmasi gerekir.'
  if (message.includes('function') && message.includes('does not exist')) return 'Sirket yasam dongusu migration fonksiyonlari uygulanmamis.'
  return message
}
