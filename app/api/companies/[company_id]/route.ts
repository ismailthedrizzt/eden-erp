// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: companies
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}
// LEGACY_FALLBACK_REMOVE_AFTER: Python company detail projection and section adapters are verified with staging data.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import {
  safeHardDeleteDraftRecord,
  safeHardDeleteDraftRecordResponse,
  type SafeHardDeleteReferenceCheck,
} from '@/lib/workflow/safeHardDeleteDraftRecord'
import { safeCrudResponse, safeReadRecord, safeUpdateRecord } from '@/lib/crud/safeCrudService'
import { extractCompanyLogoVariants } from '@/lib/media/companyLogo'
import { requirePermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { isValidFiscalYearStart, parseFiscalYearStartStorage } from '@/lib/companies/fiscalYear'
import { isMissingTableError } from '@/lib/modules/companies/companyErrors'
import {
  fetchCompanyRelatedSection,
  relatedErrorMap,
  relatedStatusMap,
} from '@/lib/modules/companies/companyRelatedSections.server'
import { ensureCompanyRootUnit } from '@/lib/modules/companies/companyRelations.service'
import {
  getDisallowedCompanyRelationPatchViolation,
  getOperationControlledCompanyPatchViolation,
} from '@/lib/modules/companies/companyOperationControls'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { duplicateOperationJsonResponse } from '@/lib/operations/apiResponse'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { buildBranchSummaryReadModel } from '@/lib/read-models/projections/branchSummary.projection'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

const COMPANY_NACE_SELECT = 'id,company_id,nace_code_id,is_primary,status,start_date,end_date,notes,is_deleted,created_at,updated_at,version,nace_code:nace_codes(id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at)'
const COMPANY_BRANCH_DETAIL_SELECT = 'id,company_id,organization_unit_id,facility_id,branch_name,branch_short_name,branch_type,is_official_branch,country,city,district,neighborhood,address,postal_code,phone,email,trade_registry_number,trade_registry_office,tax_office,sgk_workplace_registry_no,opening_registration_date,closing_registration_date,status,record_status,start_date,end_date,metadata_json,updated_at,created_at,version,is_deleted'
const emptyStringToUndefined = (value: unknown) => value === '' ? undefined : value
const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional().nullable())
const optionalCompanyType = z.preprocess(
  emptyStringToUndefined,
  z.enum(['anonim', 'limited', 'komandit', 'kolektif', 'adi_komandit', 'adi_sirket']).optional().nullable()
)
const optionalRiskClass = z.preprocess(
  emptyStringToUndefined,
  z.enum(['az_tehlikeli', 'tehlikeli', 'cok_tehlikeli']).optional().nullable()
)
const optionalElectronicNotificationAddress = z.preprocess(
  emptyStringToUndefined,
  z.string().regex(/^\d{5}-\d{5}-\d{5}$/, 'Elektronik tebligat adresi 25888-57689-53086 formatinda olmalidir').optional().nullable()
)

const OptionalShortNameSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).max(120).optional().nullable()
)
const OptionalFiscalYearStartSchema = z.preprocess(
  (value) => value === '' || value === null || value === undefined
    ? undefined
    : parseFiscalYearStartStorage(value),
  z.number().int().refine(isValidFiscalYearStart, 'Mali yil baslangici ay ve gun olarak girilmelidir.').optional()
)

const SirketUpdateSchema = z.object({
  trade_name: z.string().min(1).max(300).optional(),
  short_name: OptionalShortNameSchema,
  tax_number: z.string().regex(/^\d{10}$/, 'VKN 10 haneli sayı olmalıdır').optional(),
  tax_office: z.string().min(1).max(120).optional(),
  mersis_number: z.string().optional().nullable(),
  trade_registry_number: z.string().optional().nullable(),
  foundation_date: z.string().optional().nullable(),
  company_type: optionalCompanyType,
  country: z.string().min(1).optional(),
  city: z.string().min(1).max(120).optional(),
  district: z.string().min(1).max(120).optional(),
  address: z.string().min(1).optional(),
  postal_code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.union([z.literal(''), z.string().email()]).optional().nullable(),
  website: z.string().optional().nullable(),
  legal_entity: z.string().optional().nullable(),
  electronic_notification_address: optionalElectronicNotificationAddress,
  trade_registry_office: z.string().optional().nullable(),
  parent_company_id: optionalUuid,
  company_code: z.string().optional().nullable(),
  e_invoice_taxpayer: z.boolean().optional(),
  e_archive_taxpayer: z.boolean().optional(),
  e_waybill_taxpayer: z.boolean().optional(),
  sgk_workplace_registry_no: z.string().optional().nullable(),
  sgk_province: z.string().optional().nullable(),
  sgk_branch: z.string().optional().nullable(),
  nace_codes: z.array(z.string()).optional(),
  risk_class: optionalRiskClass,
  activity_subject: z.string().optional().nullable(),
  default_currency: z.string().optional(),
  default_language: z.string().optional(),
  time_zone: z.string().optional(),
  fiscal_year_start: OptionalFiscalYearStartSchema,
  is_deleted: z.boolean().optional(),
  hero_images: z.array(z.record(z.any())).optional(),
  hero_documents: z.array(z.record(z.any())).optional(),
  contact_points: z.array(z.record(z.any())).optional(),
  beneficiary_full_name: z.string().optional().nullable(),
  beneficiary_address: z.string().optional().nullable(),
  beneficiary_iban: z.string().optional().nullable(),
  beneficiary_account_no: z.string().optional().nullable(),
  beneficiary_iban_or_account_no: z.string().optional().nullable(),
  beneficiary_bank_code: z.string().optional().nullable(),
  beneficiary_swift_bic: z.string().optional().nullable(),
  beneficiary_bank_name: z.string().optional().nullable(),
  beneficiary_bank_address: z.string().optional().nullable(),
  beneficiary_currency: z.string().optional().nullable(),
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
    Object.entries(value).filter(([, item]) => item !== undefined)
  )
}

const COMPANY_DETAIL_SELECT = 'id,organization_id,field_history,short_name,trade_name,tax_number,tax_office,company_type,city,district,address,postal_code,phone,email,is_deleted,record_status,company_status,committed_capital_amount,paid_capital_amount,mersis_number,trade_registry_number,foundation_date,legal_entity,electronic_notification_address,trade_registry_office,parent_company_id,company_code,logo_url,country,website,e_invoice_taxpayer,e_archive_taxpayer,e_waybill_taxpayer,sgk_workplace_registry_no,sgk_province,sgk_branch,nace_codes,risk_class,activity_subject,default_currency,default_language,time_zone,fiscal_year_start,hero_images,hero_documents,created_at,updated_at,version'
const COMPANY_HERO_SELECT = 'id,organization_id,field_history,short_name,trade_name,tax_number,tax_office,company_type,logo_url,is_deleted,record_status,company_status,committed_capital_amount,paid_capital_amount,created_at,updated_at,version'
const COMPANY_MEDIA_SELECT = 'id,logo_url,hero_images,hero_documents,updated_at,version'
const COMPANY_DETAILS_SELECT = 'id,organization_id,field_history,city,district,address,postal_code,phone,email,is_deleted,record_status,company_status,committed_capital_amount,paid_capital_amount,mersis_number,trade_registry_number,foundation_date,legal_entity,electronic_notification_address,trade_registry_office,parent_company_id,company_code,country,website,e_invoice_taxpayer,e_archive_taxpayer,e_waybill_taxpayer,sgk_workplace_registry_no,sgk_province,sgk_branch,nace_codes,risk_class,activity_subject,default_currency,default_language,time_zone,fiscal_year_start,created_at,updated_at,version'
const PUBLIC_TAX_SELECT = 'id,company_id,tax_number,tax_office,tax_type,liability_start_date,e_invoice_taxpayer,e_archive_taxpayer,e_waybill_enabled,gib_user_code,has_financial_seal,financial_seal_expiry_date,tax_debt_tracking_active,last_check_date,history,created_at,updated_at'
const PUBLIC_SGK_SELECT = 'id,company_id,workplace_registry_no,province,branch,registration_date,nace_code,risk_class,uses_incentive,active_incentive_type,incentive_end_date,employee_count,debt_tracking_active,last_check_date,history,created_at,updated_at'
const PUBLIC_INCENTIVES_SELECT = 'id,company_id,has_kosgeb_registration,kosgeb_no,active_support_program,application_date,result_status,incentive_type,incentive_end_date,responsible_person,notes,history,created_at,updated_at'
const PUBLIC_REGISTRY_SELECT = 'id,company_id,mersis_number,trade_registry_no,registry_office,chamber_registry_no,chamber_name,establishment_registration_date,last_change_date,liquidation_status,history,created_at,updated_at'
const PUBLIC_LICENSES_SELECT = 'id,company_id,license_type,document_no,issuing_authority,start_date,end_date,status,document_file,reminder_days,history,is_deleted,created_at,updated_at'
const PUBLIC_CHANNELS_SELECT = 'id,company_id,kep_address,kep_provider,e_notification_address,e_notification_active,e_government_authority_status,official_notification_email,official_notification_phone,has_web_service_integration,api_notes,history,created_at,updated_at'
const CURRENT_OWNERSHIP_SELECT = 'company_id,partner_id,display_name,current_share_ratio,current_voting_ratio,current_profit_ratio,current_capital_amount,current_share_units,has_control_right,control_type,has_veto_right,has_board_nomination_right,has_privileged_share,is_beneficial_owner,beneficial_ratio,warnings'

function withDerivedCompanyLogo<T extends Record<string, any>>(company: T): T {
  if (!Object.prototype.hasOwnProperty.call(company, 'hero_images')) return company
  const { logoUrl } = extractCompanyLogoVariants(company.hero_images, {
    fallbackUrl: company.logo_url,
    preferThumbnail: true,
  })
  return { ...company, logo_url: logoUrl || null }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: id } = await params
  const supabase = createServiceClient()
  const section = request.nextUrl.searchParams.get('section')
  if (!section) {
    const fastApiResponse = await proxyToFastApi(request, `/api/v1/companies/${id}`)
    if (fastApiResponse) return fastApiResponse
  }

  const permission = await requirePermission(request, supabase, 'companies.view')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, id)
  if (!companyScope) {
    return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
  }

  if (section === 'hero') {
    let query = supabase
      .from('companies')
      .select(COMPANY_HERO_SELECT)
      .eq('id', id)
    query = applyTenantQueryScope(query, 'companies', tenantContext)

    const { data: company, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
    }

    const companyRow = company as Record<string, any>
    const hydrated = companyRow.organization_id
      ? await hydrateMasterContact(supabase, 'organization', companyRow)
      : companyRow

    return NextResponse.json({ data: hydrated }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }

  if (section === 'media' || section === 'mediaMetadata') {
    let query = supabase
      .from('companies')
      .select(COMPANY_MEDIA_SELECT)
      .eq('id', id)
    query = applyTenantQueryScope(query, 'companies', tenantContext)

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }

  if (section === 'relationsSummary') {
    const relatedSections = await Promise.all([
      fetchCompanyRelatedSection({
        supabase,
        table: 'company_partners',
        key: 'partners',
        label: 'Ortaklar',
        companyId: id,
        tenantContext,
        fallback: [] as Record<string, any>[],
        select: 'id,company_id,display_name,partner_name,partner_type,owner_kind,record_status,status,version',
      }),
      fetchCompanyRelatedSection({
        supabase,
        table: 'company_representatives',
        key: 'representatives',
        label: 'Temsilciler',
        companyId: id,
        tenantContext,
        fallback: [] as Record<string, any>[],
        select: 'id,company_id,display_name,full_name,status,record_status,authority_types,is_deleted,version,updated_at',
      }),
      fetchCompanyRelatedSection({ supabase, table: 'v_current_ownership', key: 'current_ownership', label: 'Guncel ortaklik', companyId: id, tenantContext, fallback: [] as Record<string, any>[], select: CURRENT_OWNERSHIP_SELECT }),
    ])
    const relatedByKey = Object.fromEntries(relatedSections.map(result => [result.key, result]))
    return NextResponse.json({
      data: {
        partners: relatedByKey.partners?.data || [],
        representatives: relatedByKey.representatives?.data || [],
        current_ownership: relatedByKey.current_ownership?.data || [],
        related_status: relatedStatusMap(relatedSections),
        related_errors: relatedErrorMap(relatedSections),
      },
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }

  if (section === 'history') {
    const lifecycleEvents = await fetchCompanyRelatedSection({
      supabase,
      table: 'company_lifecycle_events',
      key: 'lifecycle_events',
      label: 'Yasam dongusu gecmisi',
      companyId: id,
      tenantContext,
      fallback: [] as Record<string, any>[],
      select: 'id,company_id,event_type,event_date,old_status,new_status,payload_json,document_reference_id,created_at,created_by',
      query: query => query.eq('company_id', id).order('created_at', { ascending: false }).limit(25),
    })
    const rows = Array.isArray(lifecycleEvents.data) ? lifecycleEvents.data : []
    return NextResponse.json({
      data: {
        lifecycle_events: rows,
        lifecycle_last_event: rows[0] || null,
        related_status: relatedStatusMap([lifecycleEvents]),
        related_errors: relatedErrorMap([lifecycleEvents]),
      },
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }

  let companyQuery = supabase
    .from('companies')
    .select((section === 'details' || section === 'profile' ? COMPANY_DETAILS_SELECT : COMPANY_DETAIL_SELECT) as string)
    .eq('id', id)
  companyQuery = applyTenantQueryScope(companyQuery, 'companies', tenantContext)

  const { data: company, error } = await companyQuery.single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  if (section === 'details' || section === 'profile') {
    const companyRow = company as Record<string, any>
    const hydrated = companyRow.organization_id
      ? await hydrateMasterContact(supabase, 'organization', companyRow)
      : companyRow

    return NextResponse.json(
      { data: hydrated },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }

  const relatedSections = await Promise.all([
    fetchCompanyRelatedSection({
      supabase,
      table: 'company_partners',
      key: 'partners',
      label: 'Ortaklar',
      companyId: id,
      tenantContext,
      fallback: [] as Record<string, any>[],
      select: 'id,company_id,person_id,organization_id,owner_kind,partner_type,display_name,partner_name,identity_number,identity_tax_number,share_ratio,voting_ratio,profit_ratio,has_representation_right,signature_authority,start_date,end_date,status,record_status,is_deleted,source_type,source_id,history,created_at,updated_at,version',
    }),
    fetchCompanyRelatedSection({
      supabase,
      table: 'company_representatives',
      key: 'representatives',
      label: 'Temsilciler',
      companyId: id,
      tenantContext,
      fallback: [] as Record<string, any>[],
      select: 'id,company_id,person_id,organization_id,person_kind,source_type,source_id,display_name,full_name,authority_types,job_title,authority_type,status,record_status,start_date,end_date,signature_type,transaction_limit,currency,requires_joint_signature,can_approve_alone,is_deleted,history,created_at,updated_at,version',
    }),
    fetchCompanyRelatedSection({
      supabase,
      table: 'stakeholders',
      key: 'stakeholders',
      label: 'Paydaşlar',
      companyId: id,
      tenantContext,
      fallback: [] as Record<string, any>[],
      select: 'id,company_id,person_id,organization_id,stakeholder_type,category,display_name,tax_id,phone,email,country,city,status,priority_level,relationship_start_date,is_deleted,history,created_at,updated_at,version',
    }),
    fetchCompanyRelatedSection({
      supabase,
      table: 'company_logos',
      key: 'logos',
      label: 'Logolar',
      companyId: id,
      tenantContext,
      fallback: [] as Record<string, any>[],
      select: 'id,company_id,file_name,file_url,is_primary,created_at',
    }),
    fetchCompanyRelatedSection({ supabase, table: 'company_public_tax', key: 'public_tax', label: 'Vergi bilgileri', companyId: id, tenantContext, fallback: {}, select: PUBLIC_TAX_SELECT, mode: 'maybeSingle' }),
    fetchCompanyRelatedSection({ supabase, table: 'company_public_sgk', key: 'public_sgk', label: 'SGK bilgileri', companyId: id, tenantContext, fallback: {}, select: PUBLIC_SGK_SELECT, mode: 'maybeSingle' }),
    fetchCompanyRelatedSection({ supabase, table: 'company_public_incentives', key: 'public_incentives', label: 'Teşvik bilgileri', companyId: id, tenantContext, fallback: {}, select: PUBLIC_INCENTIVES_SELECT, mode: 'maybeSingle' }),
    fetchCompanyRelatedSection({ supabase, table: 'company_public_registry', key: 'public_registry', label: 'Sicil bilgileri', companyId: id, tenantContext, fallback: {}, select: PUBLIC_REGISTRY_SELECT, mode: 'maybeSingle' }),
    fetchCompanyRelatedSection({ supabase, table: 'company_public_licenses', key: 'public_licenses', label: 'Ruhsat bilgileri', companyId: id, tenantContext, fallback: [] as Record<string, any>[], select: PUBLIC_LICENSES_SELECT }),
    fetchCompanyRelatedSection({ supabase, table: 'company_public_channels', key: 'public_channels', label: 'Dijital kamu kanalları', companyId: id, tenantContext, fallback: {}, select: PUBLIC_CHANNELS_SELECT, mode: 'maybeSingle' }),
    fetchCompanyRelatedSection({ supabase, table: 'v_current_ownership', key: 'current_ownership', label: 'Güncel ortaklık', companyId: id, tenantContext, fallback: [] as Record<string, any>[], select: CURRENT_OWNERSHIP_SELECT }),
    fetchCompanyRelatedSection({ supabase, table: 'company_opening_details', key: 'opening_details', label: 'Açılış bilgileri', companyId: id, tenantContext, fallback: null as Record<string, any> | null, mode: 'maybeSingle' }),
    fetchCompanyRelatedSection({ supabase, table: 'company_liquidation_details', key: 'liquidation_details', label: 'Tasfiye bilgileri', companyId: id, tenantContext, fallback: null as Record<string, any> | null, mode: 'maybeSingle' }),
    fetchCompanyRelatedSection({ supabase, table: 'company_deregistration_details', key: 'deregistration_details', label: 'Terkin bilgileri', companyId: id, tenantContext, fallback: null as Record<string, any> | null, mode: 'maybeSingle' }),
    fetchCompanyRelatedSection({
      supabase,
      table: 'company_lifecycle_events',
      key: 'lifecycle_events',
      label: 'Yaşam döngüsü geçmişi',
      companyId: id,
      tenantContext,
      fallback: [] as Record<string, any>[],
      select: 'id,company_id,event_type,event_date,old_status,new_status,payload_json,document_reference_id,created_at,created_by',
      query: query => query.eq('company_id', id).order('created_at', { ascending: false }).limit(25),
    }),
    fetchCompanyRelatedSection({
      supabase,
      table: 'company_nace_codes',
      key: 'company_nace_codes',
      label: 'NACE kodları',
      companyId: id,
      tenantContext,
      fallback: [] as Record<string, any>[],
      select: COMPANY_NACE_SELECT,
      query: query => query.eq('company_id', id).eq('is_deleted', false).order('is_primary', { ascending: false }).order('created_at', { ascending: false }),
    }),
    fetchCompanyRelatedSection({
      supabase,
      table: 'company_branches',
      key: 'branches',
      label: 'Şubeler',
      companyId: id,
      tenantContext,
      fallback: [] as Record<string, any>[],
      select: COMPANY_BRANCH_DETAIL_SELECT,
      query: query => query.eq('company_id', id).eq('is_deleted', false).order('opening_registration_date', { ascending: false }).order('created_at', { ascending: false }),
    }),
  ])

  const relatedByKey = Object.fromEntries(relatedSections.map(result => [result.key, result]))
  const partners = relatedByKey.partners
  const representatives = relatedByKey.representatives
  const stakeholders = relatedByKey.stakeholders
  const logos = relatedByKey.logos
  const publicTax = relatedByKey.public_tax
  const publicSgk = relatedByKey.public_sgk
  const publicIncentives = relatedByKey.public_incentives
  const publicRegistry = relatedByKey.public_registry
  const publicLicenses = relatedByKey.public_licenses
  const publicChannels = relatedByKey.public_channels
  const currentOwnership = relatedByKey.current_ownership
  const openingDetails = relatedByKey.opening_details
  const liquidationDetails = relatedByKey.liquidation_details
  const deregistrationDetails = relatedByKey.deregistration_details
  const lifecycleEvents = relatedByKey.lifecycle_events
  const companyNaceCodes = relatedByKey.company_nace_codes

  const currentOwnershipRows = Array.isArray(currentOwnership.data) ? currentOwnership.data : []
  const partnerRows = Array.isArray(partners.data) ? partners.data : []
  const lifecycleRows = Array.isArray(lifecycleEvents.data) ? lifecycleEvents.data : []
  const ownershipByPartnerKey = new Map(currentOwnershipRows.map((row: Record<string, any>) => [`${row.company_id || ''}::${row.partner_id || ''}`, row]))
  const partnersWithOwnership = partnerRows.map((partner: Record<string, any>) => {
    const ownership = ownershipByPartnerKey.get(`${partner.company_id || ''}::${partner.id || ''}`)
    if (!ownership) return partner
    return {
      ...partner,
      current_ownership: ownership,
      current_share_ratio: ownership.current_share_ratio,
      current_voting_ratio: ownership.current_voting_ratio,
      current_profit_ratio: ownership.current_profit_ratio,
      share_ratio: partner.share_ratio ?? ownership.current_share_ratio,
      voting_ratio: partner.voting_ratio ?? ownership.current_voting_ratio,
      profit_ratio: partner.profit_ratio ?? ownership.current_profit_ratio,
    }
  })
  const branchReadModel = await buildBranchSummaryReadModel({ supabase, companyId: id, tenantContext })

  const data = {
    ...(company as Record<string, any>),
    partners: partnersWithOwnership,
    representatives: representatives.data || [],
    stakeholders: stakeholders.data || [],
    logos: logos.data || [],
    public_tax: publicTax.data || {},
    public_sgk: publicSgk.data || {},
    public_incentives: publicIncentives.data || {},
    public_registry: publicRegistry.data || {},
    public_licenses: publicLicenses.data || [],
    public_channels: publicChannels.data || {},
    company_nace_codes: companyNaceCodes.data || [],
    branches: branchReadModel.branches,
    branch_summary: branchReadModel.branch_summary,
    opening_details: openingDetails.data || null,
    liquidation_details: liquidationDetails.data || null,
    deregistration_details: deregistrationDetails.data || null,
    lifecycle_events: lifecycleRows,
    lifecycle_last_event: lifecycleRows[0] || null,
    related_status: relatedStatusMap(relatedSections),
    related_errors: relatedErrorMap(relatedSections),
  }

  const dataRow = data as Record<string, any>
  const hydrated = dataRow.organization_id
    ? await hydrateMasterContact(supabase, 'organization', dataRow)
    : dataRow

  return NextResponse.json(
    { data: hydrated },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}

async function hydrateCompanyBranchesForDetail(
  supabase: ReturnType<typeof createServiceClient>,
  rows: Record<string, any>[],
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  if (!rows.length) return []
  const unitIds = uniqueIds(rows.map(row => row.organization_unit_id))
  const facilityIds = uniqueIds(rows.map(row => row.facility_id))
  let unitQuery = unitIds.length
    ? supabase.from('organization_units').select('id,name,short_name,type,status').in('id', unitIds)
    : null
  if (unitQuery) unitQuery = applyTenantQueryScope(unitQuery, 'organization_units', tenantContext)
  let facilityQuery = facilityIds.length
    ? supabase.from('company_facilities').select('id,facility_name,status,record_status').in('id', facilityIds)
    : null
  if (facilityQuery) facilityQuery = applyTenantQueryScope(facilityQuery, 'company_facilities', tenantContext)
  const [units, facilities] = await Promise.all([
    unitQuery || Promise.resolve({ data: [], error: null }),
    facilityQuery || Promise.resolve({ data: [], error: null }),
  ])
  const unitById = new Map((units.data || []).map((unit: any) => [unit.id, unit]))
  const facilityById = new Map((facilities.data || []).map((facility: any) => [facility.id, facility]))

  return rows.map(row => {
    const unit = row.organization_unit_id ? unitById.get(row.organization_unit_id) : null
    const facility = row.facility_id ? facilityById.get(row.facility_id) : null
    return {
      id: row.id,
      branch_name: row.branch_name,
      branch_short_name: row.branch_short_name,
      branch_type: row.branch_type,
      is_official_branch: row.is_official_branch,
      record_status: row.record_status,
      status: row.status,
      city: row.city,
      district: row.district,
      address_summary: [row.district, row.city].filter(Boolean).join(', ') || row.address || '',
      opening_registration_date: row.opening_registration_date,
      closing_registration_date: row.closing_registration_date,
      organization_unit_id: row.organization_unit_id,
      organization_unit_name: unit?.name || '',
      facility_id: row.facility_id,
      facility_name: facility?.facility_name || row.metadata_json?.facility_name || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}

function buildCompanyBranchSummary(rows: Record<string, any>[]) {
  const activeRows = rows.filter(isActiveBranchSummaryRow)
  const closedRows = rows.filter(row => String(row.record_status || row.status).toLocaleLowerCase('tr-TR') === 'closed')
  const officialRows = activeRows.filter(row => row.is_official_branch)
  const operationPointRows = activeRows.filter(row => ['liaison_office', 'operation_point'].includes(String(row.branch_type || '')))
  const byOpeningDate = [...rows]
    .filter(row => row.opening_registration_date || row.created_at)
    .sort((left, right) => String(right.opening_registration_date || right.created_at || '').localeCompare(String(left.opening_registration_date || left.created_at || '')))
  const byClosingDate = [...closedRows]
    .filter(row => row.closing_registration_date || row.updated_at)
    .sort((left, right) => String(right.closing_registration_date || right.updated_at || '').localeCompare(String(left.closing_registration_date || left.updated_at || '')))

  return {
    total_branch_count: rows.length,
    active_branch_count: activeRows.length,
    official_branch_count: officialRows.length,
    operation_point_count: operationPointRows.length,
    closed_branch_count: closedRows.length,
    last_opened_branch: byOpeningDate[0] || null,
    last_closed_branch: byClosingDate[0] || null,
  }
}

function isActiveBranchSummaryRow(row: Record<string, any>) {
  const values = [row.record_status, row.status].map(value => String(value || '').toLocaleLowerCase('tr-TR'))
  return !row.is_deleted && values.some(value => value === 'active' || value === 'aktif')
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/companies/${id}`)
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const tenantContext = resolveTenantContext(request)
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, id)
  if (!companyScope) {
    return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
  }
  if (!isWritableCompanyScope(companyScope)) {
    return NextResponse.json({ error: 'Bu şirket için yalnızca görüntüleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY' }, { status: 403 })
  }

  const rawBody = await request.json()
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const body = omitNullishValues(stripOperationControlFields(rawBody))
  const parsed = SirketUpdateSchema.safeParse(body)
  const relationViolation = getDisallowedCompanyRelationPatchViolation(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  if (relationViolation) {
    return NextResponse.json({
      error: relationViolation.message,
      code: relationViolation.code,
      details: { fields: relationViolation.fields },
    }, { status: 409 })
  }

  let current: Record<string, any> | null = null
  const currentRead = await safeReadRecord({
    supabase,
    request,
    tableName: 'companies',
    recordId: id,
    permissionKey: 'companies.edit',
    select: 'id,organization_id,field_history,short_name,trade_name,tax_number,tax_office,company_type,city,district,address,postal_code,phone,email,is_deleted,record_status,company_status,committed_capital_amount,paid_capital_amount,mersis_number,trade_registry_number,foundation_date,legal_entity,electronic_notification_address,trade_registry_office,company_code,logo_url,country,website,e_invoice_taxpayer,e_archive_taxpayer,e_waybill_taxpayer,sgk_workplace_registry_no,sgk_province,sgk_branch,risk_class,default_currency,default_language,time_zone,fiscal_year_start,hero_images,hero_documents,version,updated_at',
  })
  if (!currentRead.ok) return safeCrudResponse(currentRead)
  current = currentRead.data

  const operationViolation = getOperationControlledCompanyPatchViolation(body, current)
  if (operationViolation) {
    return NextResponse.json({
      error: operationViolation.message,
      code: operationViolation.code,
      details: { fields: operationViolation.fields },
    }, { status: 409 })
  }

  const permission = await requirePermission(request, supabase, 'companies.edit')
  if (permission instanceof NextResponse) return permission
  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: tenantContext.tenantId,
    companyId: id,
    moduleKey: 'sirket',
    entityType: 'company',
    entityId: id,
    operationType: 'company.update',
    clientRequestId,
    baseVersion,
    baseUpdatedAt,
    requestedBy: permission.userId,
    payload: body,
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOperationJsonResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return NextResponse.json({ error: operationCreate.error, code: operationCreate.code || 'OPERATION_REQUEST_FAILED' }, { status: 500 })
  }
  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)

  const {
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
    entity_bank_accounts,
    ...rawCompanyUpdates
  } = parsed.data
  const organizationMasterUpdates = {
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
  const companyUpdates = withDerivedCompanyLogo(rawCompanyUpdates)
  const updateResult = await safeUpdateRecord({
    supabase,
    request,
    tableName: 'companies',
    recordId: id,
    permissionKey: 'companies.edit',
    patch: companyUpdates,
    select: 'id,short_name,trade_name,tax_number,logo_url,hero_images,is_deleted,record_status,company_status,committed_capital_amount,paid_capital_amount,postal_code,version,updated_at',
    currentSelect: 'id,organization_id,field_history,short_name,trade_name,tax_number,tax_office,company_type,city,district,address,postal_code,phone,email,is_deleted,record_status,company_status,mersis_number,trade_registry_number,foundation_date,legal_entity,electronic_notification_address,trade_registry_office,company_code,logo_url,country,website,e_invoice_taxpayer,e_archive_taxpayer,e_waybill_taxpayer,sgk_workplace_registry_no,sgk_province,sgk_branch,risk_class,default_currency,default_language,time_zone,fiscal_year_start,hero_images,hero_documents,version,updated_at',
    versionField: 'version',
    baseVersion,
    baseUpdatedAt,
    fieldHistory: {
      ignoredFields: ['hero_images', 'hero_documents', 'logo_url'],
    },
  })

  if (!updateResult.ok) {
    if (operation) await operationService.markFailed(operation.id, {
      code: updateResult.code,
      error: updateResult.error,
      details: updateResult.details,
    })
    return NextResponse.json({
      error: updateResult.error,
      code: updateResult.code,
      details: updateResult.details,
      ...(operation ? {
        operation_id: operation.id,
        operation_status: 'failed',
        message: operationStatusMessage('failed'),
      } : {}),
    }, { status: updateResult.status })
  }
  const data = updateResult.data

  const organizationUnitError = await ensureCompanyRootUnit(supabase, id, { ...current, ...companyUpdates }, tenantContext)
  if (organizationUnitError && !isMissingTableError(organizationUnitError)) {
    if (operation) await operationService.markFailed(operation.id, {
      code: organizationUnitError.code || 'COMPANY_ORG_UNIT_SAVE_FAILED',
      error: organizationUnitError.message,
    })
    return NextResponse.json({ error: organizationUnitError.message, code: organizationUnitError.code || 'COMPANY_ORG_UNIT_SAVE_FAILED' }, { status: 500 })
  }

  await syncMasterContact(
    supabase,
    'organization',
    current.organization_id,
    { ...companyUpdates, ...organizationMasterUpdates }
  )

  if (entity_bank_accounts && current.organization_id) {
    await new EntityBankAccountsService(supabase as any).syncMany('organization', current.organization_id, entity_bank_accounts, null)
  }

  const responseData: Record<string, any> = {
    ...current,
    ...companyUpdates,
    ...data,
  }
  const hydratedData = responseData.organization_id
    ? await hydrateMasterContact(supabase, 'organization', responseData)
    : responseData

  if (operation) {
    await operationService.markCompleted(operation.id, { id: hydratedData.id, data: hydratedData })
    await new OutboxEventService(supabase as any).enqueue({
      tenantId: tenantContext.tenantId,
      companyId: id,
      moduleKey: 'sirket',
      eventType: 'company.updated',
      aggregateType: 'company',
      aggregateId: id,
      operationId: operation.id,
      payload: { id, changed_fields: Object.keys(companyUpdates) },
    }).catch(() => null)
  }

  return NextResponse.json({
    data: hydratedData,
    ...(operation ? {
      operation_id: operation.id,
      operation_status: 'completed',
      message: operationStatusMessage('completed'),
    } : {}),
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/companies/${id}`)
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()

  const draftDelete = await safeHardDeleteDraftRecord({
    supabase,
    request,
    tableName: 'companies',
    recordId: id,
    select: 'id,record_status,company_status,is_deleted',
    lifecycleStatusField: ['record_status', 'company_status'],
    draftStatusValue: 'draft',
    permissionKey: 'companies.edit',
    referenceChecks: companyDraftDeleteReferenceChecks(),
  })

  if (draftDelete.ok) return safeHardDeleteDraftRecordResponse(draftDelete)
  if (draftDelete.code !== 'NOT_DRAFT_RECORD') return safeHardDeleteDraftRecordResponse(draftDelete)

  return NextResponse.json({
    error: 'Sirket kapatma islemleri Terkin Wizardi ile tamamlanmalidir.',
    code: 'USE_DEREGISTRATION_WIZARD',
  }, { status: 409 })
}

function companyDraftDeleteReferenceChecks(): SafeHardDeleteReferenceCheck[] {
  const companyBlockTables: SafeHardDeleteReferenceCheck[] = [
    { tableName: 'bank_connections', foreignKey: 'company_id', label: 'Banka bağlantıları', optional: true },
    { tableName: 'bank_accounts', foreignKey: 'company_id', label: 'Banka hesapları', optional: true },
    { tableName: 'bank_cards', foreignKey: 'company_id', label: 'Banka kartları', optional: true },
    { tableName: 'financial_institution_movements', foreignKey: 'company_id', label: 'Finans hareketleri', optional: true },
    { tableName: 'account_movements', foreignKey: 'company_id', label: 'Muhasebe hareketleri', optional: true },
    { tableName: 'account_card_settings', foreignKey: 'company_id', label: 'Cari kart ayarları', optional: true },
    { tableName: 'after_sales_records', foreignKey: 'owner_company_id', label: 'Satış sonrası kayıtları', optional: true },
    { tableName: 'after_sales_records', foreignKey: 'related_company_id', label: 'İlişkili satış sonrası kayıtları', optional: true },
    { tableName: 'project_management_projects', foreignKey: 'company_id', label: 'Proje kayıtları', optional: true },
    { tableName: 'project_management_tasks', foreignKey: 'company_id', label: 'Görev kayıtları', optional: true },
    { tableName: 'project_management_time_entries', foreignKey: 'company_id', label: 'Zaman kayıtları', optional: true },
    { tableName: 'product_categories', foreignKey: 'company_id', label: 'Ürün kategorileri', optional: true },
    { tableName: 'product_brands', foreignKey: 'company_id', label: 'Ürün markaları', optional: true },
    { tableName: 'product_service_items', foreignKey: 'company_id', label: 'Ürün/hizmet kartları', optional: true },
  ]

  return [
    ...companyBlockTables,
    {
      tableName: 'partner_ownership_lifecycle_events',
      foreignKey: 'partner_id',
      label: 'Ortak yaşam döngüsü kayıtları',
      mode: 'cascadeDelete',
      optional: true,
      resolveForeignValues: async ({ supabase, recordId, tenantContext }) => {
        let query = supabase.from('company_partners').select('id').eq('company_id', recordId)
        query = applyTenantQueryScope(query, 'company_partners', tenantContext)
        const { data, error } = await query
        if (error) throw error
        return (data || []).map((row: any) => row.id).filter(Boolean)
      },
    },
    { tableName: 'partner_ownership_lifecycle_events', foreignKey: 'company_id', label: 'Ortak yaşam döngüsü kayıtları', mode: 'cascadeDelete', optional: true },
    { tableName: 'ownership_transactions', foreignKey: 'company_id', label: 'Ortaklık işlemleri', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_representatives', foreignKey: 'company_id', label: 'Temsilciler', mode: 'cascadeDelete', optional: true },
    { tableName: 'stakeholders', foreignKey: 'company_id', label: 'Paydaşlar', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_partners', foreignKey: 'company_id', label: 'Ortaklar', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_nace_codes', foreignKey: 'company_id', label: 'NACE kodları', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_public_licenses', foreignKey: 'company_id', label: 'Lisans kayıtları', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_public_channels', foreignKey: 'company_id', label: 'Kanal bilgileri', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_public_registry', foreignKey: 'company_id', label: 'Sicil bilgileri', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_public_incentives', foreignKey: 'company_id', label: 'Teşvik bilgileri', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_public_sgk', foreignKey: 'company_id', label: 'SGK bilgileri', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_public_tax', foreignKey: 'company_id', label: 'Vergi bilgileri', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_logos', foreignKey: 'company_id', label: 'Şirket logoları', mode: 'cascadeDelete', optional: true },
    { tableName: 'company_vehicles', foreignKey: 'company_id', label: 'Araçlar', mode: 'cascadeDelete', optional: true },
    { tableName: 'employee_work_relations', foreignKey: 'company_id', label: 'Çalışma ilişkileri', mode: 'cascadeDelete', optional: true },
    {
      tableName: 'positions',
      foreignKey: 'unit_id',
      label: 'Pozisyonlar',
      mode: 'cascadeDelete',
      optional: true,
      resolveForeignValues: async ({ supabase, recordId, tenantContext }) => {
        let query = supabase.from('organization_units').select('id').eq('company_id', recordId)
        query = applyTenantQueryScope(query, 'organization_units', tenantContext)
        const { data, error } = await query
        if (error) throw error
        return (data || []).map((row: any) => row.id).filter(Boolean)
      },
    },
    { tableName: 'organization_units', foreignKey: 'company_id', label: 'Organizasyon birimleri', mode: 'cascadeDelete', optional: true },
    { tableName: 'entity_bank_accounts', foreignKey: 'entity_id', match: { entity_kind: 'company' }, label: 'Şirket banka hesapları', mode: 'cascadeDelete', optional: true },
  ]
}
