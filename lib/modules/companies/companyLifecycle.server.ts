import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

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

  const lifecycle = await buildCompanyLifecyclePayload(supabase, companyId)
  if (lifecycle.error) return lifecycle.error
  return NextResponse.json({ data: lifecycle.data })
}

export async function getCompanyLifecycleEvents(request: NextRequest, companyId: string) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, COMPANY_LIFECYCLE_PERMISSIONS.lifecycleView)
  if (permission instanceof NextResponse) return permission

  const events = await safeList(
    supabase,
    'company_lifecycle_events',
    'id,company_id,event_type,event_date,old_status,new_status,payload_json,document_reference_id,created_at,created_by',
    query => query.eq('company_id', companyId).order('created_at', { ascending: false })
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

  const lifecycle = await buildCompanyLifecyclePayload(supabase, companyId)
  if (lifecycle.error) return lifecycle.error
  const company = lifecycle.data.company as Record<string, any>
  const status = getCompanyStatus(company)

  const invalid = validateModeStatus(mode, status)
  if (invalid) return invalid

  const [documents, representatives, partners, stakeholders, naceCodes] = await Promise.all([
    safeCompanyDocuments(company),
    safeList(supabase, 'company_representatives', 'id,display_name,full_name,person_id,organization_id,status,is_deleted', query => query.eq('company_id', companyId)),
    safeList(supabase, 'company_partners', 'id,display_name,partner_name,person_id,organization_id,status,is_deleted', query => query.eq('company_id', companyId)),
    safeList(supabase, 'stakeholders', 'id,display_name,person_id,organization_id,status,is_deleted', query => query.eq('company_id', companyId)),
    safeList(supabase, 'company_nace_codes', 'id,nace_code_id,is_primary,status,is_deleted,nace_code:nace_codes(id,nace_code,description,hazard_class)', query => query.eq('company_id', companyId).eq('is_deleted', false)),
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

  const body = await request.json().catch(() => ({}))
  const statusError = validateRequiredPayload(mode, body)
  if (statusError) return statusError

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id,record_status,company_status,is_deleted')
    .eq('id', companyId)
    .single()
  if (companyError) {
    if (companyError.code === 'PGRST116') return NextResponse.json({ error: 'Sirket bulunamadi.', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ error: companyError.message, code: companyError.code || 'COMPANY_FETCH_FAILED' }, { status: 500 })
  }
  const invalid = validateModeStatus(mode, getCompanyStatus(company as Record<string, any>))
  if (invalid) return invalid

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

  return NextResponse.json({ data })
}

async function buildCompanyLifecyclePayload(supabase: Supabase, companyId: string) {
  const { data: company, error } = await supabase
    .from('companies')
    .select(COMPANY_CONTEXT_SELECT)
    .eq('id', companyId)
    .single()

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
    safeList(supabase, 'company_lifecycle_events', 'id,company_id,event_type,event_date,old_status,new_status,payload_json,document_reference_id,created_at,created_by', query => query.eq('company_id', companyId).order('created_at', { ascending: false }).limit(25)),
    safeMaybeSingle(supabase, 'company_public_tax', '*', query => query.eq('company_id', companyId)),
    safeMaybeSingle(supabase, 'company_public_sgk', '*', query => query.eq('company_id', companyId)),
    safeMaybeSingle(supabase, 'company_public_registry', '*', query => query.eq('company_id', companyId)),
    safeMaybeSingle(supabase, 'company_public_channels', '*', query => query.eq('company_id', companyId)),
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
