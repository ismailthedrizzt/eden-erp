import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { parseListQuery } from '@/lib/api/listEndpoint'
import { safeCreateRecord, safeCrudResponse, safeListRecords } from '@/lib/crud/safeCrudService'
import { listProjectionRecords, projectionResponseMeta } from '@/lib/read-models/listProjection.server'
import { companyPartnerListProjection } from '@/lib/read-models/moduleListProjectionConfig'
import { ensureUniqueRoleMaster, roleUniquenessResponse } from '@/lib/identity/roleUniqueness'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { findGlobalOrganizationByIdentity, getTenantCompanyScope, normalizeLegalCountry, normalizeLegalTaxNumber } from '@/lib/tenancy/companyScopes'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTableError } from '@/lib/modules/companies/companyErrors'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { duplicateOperationJsonResponse } from '@/lib/operations/apiResponse'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { stripOperationControlledFields as stripFieldControlFields } from '@/lib/field-controls/fieldControlGuards'

type PartnerStatusFilter = 'draft' | 'active' | 'passive'
const PARTNER_STATUS_FILTERS = new Set<PartnerStatusFilter>(['draft', 'active', 'passive'])

const partnerKindSchema = z.preprocess(
  value => value === 'company' || value === 'sirket' || value === 'şirket' ? 'organization' : value,
  z.enum(['person', 'organization'])
)

const PartnerSchema = z.object({
  company_id: z.string().uuid().optional(),  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  partner_type: partnerKindSchema.default('person'),
  owner_kind: partnerKindSchema.optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  trade_name: z.string().optional(),
  short_name: z.string().optional(),
  identity_number: z.string().optional(),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  nationality_country: z.string().optional(),
  nationality: z.string().optional(),  national_id: z.string().optional(),  passport_no: z.string().optional(),  share_ratio: z.coerce.number().min(0).max(100).optional().nullable(),
  voting_ratio: z.coerce.number().min(0).max(100).optional(),
  profit_ratio: z.coerce.number().min(0).max(100).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
  has_representation_right: z.boolean().default(false),
  has_control_right: z.boolean().default(false),
  control_type: z.enum(['Hisse Çoğunluğu', 'Oy Çoğunluğu', 'Sözleşmesel Kontrol', 'Yönetim Kontrolü', 'Altın Hisse', 'Diğer']).optional(),
  has_board_nomination_right: z.boolean().default(false),
  has_veto_right: z.boolean().default(false),
  has_privileged_share: z.boolean().default(false),
  beneficial_owner: z.boolean().default(false),
  is_beneficial_owner: z.boolean().default(false),
  beneficial_ratio: z.coerce.number().min(0).max(100).optional(),
  is_ultimate_controller: z.boolean().default(false),
  photo_logo: z.array(z.record(z.any())).optional(),
  partner_documents: z.array(z.record(z.any())).optional(),
  birth_date: z.string().optional(),
  birth_place: z.string().optional(),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  is_illiterate: z.boolean().optional(),
  education_schools: z.array(z.record(z.any())).optional(),
  foreign_languages: z.array(z.record(z.any())).optional(),
  certificates: z.array(z.record(z.any())).optional(),
  relatives: z.array(z.record(z.any())).optional(),
  marital_status: z.string().optional(),  foundation_date: z.string().optional(),
  company_type: z.string().optional(),
  mersis_number: z.string().optional(),
  trade_registry_no: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  phones: z.array(z.record(z.any())).optional(),
  emails: z.array(z.record(z.any())).optional(),
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
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  country: z.string().optional(),emergency_contact_first_name: z.string().optional(),
  emergency_contact_last_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  share_units: z.coerce.number().optional(),
  nominal_value: z.coerce.number().optional(),
  capital_amount: z.coerce.number().optional(),
  share_class: z.string().optional(),
  has_privilege: z.boolean().default(false),
  capital_increase_history: z.string().optional(),
  is_representative: z.boolean().default(false),
  is_signature_authorized: z.boolean().default(false),
  is_board_member: z.boolean().default(false),
  has_purchase_authority: z.boolean().default(false),
  has_payment_approval_authority: z.boolean().default(false),
  tax_number: z.string().optional(),
  tax_office: z.string().optional(),
  e_invoice_status: z.boolean().default(false),
  notes: z.string().optional(),
  timeline: z.array(z.record(z.any())).optional(),
  entity_bank_accounts: z.array(z.record(z.any())).optional(),
  record_status: z.enum(['draft', 'active', 'passive']).optional(),
})

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

function stripPartnerCreateOperationControlledFields(body: Record<string, any>) {
  return stripFieldControlFields('company_partner', body)
}

function normalizePartnerStatusFilters(statuses?: string[]) {
  return (statuses || []).filter((status): status is PartnerStatusFilter =>
    PARTNER_STATUS_FILTERS.has(status as PartnerStatusFilter)
  )
}

function applyPartnerStatusFilters(query: any, statuses: PartnerStatusFilter[]) {
  if (!statuses.length) return query

  const hasDraft = statuses.includes('draft')
  const hasActive = statuses.includes('active')
  const hasPassive = statuses.includes('passive')

  if (hasDraft && hasActive && hasPassive) return query
  if (hasDraft && hasActive && !hasPassive) return query.neq('record_status', 'passive').eq('is_deleted', false)
  if (hasDraft && !hasActive && !hasPassive) return query.eq('record_status', 'draft').eq('is_deleted', false)
  if (!hasDraft && hasActive && !hasPassive) return query.eq('record_status', 'active').eq('is_deleted', false)
  if (!hasDraft && !hasActive && hasPassive) return query.or('record_status.eq.passive,is_deleted.eq.true')

  const clauses: string[] = []
  if (hasDraft) clauses.push('and(record_status.eq.draft,is_deleted.eq.false)')
  if (hasActive) clauses.push('and(record_status.eq.active,is_deleted.eq.false)')
  if (hasPassive) clauses.push('record_status.eq.passive', 'is_deleted.eq.true')

  return clauses.length ? query.or(clauses.join(',')) : query.neq('record_status', 'passive').eq('is_deleted', false)
}

async function validatePartnerCompanyForCreate(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string | undefined,
  tenantContext: TenantContext
) {
  if (!companyId) {
    return NextResponse.json({
      error: 'Ortak kaydı oluşturmak için önce ortağı olduğu aktif şirketi seçmelisiniz.',
      code: 'PARTNER_COMPANY_REQUIRED',
      details: { fieldErrors: { company_id: ['Ortağı Olduğu Şirket zorunludur'] } },
    }, { status: 400 })
  }

  const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
  if (!scope) {
    return NextResponse.json({
      error: 'Seçilen şirket Şirketlerimiz listesinde bulunamadı veya erişiminiz yok.',
      code: 'PARTNER_COMPANY_NOT_IN_SCOPE',
      details: { fieldErrors: { company_id: ['Erişilebilir bir şirket seçin'] } },
    }, { status: 404 })
  }

  let query = supabase
    .from('companies')
    .select('id,record_status,company_status,is_deleted')
    .eq('id', companyId)
  query = applyTenantQueryScope(query, 'companies', tenantContext)
  const { data: company, error } = await query.maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code || 'PARTNER_COMPANY_FETCH_FAILED' }, { status: 500 })
  }

  if (!company || !isCompanyActiveForPartnerCreate(company)) {
    return NextResponse.json({
      error: 'Seçilen şirket aktif durumda olmadığı için bu şirkete yeni ortak eklenemez.',
      code: 'PARTNER_COMPANY_NOT_ACTIVE',
      details: { fieldErrors: { company_id: ['Yalnızca aktif şirket seçilebilir'] } },
    }, { status: 409 })
  }

  return null
}

function isCompanyActiveForPartnerCreate(company: Record<string, any>) {
  if (company.is_deleted) return false
  const recordStatus = String(company.record_status || '').trim().toLocaleLowerCase('tr-TR')
  const companyStatus = String(company.company_status || '').trim().toLocaleLowerCase('tr-TR')
  const activeValues = new Set(['active', 'opened'])
  if (recordStatus && !activeValues.has(recordStatus)) return false
  if (companyStatus && !activeValues.has(companyStatus)) return false
  return activeValues.has(recordStatus || companyStatus || 'active')
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'created_at', direction: 'desc' })
  const statusFilters = normalizePartnerStatusFilters(listQuery.statuses)
  const sortMap: Record<string, string> = {
    display_name: 'display_name',
    partner_name: 'partner_name',
    identity_number: 'identity_number',
    share_ratio: 'share_ratio',
    voting_ratio: 'voting_ratio',
    profit_ratio: 'profit_ratio',
    status: 'status',
    record_status: 'record_status',
    created_at: 'created_at',
  }
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')
  const projectionResult = await listProjectionRecords({
    supabase,
    request,
    projectionKey: companyPartnerListProjection.key,
    permissionKey: ['partners.view', 'companies.view'],
    listQuery,
    filters: {
      ...(companyId ? { company_id: companyId } : {}),
      ...(status ? { status } : {}),
    },
    query: statusFilters.length ? query => applyPartnerStatusFilters(query, statusFilters) : undefined,
  })

  if (projectionResult.ok) {
    const { meta, projection } = projectionResponseMeta(projectionResult.meta)
    return NextResponse.json({ data: projectionResult.data, meta, projection })
  }

  if (!isMissingTableError({ code: projectionResult.code, message: projectionResult.error })) {
    return safeCrudResponse(projectionResult)
  }

  const tenantContext = resolveTenantContext(request)
  const result = await safeListRecords({
    supabase,
    request,
    tableName: 'company_partners',
    permissionKey: ['partners.view', 'companies.view'],
    select: 'id,company_id,person_id,organization_id,owner_kind,partner_type,display_name,partner_name,identity_number,identity_tax_number,share_ratio,voting_ratio,profit_ratio,start_date,end_date,status,record_status,is_deleted,source_type,source_id,created_at,updated_at,version',
    listQuery,
    sortMap,
    defaultSort: 'created_at',
    passiveField: statusFilters.length ? undefined : 'record_status',
    passiveValue: 'passive',
    searchFields: ['display_name', 'partner_name', 'identity_number', 'identity_tax_number'],
    filters: {
      ...(companyId ? { company_id: companyId } : {}),
      ...(status ? { status } : {}),
    },
    query: statusFilters.length ? query => applyPartnerStatusFilters(query, statusFilters) : undefined,
    afterList: async ({ rows }) => {
      const companyIds = Array.from(new Set(rows.map(row => row.company_id).filter(Boolean)))
      const partnerIds = Array.from(new Set(rows.map(row => row.id).filter(Boolean)))
      if (!companyIds.length || !partnerIds.length) return rows

      let ownershipQuery = supabase
        .from('v_current_ownership')
        .select('company_id,partner_id,display_name,current_share_ratio,current_voting_ratio,current_profit_ratio,current_capital_amount,current_share_units,has_control_right,control_type,has_veto_right,has_board_nomination_right,has_privileged_share,is_beneficial_owner,beneficial_ratio,warnings')
        .in('company_id', companyIds)
        .in('partner_id', partnerIds)
      ownershipQuery = applyTenantQueryScope(ownershipQuery, 'v_current_ownership', tenantContext)
      const { data: ownershipRows, error } = await ownershipQuery
      if (error) return rows

      const ownershipByKey = new Map((ownershipRows || []).map((row: Record<string, any>) => [`${row.company_id || ''}::${row.partner_id || ''}`, row]))
      return rows.map(row => {
        const ownership = ownershipByKey.get(`${row.company_id || ''}::${row.id || ''}`)
        if (!ownership) return row
        return {
          ...row,
          current_ownership: ownership,
          current_share_ratio: ownership.current_share_ratio,
          current_voting_ratio: ownership.current_voting_ratio,
          current_profit_ratio: ownership.current_profit_ratio,
          current_capital_amount: ownership.current_capital_amount,
          current_share_units: ownership.current_share_units,
        }
      })
    },
  })

  return safeCrudResponse(result)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'partners.edit')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const rawBody = await request.json()
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const body = omitNullishValues(stripPartnerCreateOperationControlledFields(stripOperationControlFields(rawBody)))
  const parsed = PartnerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }
  const missingPartnerFields = getMissingPartnerFields(parsed.data)
  if (missingPartnerFields.length > 0) {
    return NextResponse.json({
      error: 'Eksik zorunlu ortak alanı',
      code: 'VALIDATION_FAILED',
      details: { fieldErrors: Object.fromEntries(missingPartnerFields.map(field => [field, ['Zorunlu alan']])) },
    }, { status: 400 })
  }
  const companyValidation = await validatePartnerCompanyForCreate(supabase, parsed.data.company_id, tenantContext)
  if (companyValidation) return companyValidation

  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: tenantContext.tenantId,
    companyId: parsed.data.company_id || null,
    moduleKey: 'sirket',
    entityType: 'company_partner',
    operationType: 'partner.create',
    clientRequestId,
    requestedBy: permission.userId,
    payload: parsed.data,
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOperationJsonResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return NextResponse.json({ error: operationCreate.error, code: operationCreate.code || 'OPERATION_REQUEST_FAILED' }, { status: 500 })
  }
  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)

  const row = await attachPartnerIdentity(supabase, parsed.data, mapPartnerCardForDb(parsed.data), tenantContext)
  const uniqueness = await ensureUniqueRoleMaster(supabase as any, {
    tableName: 'company_partners',
    identity: row,
    tenantContext,
  })
  if (!uniqueness.ok) {
    if (operation) await operationService.markFailed(operation.id, {
      code: uniqueness.code || 'ROLE_DUPLICATE',
      error: uniqueness.error || 'Role kaydi benzersiz degil.',
      details: uniqueness,
    })
    return roleUniquenessResponse(uniqueness)
  }

  const createResult = await safeCreateRecord({
    supabase,
    request,
    tableName: 'company_partners',
    permissionKey: ['partners.edit', 'companies.edit'],
    values: row,
    select: '*',
  })
  if (!createResult.ok) {
    if (operation) await operationService.markFailed(operation.id, {
      code: createResult.code,
      error: createResult.error,
      details: createResult.details,
    })
    return NextResponse.json({
      error: createResult.error,
      code: createResult.code,
      details: createResult.details,
      ...(operation ? {
        operation_id: operation.id,
        operation_status: 'failed',
        message: operationStatusMessage('failed'),
      } : {}),
    }, { status: createResult.status })
  }

  const data = createResult.data
  await supabase.from('partner_ownership_lifecycle_events').insert(withTenantInsertScopeForTable({
    partner_id: data.id,
    company_id: data.company_id || data.company_id || null,
    event_type: 'created_as_draft',
    old_record_status: null,
    new_record_status: data.record_status || 'draft',
    payload_json: { source: 'partners_page' },
  }, 'partner_ownership_lifecycle_events', tenantContext))
  if (data?.person_id) await syncMasterContact(supabase, 'person', data.person_id, parsed.data)
  if (data?.organization_id) await syncMasterContact(supabase, 'organization', data.organization_id, parsed.data)
  if (parsed.data.entity_bank_accounts) {
    const kind = data?.person_id ? 'person' : data?.organization_id ? 'organization' : null
    const masterId = data?.person_id || data?.organization_id
    if (kind && masterId) await new EntityBankAccountsService(supabase as any).syncMany(kind, masterId, parsed.data.entity_bank_accounts, null)
  }
  const hydrated = data?.person_id
    ? await hydrateMasterContact(supabase, 'person', data)
    : data?.organization_id
      ? await hydrateMasterContact(supabase, 'organization', data)
      : data
  if (operation) {
    await operationService.markCompleted(operation.id, { id: hydrated.id, data: hydrated })
    await new OutboxEventService(supabase as any).enqueue({
      tenantId: tenantContext.tenantId,
      companyId: data.company_id || null,
      moduleKey: 'sirket',
      eventType: 'partner.created',
      aggregateType: 'company_partner',
      aggregateId: data.id,
      operationId: operation.id,
      payload: { id: data.id, company_id: data.company_id || null },
    }).catch(() => null)
  }
  return NextResponse.json({
    data: hydrated,
    ...(operation ? {
      operation_id: operation.id,
      operation_status: 'completed',
      message: operationStatusMessage('completed'),
    } : {}),
  }, { status: 201 })
}

function mapPartnerCardForDb(partner: Record<string, any>) {
  const ownerKind = normalizePartnerKind(partner.partner_type || partner.owner_kind)
  const displayName = ownerKind === 'organization'
    ? partner.trade_name || partner.short_name
    : [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim()

  return {
    company_id: partner.company_id,
    partner_name: displayName || 'Ortak',
    partner_type: ownerKind,
    identity_tax_number: partner.identity_number,
    signature_authority: false,
    owner_kind: ownerKind,
    source_type: partner.source_type || 'partners_sayfasi',
    source_id: partner.source_id || partner.person_id || partner.organization_id || null,
    display_name: displayName || 'Ortak',
    identity_number: partner.identity_number || partner.national_id || partner.national_id || partner.tax_number || partner.tax_number || partner.passport_no || partner.passport_no,
    share_ratio: null,
    voting_ratio: null,
    profit_ratio: null,
    share_class: null,
    share_units: null,
    nominal_value: null,
    capital_amount: null,
    beneficial_owner: false,
    is_beneficial_owner: false,
    beneficial_ratio: null,
    is_ultimate_controller: false,
    has_representation_right: false,
    has_control_right: false,
    control_type: null,
    has_board_nomination_right: false,
    has_veto_right: false,
    has_privileged_share: false,
    start_date: null,
    end_date: null,
    status: 'Taslak',
    record_status: 'draft',
    notes: partner.notes || null,
    history: partner.timeline || [],
    photo_logo: partner.photo_logo || [],
    partner_documents: partner.partner_documents || [],
    partner_profile: stripMasterDataForRoleProfile(partner),
  }
}

function normalizePartnerKind(value: unknown): 'person' | 'organization' {
  const text = String(value || '').trim().toLocaleLowerCase('tr-TR')
  return ['organization', 'company', 'sirket', 'şirket', 'tüzel_kisi'].includes(text) ? 'organization' : 'person'
}

function getMissingPartnerFields(partner: Record<string, any>) {
  const kind = normalizePartnerKind(partner.partner_type || partner.owner_kind)
  if (kind === 'person') {
    return [
      ['first_name', partner.first_name],
      ['last_name', partner.last_name],
      ['gender', partner.gender],
    ]
      .filter(([, value]) => !String(value || '').trim())
      .map(([field]) => field)
  }

  const missing: string[] = []
  const country = normalizeCountryId(partner.country || partner.nationality_country || 'TR')
  if (!String(partner.country || partner.nationality_country || '').trim()) missing.push('country')
  if (!String(partner.trade_name || partner.first_name || '').trim()) missing.push('trade_name')
  if (!String(partner.identity_number || partner.tax_number || partner.trade_registry_no || partner.mersis_number || '').trim()) missing.push('tax_number')
  if (country === 'TR' && !String(partner.trade_registry_no || partner.mersis_number || '').trim()) missing.push('trade_registry_no')
  return missing
}

async function attachPartnerIdentity(
  supabase: ReturnType<typeof createServiceClient>,
  partner: Record<string, any>,
  row: Record<string, any>,
  tenantContext: TenantContext
) {
  try {
    const kind = normalizePartnerKind(row.owner_kind || row.partner_type)
    if (kind === 'person') {
      if (partner.person_id) return { ...row, person_id: partner.person_id, source_type: 'master_person', source_id: partner.person_id }

      const fullName = row.display_name || [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim()
      const nationality = normalizeCountryId(partner.nationality_country || partner.nationality || partner.nationality || 'TR')
      const identityNumber = partner.identity_number || partner.national_id || partner.national_id || partner.passport_no || partner.passport_no
      const nationalId = identityNumber && String(identityNumber).length === 11 ? String(identityNumber) : null
      const passportNo = nationalId ? null : partner.passport_no || partner.passport_no || null
      let existing: Record<string, any> | null = null
      if (nationalId || passportNo) {
        let query = supabase.from('persons').select('id').eq('nationality', nationality).eq(nationalId ? 'national_id' : 'passport_no', nationalId || passportNo)
        query = applyTenantQueryScope(query, 'persons', tenantContext)
        const { data, error: findError } = await query.maybeSingle()
        if (findError) return row
        existing = data || null
      }
      const personId = existing?.id || (await supabase.from('persons').insert(withTenantInsertScopeForTable({
        first_name: partner.first_name || null,
        last_name: partner.last_name || null,
        full_name: fullName,
        nationality,
        national_id: nationalId,
        passport_no: passportNo,
        birth_date: partner.birth_date || null,
        birth_place: partner.birth_place || null,
        gender: partner.gender || partner.gender || null,
        phone: partner.phone || partner.mobile_phone || null,
        email: partner.email || null,
        address: partner.address || null,
        city: partner.city || partner.city || null,
        district: partner.district || partner.district || null,
        metadata_json: { source: 'partners_create' },
      }, 'persons', tenantContext)).select('id').single()).data?.id
      return { ...row, person_id: personId || null, source_type: 'master_person', source_id: personId || null }
    }

    const legalName = partner.trade_name || row.display_name
    if (partner.organization_id) return { ...row, organization_id: partner.organization_id, source_type: 'master_organization', source_id: partner.organization_id }

    const country = normalizeLegalCountry(partner.country || partner.nationality_country || 'TR')
    const taxNumber = normalizeLegalTaxNumber(partner.tax_number || partner.identity_number || null, country)
    const existing = await findGlobalOrganizationByIdentity(supabase, {
      country,
      taxNumber,
      legalName,
      select: 'id',
    }).catch(() => null)
    const organizationId = existing?.id || (await supabase.from('organizations').insert({
      legal_name: legalName,
      short_name: partner.short_name || null,
      country,
      tax_number: taxNumber,
      registration_number: partner.trade_registry_no || partner.mersis_number || null,
      tax_office: partner.tax_office || null,
      organization_type: partner.company_type || null,
      phone: partner.phone || partner.phone || null,
      email: partner.email || null,
      address: partner.address || null,
      city: partner.city || partner.city || null,
      district: partner.district || partner.district || null,
      metadata_json: { source: 'partners_create' },
    }).select('id').single()).data?.id
    return { ...row, organization_id: organizationId || null, source_type: 'master_organization', source_id: organizationId || null }
  } catch {
    return row
  }
}

