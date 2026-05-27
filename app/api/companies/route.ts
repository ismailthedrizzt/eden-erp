// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: companies
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies
// LEGACY_FALLBACK_REMOVE_AFTER: Python company projections and create/update operations are verified with staging data.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { getServerResponseCache, serverListCacheKey, setServerResponseCache } from '@/lib/api/serverResponseCache'
import { safeCreateRecord, safeCrudResponse } from '@/lib/crud/safeCrudService'
import { listProjectionRecords, projectionResponseMeta } from '@/lib/read-models/listProjection.server'
import { companyListProjection } from '@/lib/read-models/moduleListProjectionConfig'
import { extractCompanyLogoVariants } from '@/lib/media/companyLogo'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext } from '@/lib/tenancy/server'
import {
  ensureTenantCompanyScope,
  fetchScopedCompanyIds,
  findOwnedCompanyScopeByOrganization,
  findTenantCompanyByTaxNumber,
  getTenantCompanyScope,
} from '@/lib/tenancy/companyScopes'
import { requirePermission } from '@/lib/security/serverPermissions'
import { DEFAULT_FISCAL_YEAR_START, isValidFiscalYearStart, parseFiscalYearStartStorage } from '@/lib/companies/fiscalYear'
import { attachCompanyOrganization, runCompanyCreateSideEffects } from '@/lib/modules/companies/companyCreateOrchestrator'
import { hydrateMasterContact } from '@/lib/identity/masterContact'
import { isMissingTableError } from '@/lib/modules/companies/companyErrors'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

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
  postal_code: z.string().optional(),
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
  activity_subject: z.string().optional(),
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
  const fastApiResponse = await proxyToFastApi(request, '/api/v1/companies')
  if (fastApiResponse) return fastApiResponse

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
  const effectiveListQuery = { ...listQuery, search: ara || listQuery.search }

  const scopedCompanyIds = await fetchScopedCompanyIds(supabase, tenantContext.tenantId)
  if (!scopedCompanyIds.length) {
    const payload = { data: [], meta: listMeta(effectiveListQuery, 0), projection: { name: companyListProjection.sourceName, version: companyListProjection.version } }
    setServerResponseCache(cacheKey, payload, 60_000)
    return NextResponse.json(payload)
  }

  const projectionResult = await listProjectionRecords({
    supabase,
    request,
    projectionKey: companyListProjection.key,
    permissionKey: 'companies.view',
    listQuery: effectiveListQuery,
    query: query => applyCompanyStatusFilters(query.in('id', scopedCompanyIds), effectiveListQuery.statuses, !!effectiveListQuery.includePassive),
  })

  if (projectionResult.ok) {
    const { meta, projection } = projectionResponseMeta(projectionResult.meta)
    const payload = { data: projectionResult.data, meta, projection }
    setServerResponseCache(cacheKey, payload, 60_000)
    return NextResponse.json(payload)
  }

  if (!isMissingTableError({ code: projectionResult.code, message: projectionResult.error })) {
    return safeCrudResponse(projectionResult)
  }

  const { from, to } = listRange(effectiveListQuery)
  const sortColumn = sortMap[effectiveListQuery.sort || ''] || 'short_name'
  let query = supabase
    .from('companies')
    .select('id,organization_id,short_name,trade_name,tax_number,tax_office,company_type,city,district,postal_code,phone,email,logo_url,is_deleted,record_status,company_status,committed_capital_amount,paid_capital_amount,default_currency,updated_at,created_at,version', { count: 'exact' })
    .in('id', scopedCompanyIds)
    .order(sortColumn, { ascending: effectiveListQuery.direction !== 'desc' })
    .range(from, to)

  query = applyTenantQueryScope(query, 'companies', tenantContext)

  query = applyCompanyStatusFilters(query, effectiveListQuery.statuses, !!effectiveListQuery.includePassive)

  const searchTerm = String(ara || '').replace(/[%(),]/g, '').trim()
  if (searchTerm) {
    query = query.or(['short_name', 'trade_name', 'tax_number'].map(field => `${field}.ilike.%${searchTerm}%`).join(','))
  }

  const { data, error, count } = await query

  if (error) {
    if (error.message.includes("Could not find the table 'public.companies'")) {
      return NextResponse.json({
        data: [],
        meta: listMeta(effectiveListQuery, 0),
        warning: 'Sirket kayit alanlari hazir degil. Kurulum ekranindan Sirketlerimiz modulunu tamamlayin.'
      })
    }

    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  const rows = await hydrateCompanyLogoUrls(supabase, (data || []) as Record<string, any>[], tenantContext)
  const payload = { data: rows, meta: listMeta(effectiveListQuery, count || 0) }
  setServerResponseCache(cacheKey, payload, 60_000)
  return NextResponse.json(payload)
}

export async function POST(request: NextRequest) {
  const fastApiResponse = await proxyToFastApi(request, '/api/v1/companies')
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'companies.edit')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const rawBody = await request.json()
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const body = omitNullishValues(stripOperationControlFields(rawBody))
  const parsed = SirketSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: tenantContext.tenantId,
    moduleKey: 'sirket',
    entityType: 'company',
    operationType: 'company.create',
    clientRequestId,
    baseVersion: resolveBaseVersion(rawBody),
    baseUpdatedAt: resolveBaseUpdatedAt(rawBody),
    requestedBy: permission.userId,
    payload: parsed.data,
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOperationResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return NextResponse.json({ error: operationCreate.error, code: operationCreate.code || 'OPERATION_REQUEST_FAILED' }, { status: 500 })
  }
  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)

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
    select: 'id,organization_id,short_name,trade_name,tax_number,tax_office,company_type,city,district,postal_code,logo_url,is_deleted,record_status,company_status,committed_capital_amount,paid_capital_amount,updated_at,created_at,tenant_id,country,version',
  })
  if (existingTenantCompany?.id) {
    const currentScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, existingTenantCompany.id)
    if (currentScope) {
      if (operation) {
        await operationService.markFailed(operation.id, {
          message: 'Bu VKN ile kayıtlı şirket zaten Şirketlerimiz listesinde bulunuyor.',
          code: 'COMPANY_ALREADY_IN_WORKSPACE',
          details: { company_id: existingTenantCompany.id, tax_number: companyData.tax_number },
        })
      }
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

    const completedOperation = operation
      ? await operationService.markCompleted(operation.id, { data: existingTenantCompany })
      : null
    await new OutboxEventService(supabase as any).enqueue({
      tenantId: tenantContext.tenantId,
      companyId: existingTenantCompany.id,
      moduleKey: 'sirket',
      eventType: 'company.scope_attached',
      aggregateType: 'company',
      aggregateId: existingTenantCompany.id,
      operationId: completedOperation?.id || operation?.id || null,
      payload: { company_id: existingTenantCompany.id },
    }).catch(() => null)

    return NextResponse.json({
      data: existingTenantCompany,
      ...(completedOperation ? {
        operation_id: completedOperation.id,
        operation_status: completedOperation.operation_status,
        message: operationStatusMessage(completedOperation.operation_status),
      } : {}),
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
    })
  } catch (error) {
    if (operation) {
      await operationService.markFailed(operation.id, {
        message: error instanceof Error ? error.message : 'Şirket ana kurum kaydına bağlanamadı',
        code: 'MASTER_ORGANIZATION_LINK_FAILED',
      })
    }
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
    select: 'id,short_name,trade_name,tax_number,logo_url,hero_images,is_deleted,record_status,company_status,committed_capital_amount,paid_capital_amount,postal_code,updated_at,version',
  })

  if (!createResult.ok) {
    if (operation) {
      await operationService.markFailed(operation.id, {
        message: createResult.error,
        code: createResult.code,
        details: createResult.details,
      })
    }
    return safeCrudResponse(createResult)
  }
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

  const sideEffects = await runCompanyCreateSideEffects({
    supabase,
    companyId: data.id,
    companyRow,
    organizationMasterData,
    tenantContext,
    entityBankAccounts: entity_bank_accounts,
    partners,
    representatives,
    publicData: {
      public_tax,
      public_sgk,
      public_incentives,
      public_registry,
      public_licenses,
      public_channels,
    },
  })

  const warnings = [
    ...(ownerScope ? ['Bu VKN ile tüzel kimlik daha önce kaydedilmiş. Bu tenant için ayrı bir şirket profili açıldı; özel bilgiler tenant içinde kalır.'] : []),
    ...sideEffects.warnings.map(warning => warning.message),
  ]

  const hydratedData = companyRow.organization_id
    ? await hydrateMasterContact(supabase, 'organization', { ...companyRow, ...data })
    : data
  const completedOperation = operation
    ? await operationService.markCompleted(operation.id, { data: hydratedData }, warnings)
    : null
  await new OutboxEventService(supabase as any).enqueue({
    tenantId: tenantContext.tenantId,
    companyId: data.id,
    moduleKey: 'sirket',
    eventType: 'company.created',
    aggregateType: 'company',
    aggregateId: data.id,
    operationId: completedOperation?.id || operation?.id || null,
    payload: { company_id: data.id },
  }).catch(() => null)

  return NextResponse.json({
    data: hydratedData,
    ...(completedOperation ? {
      operation_id: completedOperation.id,
      operation_status: completedOperation.operation_status,
      message: operationStatusMessage(completedOperation.operation_status),
    } : {}),
    ...(warnings.length ? { warning: warnings.join(' '), partial_warnings: sideEffects.warnings } : {}),
  }, { status: 201 })
}

function duplicateOperationResponse(operation: { id: string; operation_status: string; result_json?: any; error_json?: any }) {
  if (operation.operation_status === 'completed') {
    return NextResponse.json({
      ok: true,
      data: operation.result_json?.data || operation.result_json,
      operation_id: operation.id,
      operation_status: operation.operation_status,
      message: operationStatusMessage('completed'),
    })
  }

  if (operation.operation_status === 'failed') {
    return NextResponse.json({
      ok: false,
      error: operation.error_json?.message || operation.error_json?.error || 'İşlem tamamlanamadı.',
      code: operation.error_json?.code || 'OPERATION_FAILED',
      operation_id: operation.id,
      operation_status: operation.operation_status,
      message: operationStatusMessage('failed'),
    }, { status: 409 })
  }

  return NextResponse.json({
    ok: true,
    operation_id: operation.id,
    operation_status: operation.operation_status,
    message: operationStatusMessage(operation.operation_status as any),
  }, { status: 202 })
}
