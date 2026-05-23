import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { listMeta, listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { getServerResponseCache, serverListCacheKey, setServerResponseCache } from '@/lib/api/serverResponseCache'
import { safeCreateRecord, safeCrudResponse } from '@/lib/crud/safeCrudService'
import { extractCompanyLogoVariants } from '@/lib/media/companyLogo'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import {
  ensureTenantCompanyScope,
  fetchScopedCompanyIds,
  findGlobalOrganizationByIdentity,
  findOwnedCompanyScopeByOrganization,
  findTenantCompanyByTaxNumber,
  getTenantCompanyScope,
  normalizeLegalCountry,
  normalizeLegalTaxNumber,
} from '@/lib/tenancy/companyScopes'
import { requirePermission } from '@/lib/security/serverPermissions'
import { DEFAULT_FISCAL_YEAR_START, isValidFiscalYearStart, parseFiscalYearStartStorage } from '@/lib/companies/fiscalYear'

const emptyStringToUndefined = (value: unknown) => value === '' ? undefined : value
const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional().nullable())
const optionalCompanyType = z.preprocess(
  emptyStringToUndefined,
  z.enum(['anonim', 'limited', 'komandit', 'kolektif', 'adi_komandit', 'adi_sirket']).optional()
)
const optionalRiskClass = z.preprocess(
  emptyStringToUndefined,
  z.enum(['az_tehlikeli', 'tehlikeli', 'cok_tehlikeli']).optional()
)
const optionalElectronicNotificationAddress = z.preprocess(
  emptyStringToUndefined,
  z.string().regex(/^\d{5}-\d{5}-\d{5}$/, 'Elektronik tebligat adresi 25888-57689-53086 formatinda olmalidir').optional()
)

const OptionalShortNameSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).max(120).optional()
)
const FiscalYearStartSchema = z.preprocess(
  (value) => value === '' || value === null || value === undefined
    ? undefined
    : parseFiscalYearStartStorage(value),
  z.number().int().refine(isValidFiscalYearStart, 'Mali yil baslangici ay ve gun olarak girilmelidir.')
)

const SirketSchema = z.object({
  organization_id: optionalUuid,
  trade_name: z.string().min(1).max(300),
  short_name: OptionalShortNameSchema,
  tax_number: z.string().regex(/^\d{10}$/, 'VKN 10 haneli sayı olmalıdır'),
  tax_office: z.string().min(1).max(120),
  mersis_number: z.string().optional(),
  trade_registry_number: z.string().optional(),
  foundation_date: z.string().optional(),
  company_type: optionalCompanyType,
  country: z.string().min(1).default('Türkiye'),
  city: z.string().min(1).max(120),
  district: z.string().min(1).max(120),
  address: z.string().min(1),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  website: z.string().optional(),
  legal_entity: z.string().optional(),
  electronic_notification_address: optionalElectronicNotificationAddress,
  trade_registry_office: z.string().optional(),
  parent_company_id: optionalUuid,
  company_code: z.string().optional(),
  e_invoice_taxpayer: z.boolean().default(false),
  e_archive_taxpayer: z.boolean().default(false),
  e_waybill_taxpayer: z.boolean().default(false),
  sgk_workplace_registry_no: z.string().optional(),
  sgk_province: z.string().optional(),
  sgk_branch: z.string().optional(),
  nace_codes: z.array(z.string()).optional(),
  risk_class: optionalRiskClass,
  default_currency: z.string().default('TRY'),
  default_language: z.string().default('tr'),
  time_zone: z.string().default('Europe/Istanbul'),
  fiscal_year_start: FiscalYearStartSchema.default(DEFAULT_FISCAL_YEAR_START),
  is_deleted: z.boolean().default(false),
  hero_images: z.array(z.record(z.any())).optional(),
  hero_documents: z.array(z.record(z.any())).optional(),
  contact_points: z.array(z.record(z.any())).optional(),
  beneficiary_full_name: z.string().optional(),
  beneficiary_address: z.string().optional(),
  beneficiary_iban: z.string().optional(),
  beneficiary_account_no: z.string().optional(),
  beneficiary_iban_or_account_no: z.string().optional(),
  beneficiary_bank_code: z.string().optional(),
  beneficiary_swift_bic: z.string().optional(),
  beneficiary_bank_name: z.string().optional(),
  beneficiary_bank_address: z.string().optional(),
  beneficiary_currency: z.string().optional(),
  partners: z.array(z.record(z.any())).optional(),
  representatives: z.array(z.record(z.any())).optional(),
  public_tax: z.record(z.any()).optional(),
  public_sgk: z.record(z.any()).optional(),
  public_incentives: z.record(z.any()).optional(),
  public_registry: z.record(z.any()).optional(),
  public_licenses: z.array(z.record(z.any())).optional(),
  public_channels: z.record(z.any()).optional(),
  entity_bank_accounts: z.array(z.record(z.any())).optional(),
})

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

function isMissingTableError(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || message.includes('Could not find the table')
    || message.includes('schema cache')
    || message.includes('does not exist')
}

type CompanyStatusFilter = 'draft' | 'active' | 'passive'
const COMPANY_STATUS_FILTERS = new Set<CompanyStatusFilter>(['draft', 'active', 'passive'])

function normalizeCompanyStatusFilters(statuses?: string[]) {
  return (statuses || []).filter((status): status is CompanyStatusFilter =>
    COMPANY_STATUS_FILTERS.has(status as CompanyStatusFilter)
  )
}

function applyCompanyStatusFilters(query: any, statuses: string[] | undefined, includePassive: boolean) {
  const requested = normalizeCompanyStatusFilters(statuses)
  if (!requested.length) return includePassive ? query : query.eq('is_deleted', false)

  const hasDraft = requested.includes('draft')
  const hasActive = requested.includes('active')
  const hasPassive = requested.includes('passive')

  if (hasDraft && hasActive && hasPassive) return query
  if (hasDraft && hasActive && !hasPassive) return query.eq('is_deleted', false)
  if (hasDraft && !hasActive && !hasPassive) return query.eq('is_deleted', false).eq('record_status', 'draft')
  if (!hasDraft && hasActive && !hasPassive) return query.eq('is_deleted', false).neq('record_status', 'draft')
  if (!hasDraft && !hasActive && hasPassive) return query.eq('is_deleted', true)

  const clauses: string[] = []
  if (hasDraft) clauses.push('and(is_deleted.eq.false,record_status.eq.draft)')
  if (hasActive) clauses.push('and(is_deleted.eq.false,record_status.neq.draft)')
  if (hasPassive) clauses.push('is_deleted.eq.true')

  return clauses.length ? query.or(clauses.join(',')) : query.eq('is_deleted', false)
}

function withDerivedCompanyLogo<T extends Record<string, any>>(company: T): T {
  if (!Object.prototype.hasOwnProperty.call(company, 'hero_images')) return company
  const { logoUrl } = extractCompanyLogoVariants(company.hero_images, {
    fallbackUrl: company.logo_url,
    preferThumbnail: true,
  })
  return { ...company, logo_url: logoUrl || null }
}

async function hydrateCompanyLogoUrls(
  supabase: ReturnType<typeof createServiceClient>,
  rows: Record<string, any>[],
  tenantContext: TenantContext
) {
  const rowIds = rows.map(row => row.id).filter(Boolean)

  if (!rowIds.length) return rows

  let mediaQuery = supabase
    .from('companies')
    .select('id,hero_images')
    .in('id', rowIds)

  mediaQuery = applyTenantQueryScope(mediaQuery, 'companies', tenantContext)
  const { data, error } = await mediaQuery
  if (error) return rows

  const variantsById = new Map(
    (data || [])
      .map((row: Record<string, any>) => [row.id, extractCompanyLogoVariants(row.hero_images, { preferThumbnail: true })] as const)
  )

  return rows.map(row => {
    const variants = variantsById.get(row.id)
    return {
      ...row,
      logo_url: variants?.logoUrl || row.logo_url || null,
      logo_url_light: variants?.lightLogoUrl || row.logo_url || null,
      logo_url_dark: variants?.darkLogoUrl || variants?.lightLogoUrl || row.logo_url || null,
    }
  })
}

export async function GET(request: NextRequest) {
  const cacheKey = serverListCacheKey(request, 'companies:list')
  const cached = getServerResponseCache<Record<string, unknown>>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'companies.view')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'short_name', direction: 'asc' })
  const sortMap: Record<string, string> = {
    short_name: 'short_name',
    trade_name: 'trade_name',
    tax_number: 'tax_number',
    tax_office: 'tax_office',
    company_type: 'company_type',
    is_deleted: 'is_deleted',
    lifecycle_status: 'record_status',
    record_status: 'record_status',
    company_status: 'company_status',
    mersis_number: 'mersis_number',
    trade_registry_number: 'trade_registry_number',
    foundation_date: 'foundation_date',
    updated_at: 'updated_at',
    created_at: 'created_at',
  }
  const ara = searchParams.get('ara') || listQuery.search

  const scopedCompanyIds = await fetchScopedCompanyIds(supabase, tenantContext.tenantId)
  if (!scopedCompanyIds.length) {
    const payload = { data: [], meta: listMeta(listQuery, 0) }
    setServerResponseCache(cacheKey, payload, 60_000)
    return NextResponse.json(payload)
  }

  const { from, to } = listRange(listQuery)
  const sortColumn = sortMap[listQuery.sort || ''] || 'short_name'
  let query = supabase
    .from('companies')
    .select('id,organization_id,short_name,trade_name,tax_number,tax_office,company_type,city,district,phone,email,logo_url,is_deleted,record_status,company_status,updated_at,created_at')
    .in('id', scopedCompanyIds)
    .order(sortColumn, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  query = applyTenantQueryScope(query, 'companies', tenantContext)

  query = applyCompanyStatusFilters(query, listQuery.statuses, !!listQuery.includePassive)

  const searchTerm = String(ara || '').replace(/[%(),]/g, '').trim()
  if (searchTerm) {
    query = query.or(['short_name', 'trade_name', 'tax_number'].map(field => `${field}.ilike.%${searchTerm}%`).join(','))
  }

  const { data, error } = await query

  if (error) {
    if (error.message.includes("Could not find the table 'public.companies'")) {
      return NextResponse.json({
        data: [],
        meta: listMeta(listQuery, 0),
        warning: 'companies tablosu bulunamadı. supabase/migrations/20260516_initial_schema.sql uygulanmalı.'
      })
    }

    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  const rows = await hydrateCompanyLogoUrls(supabase, (data || []) as Record<string, any>[], tenantContext)
  const payload = { data: rows, meta: listMetaFromRows(listQuery, rows.length) }
  setServerResponseCache(cacheKey, payload, 60_000)
  return NextResponse.json(payload)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'companies.edit')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const body = omitNullishValues(await request.json())
  const parsed = SirketSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const {
    partners,
    representatives,
    contact_points,
    beneficiary_full_name,
    beneficiary_address,
    beneficiary_iban,
    beneficiary_account_no,
    beneficiary_iban_or_account_no,
    beneficiary_bank_code,
    beneficiary_swift_bic,
    beneficiary_bank_name,
    beneficiary_bank_address,
    beneficiary_currency,
    public_tax,
    public_sgk,
    public_incentives,
    public_registry,
    public_licenses,
    public_channels,
    entity_bank_accounts,
    ...parsedCompanyData
  } = parsed.data
  const companyData = withDerivedCompanyLogo(parsedCompanyData)
  const organizationMasterData = {
    ...(contact_points !== undefined ? { contact_points } : {}),
    ...(beneficiary_full_name !== undefined ? { beneficiary_full_name } : {}),
    ...(beneficiary_address !== undefined ? { beneficiary_address } : {}),
    ...(beneficiary_iban !== undefined ? { beneficiary_iban } : {}),
    ...(beneficiary_account_no !== undefined ? { beneficiary_account_no } : {}),
    ...(beneficiary_iban_or_account_no !== undefined ? { beneficiary_iban_or_account_no } : {}),
    ...(beneficiary_bank_code !== undefined ? { beneficiary_bank_code } : {}),
    ...(beneficiary_swift_bic !== undefined ? { beneficiary_swift_bic } : {}),
    ...(beneficiary_bank_name !== undefined ? { beneficiary_bank_name } : {}),
    ...(beneficiary_bank_address !== undefined ? { beneficiary_bank_address } : {}),
    ...(beneficiary_currency !== undefined ? { beneficiary_currency } : {}),
  }

  const existingTenantCompany = await findTenantCompanyByTaxNumber(supabase, {
    tenantId: tenantContext.tenantId,
    country: companyData.country,
    taxNumber: companyData.tax_number,
    select: 'id,organization_id,short_name,trade_name,tax_number,tax_office,company_type,city,district,logo_url,is_deleted,record_status,company_status,updated_at,created_at,tenant_id,country',
  })
  if (existingTenantCompany?.id) {
    const currentScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, existingTenantCompany.id)
    if (currentScope) {
      return NextResponse.json({
        error: 'Bu VKN ile kayıtlı şirket zaten Şirketlerimiz listesinde bulunuyor.',
        code: 'COMPANY_ALREADY_IN_WORKSPACE',
        details: { company_id: existingTenantCompany.id, tax_number: companyData.tax_number },
      }, { status: 409 })
    }

    const ownerScope = existingTenantCompany.organization_id
      ? await findOwnedCompanyScopeByOrganization(supabase, existingTenantCompany.organization_id)
      : null
    await ensureTenantCompanyScope(supabase, {
      tenantId: tenantContext.tenantId,
      companyId: existingTenantCompany.id,
      scopeType: ownerScope ? 'managed' : 'owned',
      source: 'companies_create_existing_global',
      metadata: {
        requested_tax_number: companyData.tax_number,
        owner_tenant_id: ownerScope?.tenant_id || null,
      },
    })

    return NextResponse.json({
      data: existingTenantCompany,
      warning: ownerScope
        ? 'Bu VKN ile global şirket kaydı zaten vardı; yeni şirket açılmadı, Şirketlerimiz listesine yönetim kapsamı olarak eklendi.'
        : 'Bu VKN ile mevcut global şirket kaydı Şirketlerimiz listesine eklendi.',
    }, { status: 200 })
  }

  let companyRow: Record<string, any>
  try {
    companyRow = await attachCompanyOrganization(supabase, {
      ...companyData,
      is_deleted: false,
    }, tenantContext)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Şirket ana kurum kaydına bağlanamadı',
      code: 'MASTER_ORGANIZATION_LINK_FAILED',
    }, { status: 500 })
  }
  const ownerScope = companyRow.organization_id
    ? await findOwnedCompanyScopeByOrganization(supabase, companyRow.organization_id)
    : null
  const createResult = await safeCreateRecord({
    supabase,
    request,
    tableName: 'companies',
    permissionKey: 'companies.edit',
    values: companyRow,
    select: 'id,short_name,trade_name,tax_number,logo_url,hero_images,is_deleted,record_status,company_status,updated_at',
  })

  if (!createResult.ok) return safeCrudResponse(createResult)
  const data = createResult.data
  await ensureTenantCompanyScope(supabase, {
    tenantId: tenantContext.tenantId,
    companyId: data.id,
    scopeType: ownerScope ? 'managed' : 'owned',
    source: ownerScope ? 'companies_create_managed_profile' : 'companies_create',
    metadata: {
      organization_id: companyRow.organization_id || null,
      owner_tenant_id: ownerScope?.tenant_id || null,
    },
  })

  const organizationUnitError = await ensureCompanyRootUnit(supabase, data.id, companyRow, tenantContext)
  if (organizationUnitError) return NextResponse.json({ error: organizationUnitError.message, code: organizationUnitError.code || 'COMPANY_ORG_UNIT_SAVE_FAILED' }, { status: 500 })

  await syncMasterContact(
    supabase,
    'organization',
    companyRow.organization_id,
    { ...companyRow, ...organizationMasterData }
  )

  if (entity_bank_accounts && companyRow.organization_id) {
    await new EntityBankAccountsService(supabase as any).syncMany('organization', companyRow.organization_id, entity_bank_accounts, null)
  }

  const partnerError = await replaceCompanyPartners(supabase, data.id, partners || [], tenantContext)
  if (partnerError) return NextResponse.json({ error: partnerError.message, code: partnerError.code || 'PARTNER_SAVE_FAILED' }, { status: 500 })

  const representativeError = await replaceCompanyRepresentatives(supabase, data.id, representatives || [], tenantContext)
  if (representativeError) return NextResponse.json({ error: representativeError.message, code: representativeError.code || 'REPRESENTATIVE_SAVE_FAILED' }, { status: 500 })

  const publicError = await replaceCompanyPublicData(supabase, data.id, {
    public_tax,
    public_sgk,
    public_incentives,
    public_registry,
    public_licenses,
    public_channels,
  }, tenantContext)
  if (publicError) return NextResponse.json({ error: publicError.message, code: publicError.code || 'PUBLIC_SAVE_FAILED' }, { status: 500 })

  const lifecycleError = await insertCompanyCreatedAsDraftEvent(supabase, data.id, companyRow, tenantContext)
  if (lifecycleError && !isMissingTableError(lifecycleError)) {
    return NextResponse.json({ error: lifecycleError.message, code: lifecycleError.code || 'LIFECYCLE_EVENT_FAILED' }, { status: 500 })
  }

  return NextResponse.json({
    data,
    ...(ownerScope ? {
      warning: 'Bu VKN ile tuzel kimlik daha once kaydedilmis. Bu tenant icin ayri bir sirket profili acildi; ozel bilgiler tenant icinde kalir.',
    } : {}),
  }, { status: 201 })
}

async function insertCompanyCreatedAsDraftEvent(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  payload: Record<string, any>,
  tenantContext: TenantContext
) {
  const { error } = await supabase
    .from('company_lifecycle_events')
    .insert(withTenantInsertScopeForTable({
      company_id: companyId,
      event_type: 'company_created_as_draft',
      event_date: new Date().toISOString().slice(0, 10),
      old_status: null,
      new_status: 'draft',
      payload_json: payload,
      document_reference_id: null,
    }, 'company_lifecycle_events', tenantContext))

  return error
}

async function attachCompanyOrganization(
  supabase: ReturnType<typeof createServiceClient>,
  companyData: Record<string, any>,
  tenantContext: TenantContext
) {
  try {
    if (companyData.organization_id) return companyData

    const country = normalizeLegalCountry(companyData.country || 'TR')
    const taxNumber = normalizeLegalTaxNumber(companyData.tax_number, country)
    const existing = await findGlobalOrganizationByIdentity(supabase, {
      country,
      taxNumber,
      legalName: companyData.trade_name,
      select: 'id',
    })

    const organizationId = existing?.id || (await supabase.from('organizations').insert({
      legal_name: companyData.trade_name,
      short_name: companyData.short_name || null,
      country,
      tax_number: taxNumber,
      registration_number: companyData.trade_registry_number || companyData.mersis_number || null,
      tax_office: companyData.tax_office || null,
      organization_type: companyData.company_type || null,
      metadata_json: { source: 'companies_create' },
    }).select('id').single()).data?.id

    if (!organizationId) throw new Error('Ana kurum kaydı oluşturulamadı.')
    return { ...companyData, organization_id: organizationId }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Şirket ana kurum kaydına bağlanamadı.')
  }
}

async function ensureCompanyRootUnit(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  companyData: Record<string, any>,
  tenantContext: TenantContext
) {
  const { data: unitType, error: typeError } = await supabase
    .from('organization_unit_types')
    .upsert({ name: 'Şirket', slug: 'company', color: '#0f766e', icon: 'Building2', sort_order: 0, is_active: true }, { onConflict: 'slug' })
    .select('id')
    .single()

  if (typeError) return isMissingTableError(typeError) ? null : typeError

  const companyName = companyData.trade_name || companyData.short_name || 'Şirket'
  let existingQuery = supabase
    .from('organization_units')
    .select('id')
    .eq('company_id', companyId)
    .is('parent_unit_id', null)
    .eq('type', 'company')
    .eq('is_deleted', false)
    .limit(1)

  existingQuery = applyTenantQueryScope(existingQuery, 'organization_units', tenantContext)
  const { data: existing, error: findError } = await existingQuery.maybeSingle()

  if (findError) return isMissingTableError(findError) ? null : findError

  const payload = withTenantInsertScopeForTable({
    company_id: companyId,
    parent_unit_id: null,
    name: companyName,
    short_name: companyData.short_name || null,
    type: 'company',
    unit_type_id: unitType?.id || null,
    status: 'Aktif',
    active: true,
    is_deleted: false,
  }, 'organization_units', tenantContext)

  if (existing?.id) {
    let updateQuery = supabase.from('organization_units').update(payload).eq('id', existing.id)
    updateQuery = applyTenantQueryScope(updateQuery, 'organization_units', tenantContext)
    const { error } = await updateQuery
    return isMissingTableError(error) ? null : error
  }

  const { error } = await supabase.from('organization_units').insert(payload)
  return isMissingTableError(error) ? null : error
}

async function replaceCompanyPublicData(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  payload: {
    public_tax?: Record<string, any>
    public_sgk?: Record<string, any>
    public_incentives?: Record<string, any>
    public_registry?: Record<string, any>
    public_licenses?: Record<string, any>[]
    public_channels?: Record<string, any>
  },
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

  if (payload.public_licenses?.length) {
    const { error } = await supabase
      .from('company_public_licenses')
      .insert(payload.public_licenses.map((license) => withTenantInsertScopeForTable({
        ...cleanPublicRow(license),
        company_id: companyId,
        reminder_days: license.reminder_days ? Number(license.reminder_days) : null,
        is_deleted: !!license.is_deleted,
        deleted_at: license.deleted_at || null,
        deleted_by: license.deleted_by || null,
      }, 'company_public_licenses', tenantContext)))
    if (error) return error
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

async function replaceCompanyPartners(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  partners: Record<string, any>[],
  tenantContext: TenantContext
) {
  if (!partners.length) return null

  const { error } = await supabase
    .from('company_partners')
    .insert(partners.map(partner => withTenantInsertScopeForTable(mapPartnerForDb(companyId, partner), 'company_partners', tenantContext)))

  return error
}

function mapPartnerForDb(companyId: string, partner: Record<string, any>) {
  const displayName = partner.display_name || [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim() || partner.partner_name || 'Ortak'
  const status = partner.status || partnerStatusLabel(partner.record_status)

  return {
    company_id: companyId,    partner_name: displayName,
    partner_type: partner.owner_kind === 'organization' || partner.partner_type === 'company' ? 'company' : 'person',
    identity_tax_number: partner.identity_number || partner.identity_tax_number || null,
    share_ratio: partner.share_ratio || partner.share_ratio ? Number(partner.share_ratio ?? partner.share_ratio) : null,
    signature_authority: !!(partner.has_representation_right ?? partner.signature_authority),
    owner_kind: partner.owner_kind || (partner.partner_type === 'company' ? 'organization' : 'person'),
    source_type: partner.source_type || null,
    source_id: partner.source_id || null,
    display_name: displayName,
    identity_number: partner.identity_number || partner.identity_tax_number || null,
    share_class: partner.share_class || 'Adi Pay',
    share_units: partner.share_units ? Number(partner.share_units) : null,
    nominal_value: partner.nominal_value ? Number(partner.nominal_value) : null,
    capital_amount: partner.capital_amount ? Number(partner.capital_amount) : null,    voting_ratio: partner.voting_ratio ? Number(partner.voting_ratio) : null,
    profit_ratio: partner.profit_ratio ? Number(partner.profit_ratio) : null,
    beneficial_owner: !!partner.beneficial_owner,
    is_beneficial_owner: !!(partner.beneficial_owner || partner.is_beneficial_owner),
    beneficial_ratio: partner.beneficial_ratio ? Number(partner.beneficial_ratio) : null,
    beneficial_note: partner.beneficial_note || null,
    is_ultimate_controller: !!partner.is_ultimate_controller,
    has_representation_right: !!(partner.has_representation_right ?? partner.signature_authority),
    has_control_right: !!partner.has_control_right,
    control_type: partner.control_type || null,
    has_board_nomination_right: !!partner.has_board_nomination_right,
    has_veto_right: !!partner.has_veto_right,
    has_privileged_share: !!partner.has_privileged_share,
    start_date: partner.start_date || null,
    end_date: partner.end_date || null,
    status,
    record_status: partner.record_status || normalizePartnerRecordStatus(status),
    document_reference_id: partner.document_reference_id || null,
    notes: partner.notes || null,
    history: partner.history || [],
    is_deleted: !!partner.is_deleted,
    deleted_at: partner.deleted_at || null,
  }
}

function normalizePartnerRecordStatus(status: unknown): 'draft' | 'active' | 'passive' {
  const normalized = String(status || '').trim().toLocaleLowerCase('tr-TR')
  if (normalized === 'active' || normalized === 'aktif') return 'active'
  if (normalized === 'passive' || normalized === 'pasif') return 'passive'
  return 'draft'
}

function partnerStatusLabel(recordStatus: unknown) {
  if (recordStatus === 'active') return 'Aktif'
  if (recordStatus === 'passive') return 'Pasif'
  return 'Taslak'
}

async function replaceCompanyRepresentatives(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  representatives: Record<string, any>[],
  tenantContext: TenantContext
) {
  if (!representatives.length) return null

  const { error } = await supabase
    .from('company_representatives')
    .insert(representatives.map(representative =>
      withTenantInsertScopeForTable(mapRepresentativeForDb(companyId, representative), 'company_representatives', tenantContext)
    ))

  return error
}

function normalizeCompanyRepresentativeAuthority(value: unknown) {
  return String(value || '').trim()
}

function getCompanyRepresentativePrimaryAuthority(representative: Record<string, any>) {
  const candidates = [
    representative.job_title,
    representative.primary_authority_type,
    Array.isArray(representative.authority_types) ? representative.authority_types[0] : null,
    representative.authority_type,
  ]
  return candidates.map(normalizeCompanyRepresentativeAuthority).find(Boolean) || ''
}

function mapRepresentativeForDb(companyId: string, representative: Record<string, any>) {
  const primaryAuthority = getCompanyRepresentativePrimaryAuthority(representative)
  const authorityTypes = Array.isArray(representative.authority_types) && representative.authority_types.length
    ? representative.authority_types.map(normalizeCompanyRepresentativeAuthority).filter(Boolean)
    : [primaryAuthority].filter(Boolean)

  return {
    company_id: companyId,    full_name: representative.display_name || representative.full_name || 'Temsilci',
    job_title: primaryAuthority || null,
    authority_type: primaryAuthority || 'other',
    authority_types: authorityTypes,
    person_kind: representative.person_kind || 'person',
    source_type: representative.source_type || null,
    source_id: representative.source_id || null,
    display_name: representative.display_name || representative.full_name || null,
    start_date: representative.start_date || null,
    end_date: representative.end_date || null,
    status: representative.status || 'Aktif',
    document_reference_id: representative.document_reference_id || null,
    notes: representative.notes || null,
    bank_authority_level: representative.bank_authority_level || null,
    transaction_limit: representative.transaction_limit ? Number(representative.transaction_limit) : null,
    payment_approval_limit: representative.payment_approval_limit ? Number(representative.payment_approval_limit) : null,
    purchase_approval_limit: representative.purchase_approval_limit ? Number(representative.purchase_approval_limit) : null,
    currency: representative.currency || 'TRY',
    signature_type: representative.signature_type || null,
    signature_degree: representative.signature_degree || null,
    requires_joint_signature: !!representative.requires_joint_signature,
    can_approve_alone: !!representative.can_approve_alone,
    department_scope: representative.department_scope || null,
    gib_permissions: representative.gib_permissions || null,
    can_submit_declaration: !!representative.can_submit_declaration,
    can_process_e_invoice: !!representative.can_process_e_invoice,
    sgk_permissions: representative.sgk_permissions || null,
    can_submit_hiring_notice: !!representative.can_submit_hiring_notice,
    can_submit_termination_notice: !!representative.can_submit_termination_notice,
    history: representative.history || [],
    is_deleted: !!representative.is_deleted,
    deleted_at: representative.deleted_at || null,
  }
}
