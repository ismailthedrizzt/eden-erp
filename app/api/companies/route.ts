import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { listMeta, listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { getServerResponseCache, serverListCacheKey, setServerResponseCache } from '@/lib/api/serverResponseCache'

const SirketSchema = z.object({
  organization_id: z.string().uuid().optional().nullable(),
  trade_name: z.string().min(1).max(300),
  short_name: z.string().min(1).max(120),
  tax_number: z.string().regex(/^\d{10}$/, 'VKN 10 haneli sayÄ± olmalÄ±dÄ±r'),
  tax_office: z.string().min(1).max(120),
  mersis_number: z.string().optional(),
  trade_registry_number: z.string().optional(),
  foundation_date: z.string().optional(),
  company_type: z.enum(['anonim', 'limited', 'komandit', 'kolektif', 'adi_komandit', 'adi_sirket']).optional(),
  country: z.string().min(1).default('TÃ¼rkiye'),
  city: z.string().min(1).max(120),
  district: z.string().min(1).max(120),
  address: z.string().min(1),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  website: z.string().optional(),
  legal_entity: z.string().optional(),
  electronic_notification_address: z.string().regex(/^\d{5}-\d{5}-\d{5}$/, 'Elektronik tebligat adresi 25888-57689-53086 formatinda olmalidir').optional(),
  trade_registry_office: z.string().optional(),
  parent_company_id: z.string().uuid().optional().nullable(),
  company_code: z.string().optional(),
  e_invoice_taxpayer: z.boolean().default(false),
  e_archive_taxpayer: z.boolean().default(false),
  e_waybill_taxpayer: z.boolean().default(false),
  sgk_workplace_registry_no: z.string().optional(),
  sgk_province: z.string().optional(),
  sgk_branch: z.string().optional(),
  nace_codes: z.array(z.string()).optional(),
  risk_class: z.enum(['az_tehlikeli', 'tehlikeli', 'cok_tehlikeli']).optional(),
  default_currency: z.string().default('TRY'),
  default_language: z.string().default('tr'),
  time_zone: z.string().default('Europe/Istanbul'),
  fiscal_year_start: z.number().int().min(1).max(12).default(1),
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

export async function GET(request: NextRequest) {
  const cacheKey = serverListCacheKey(request, 'companies:list')
  const cached = getServerResponseCache<Record<string, unknown>>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'short_name', direction: 'asc' })
  const { from, to } = listRange(listQuery)
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
  const sortColumn = sortMap[listQuery.sort || ''] || 'short_name'

  const ara = searchParams.get('ara') || listQuery.search
  const includePassive = listQuery.includePassive

  let query = supabase
    .from('companies')
    .select('id,organization_id,short_name,trade_name,tax_number,tax_office,company_type,city,district,is_deleted,record_status,company_status,updated_at,created_at')
    .order(sortColumn, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  if (ara) {
    query = query.or(`short_name.ilike.%${ara}%,trade_name.ilike.%${ara}%,tax_number.ilike.%${ara}%`)
  }

  if (!includePassive) query = query.eq('is_deleted', false)

  const { data, error } = await query
  if (error) {
    if (error.message.includes("Could not find the table 'public.companies'")) {
      return NextResponse.json({
        data: [],
        meta: listMeta(listQuery, 0),
        warning: 'companies tablosu bulunamadÄ±. supabase/migrations/20260516_initial_schema.sql uygulanmalÄ±.'
      })
    }

    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  const rows = data || []
  const payload = { data: rows, meta: listMetaFromRows(listQuery, rows.length) }
  setServerResponseCache(cacheKey, payload, 60_000)
  return NextResponse.json(payload)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = SirketSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'GeÃ§ersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
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
    ...companyData
  } = parsed.data
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
  let companyRow: Record<string, any>
  try {
    companyRow = await attachCompanyOrganization(supabase, {
      ...companyData,
      is_deleted: false,
      record_status: 'draft',
      company_status: 'draft',
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Åirket ana kurum kaydÄ±na baÄŸlanamadÄ±',
      code: 'MASTER_ORGANIZATION_LINK_FAILED',
    }, { status: 500 })
  }
  const { data, error } = await supabase
    .from('companies')
    .insert(companyRow)
    .select('id,short_name,trade_name,tax_number,is_deleted,record_status,company_status,updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })

  const organizationUnitError = await ensureCompanyRootUnit(supabase, data.id, companyRow)
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

  const partnerError = await replaceCompanyPartners(supabase, data.id, partners || [])
  if (partnerError) return NextResponse.json({ error: partnerError.message, code: partnerError.code || 'PARTNER_SAVE_FAILED' }, { status: 500 })

  const representativeError = await replaceCompanyRepresentatives(supabase, data.id, representatives || [])
  if (representativeError) return NextResponse.json({ error: representativeError.message, code: representativeError.code || 'REPRESENTATIVE_SAVE_FAILED' }, { status: 500 })

  const publicError = await replaceCompanyPublicData(supabase, data.id, {
    public_tax,
    public_sgk,
    public_incentives,
    public_registry,
    public_licenses,
    public_channels,
  })
  if (publicError) return NextResponse.json({ error: publicError.message, code: publicError.code || 'PUBLIC_SAVE_FAILED' }, { status: 500 })

  const lifecycleError = await insertCompanyCreatedAsDraftEvent(supabase, data.id, companyRow)
  if (lifecycleError) return NextResponse.json({ error: lifecycleError.message, code: lifecycleError.code || 'LIFECYCLE_EVENT_FAILED' }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

async function insertCompanyCreatedAsDraftEvent(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  payload: Record<string, any>
) {
  const { error } = await supabase
    .from('company_lifecycle_events')
    .insert({
      company_id: companyId,
      event_type: 'company_created_as_draft',
      event_date: new Date().toISOString().slice(0, 10),
      old_status: null,
      new_status: 'draft',
      payload_json: payload,
      document_reference_id: null,
    })

  return error
}

async function attachCompanyOrganization(supabase: ReturnType<typeof createServiceClient>, companyData: Record<string, any>) {
  try {
    if (companyData.organization_id) return companyData

    const country = companyData.country || 'TR'
    const taxNumber = companyData.tax_number || null
    const { data: existing, error: findError } = taxNumber
      ? await supabase.from('organizations').select('id').eq('country', country).eq('tax_number', taxNumber).maybeSingle()
      : await supabase.from('organizations').select('id').eq('country', country).eq('legal_name', companyData.trade_name).maybeSingle()
    if (findError) throw new Error(findError.message)

    const organizationId = existing?.id || (await supabase.from('organizations').insert({
      legal_name: companyData.trade_name,
      short_name: companyData.short_name || null,
      country,
      tax_number: taxNumber,
      registration_number: companyData.trade_registry_number || companyData.mersis_number || null,
      tax_office: companyData.tax_office || null,
      organization_type: companyData.company_type || null,
      phone: companyData.phone || null,
      email: companyData.email || null,
      address: companyData.address || null,
      city: companyData.city || null,
      district: companyData.district || null,
      metadata_json: { source: 'companies_create' },
    }).select('id').single()).data?.id

    if (!organizationId) throw new Error('Ana kurum kaydÄ± oluÅŸturulamadÄ±.')
    return { ...companyData, organization_id: organizationId }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Åirket ana kurum kaydÄ±na baÄŸlanamadÄ±.')
  }
}

async function ensureCompanyRootUnit(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  companyData: Record<string, any>
) {
  const { data: unitType, error: typeError } = await supabase
    .from('organization_unit_types')
    .upsert({ name: 'Åirket', slug: 'company', color: '#0f766e', icon: 'Building2', sort_order: 0, is_active: true }, { onConflict: 'slug' })
    .select('id')
    .single()

  if (typeError) return typeError

  const companyName = companyData.trade_name || companyData.short_name || 'Åirket'
  const { data: existing, error: findError } = await supabase
    .from('organization_units')
    .select('id')
    .eq('company_id', companyId)
    .is('parent_unit_id', null)
    .eq('type', 'company')
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()

  if (findError) return findError

  const payload = {
    company_id: companyId,
    parent_unit_id: null,
    name: companyName,
    short_name: companyData.short_name || null,
    type: 'company',
    unit_type_id: unitType?.id || null,
    status: 'Aktif',
    active: true,
    is_deleted: false,
  }

  if (existing?.id) {
    const { error } = await supabase.from('organization_units').update(payload).eq('id', existing.id)
    return error
  }

  const { error } = await supabase.from('organization_units').insert(payload)
  return error
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
  }
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
      .upsert({ ...cleanPublicRow(row), company_id: companyId }, { onConflict: 'company_id' })
    if (error) return error
  }

  if (payload.public_licenses?.length) {
    const { error } = await supabase
      .from('company_public_licenses')
      .insert(payload.public_licenses.map((license) => ({
        ...cleanPublicRow(license),
        company_id: companyId,
        reminder_days: license.reminder_days ? Number(license.reminder_days) : null,
        is_deleted: !!license.is_deleted,
        deleted_at: license.deleted_at || null,
        deleted_by: license.deleted_by || null,
      })))
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

async function replaceCompanyPartners(supabase: ReturnType<typeof createServiceClient>, companyId: string, partners: Record<string, any>[]) {
  if (!partners.length) return null

  const { error } = await supabase
    .from('company_partners')
    .insert(partners.map(partner => mapPartnerForDb(companyId, partner)))

  return error
}

function mapPartnerForDb(companyId: string, partner: Record<string, any>) {
  const displayName = partner.display_name || [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim() || partner.partner_name || 'Ortak'

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
    status: partner.status || 'Aktif',
    document_reference_id: partner.document_reference_id || null,
    notes: partner.notes || null,
    history: partner.history || [],
    is_deleted: !!partner.is_deleted,
    deleted_at: partner.deleted_at || null,
  }
}

async function replaceCompanyRepresentatives(supabase: ReturnType<typeof createServiceClient>, companyId: string, representatives: Record<string, any>[]) {
  if (!representatives.length) return null

  const { error } = await supabase
    .from('company_representatives')
    .insert(representatives.map(representative => mapRepresentativeForDb(companyId, representative)))

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
