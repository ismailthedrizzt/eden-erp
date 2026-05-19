import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { parseListQuery } from '@/lib/api/listEndpoint'
import { safeCreateRecord, safeCrudResponse, safeListRecords } from '@/lib/crud/safeCrudService'
import { ensureUniqueRoleMaster, roleUniquenessResponse } from '@/lib/identity/roleUniqueness'

const PartnerSchema = z.object({
  company_id: z.string().uuid().optional(),  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  partner_type: z.enum(['person', 'organization']).default('person'),
  owner_kind: z.enum(['person', 'organization']).optional(),
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
  status: z.string().optional().default('Taslak'),
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

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'created_at', direction: 'desc' })
  const sortMap: Record<string, string> = {
    display_name: 'display_name',
    partner_name: 'partner_name',
    identity_number: 'identity_number',
    share_ratio: 'share_ratio',
    voting_ratio: 'voting_ratio',
    profit_ratio: 'profit_ratio',
    status: 'status',
    created_at: 'created_at',
  }
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')
  const result = await safeListRecords({
    supabase,
    request,
    tableName: 'company_partners',
    select: 'id,company_id,company_id,person_id,organization_id,owner_kind,partner_type,display_name,partner_name,identity_number,identity_tax_number,share_ratio,share_ratio,voting_ratio,profit_ratio,start_date,end_date,status,record_status,source_type,source_id,created_at',
    listQuery,
    sortMap,
    defaultSort: 'created_at',
    passiveField: 'record_status',
    passiveValue: 'passive',
    searchFields: ['display_name', 'partner_name', 'identity_number', 'identity_tax_number'],
    filters: {
      ...(companyId ? { company_id: companyId } : {}),
      ...(status ? { status } : {}),
    },
  })

  return safeCrudResponse(result)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = PartnerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }
  const missingPersonFields = getMissingPersonFields(parsed.data)
  if (missingPersonFields.length > 0) {
    return NextResponse.json({
      error: 'Eksik zorunlu kişi alanı',
      code: 'VALIDATION_FAILED',
      details: { fieldErrors: Object.fromEntries(missingPersonFields.map(field => [field, ['Zorunlu alan']])) },
    }, { status: 400 })
  }

  const row = await attachPartnerIdentity(supabase, parsed.data, mapPartnerForDb(parsed.data))
  const uniqueness = await ensureUniqueRoleMaster(supabase as any, {
    tableName: 'company_partners',
    identity: row,
  })
  if (!uniqueness.ok) return roleUniquenessResponse(uniqueness)

  const createResult = await safeCreateRecord({
    supabase,
    request,
    tableName: 'company_partners',
    values: row,
    select: '*',
  })
  if (!createResult.ok) return safeCrudResponse(createResult)

  const data = createResult.data
  await supabase.from('partner_ownership_lifecycle_events').insert({
    partner_id: data.id,
    company_id: data.company_id || data.company_id || null,
    event_type: 'created_as_draft',
    old_record_status: null,
    new_record_status: data.record_status || 'draft',
    payload_json: { source: 'partners_page' },
  })
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
  return NextResponse.json({ data: hydrated }, { status: 201 })
}

function mapPartnerForDb(partner: Record<string, any>) {
  const ownerKind = partner.partner_type || partner.owner_kind || 'person'
  const displayName = ownerKind === 'organization'
    ? partner.trade_name || partner.short_name
    : [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim()

  return {
    company_id: partner.company_id || partner.company_id,    partner_name: displayName || 'Ortak',
    partner_type: ownerKind === 'organization' ? 'company' : 'person',
    identity_tax_number: partner.identity_number,
    share_ratio: toNullableNumber(partner.share_ratio ?? partner.share_ratio),
    signature_authority: !!partner.has_representation_right,
    owner_kind: ownerKind,
    source_type: partner.source_type || 'partners_sayfasi',
    source_id: partner.source_id || partner.person_id || partner.organization_id || null,
    display_name: displayName || 'Ortak',
    identity_number: partner.identity_number || partner.national_id || partner.national_id || partner.tax_number || partner.tax_number || partner.passport_no || partner.passport_no,
    share_class: partner.share_class || 'Adi Pay',
    share_units: toNullableNumber(partner.share_units),
    nominal_value: toNullableNumber(partner.nominal_value),
    capital_amount: toNullableNumber(partner.capital_amount),    voting_ratio: toNullableNumber(partner.voting_ratio),
    profit_ratio: toNullableNumber(partner.profit_ratio),
    beneficial_owner: false,
    is_beneficial_owner: false,
    beneficial_ratio: toNullableNumber(partner.beneficial_ratio),
    is_ultimate_controller: false,
    has_representation_right: !!partner.has_representation_right,
    has_control_right: false,
    control_type: null,
    has_board_nomination_right: false,
    has_veto_right: false,
    has_privileged_share: false,
    start_date: partner.start_date || null,
    end_date: partner.end_date || null,
    status: partner.status || 'Taslak',
    record_status: partner.record_status || 'draft',
    notes: partner.notes || null,
    history: partner.timeline || [],
  photo_logo: partner.photo_logo || [],
  partner_documents: partner.partner_documents || [],
    partner_profile: stripMasterDataForRoleProfile(partner),
  }
}

function getMissingPersonFields(partner: Record<string, any>) {
  if (partner.partner_type !== 'person') return []
  return [
    ['first_name', partner.first_name],
    ['last_name', partner.last_name],
    ['gender', partner.gender],
  ]
    .filter(([, value]) => !String(value || '').trim())
    .map(([field]) => field)
}

async function attachPartnerIdentity(supabase: ReturnType<typeof createServiceClient>, partner: Record<string, any>, row: Record<string, any>) {
  try {
    const kind = row.owner_kind === 'organization' ? 'organization' : 'person'
    if (kind === 'person') {
      if (partner.person_id) return { ...row, person_id: partner.person_id, source_type: 'master_person', source_id: partner.person_id }

      const fullName = row.display_name || [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim()
      const nationality = normalizeCountryId(partner.nationality_country || partner.nationality || partner.nationality || 'TR')
      const identityNumber = partner.identity_number || partner.national_id || partner.national_id || partner.passport_no || partner.passport_no
      const nationalId = identityNumber && String(identityNumber).length === 11 ? String(identityNumber) : null
      const passportNo = nationalId ? null : partner.passport_no || partner.passport_no || null
      let query = supabase.from('persons').select('id').eq('nationality', nationality).eq(nationalId ? 'national_id' : 'passport_no', nationalId || passportNo).maybeSingle()
      if (!nationalId && !passportNo) query = supabase.from('persons').select('id').eq('full_name', fullName).maybeSingle()
      const { data: existing, error: findError } = await query
      if (findError) return row
      const personId = existing?.id || (await supabase.from('persons').insert({
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
      }).select('id').single()).data?.id
      return { ...row, person_id: personId || null, source_type: 'master_person', source_id: personId || null }
    }

    const legalName = partner.trade_name || row.display_name
    if (partner.organization_id) return { ...row, organization_id: partner.organization_id, source_type: 'master_organization', source_id: partner.organization_id }

    const country = normalizeCountryId(partner.country || partner.nationality_country || 'TR')
    const taxNumber = partner.tax_number || partner.identity_number || null
    const { data: existing, error: findError } = await supabase
      .from('organizations')
      .select('id')
      .eq('country', country)
      .eq(taxNumber ? 'tax_number' : 'legal_name', taxNumber || legalName)
      .maybeSingle()
    if (findError) return row
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

function toNullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

