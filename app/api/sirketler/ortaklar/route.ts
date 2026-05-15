import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'

const PartnerSchema = z.object({
  company_id: z.string().uuid().optional(),
  sirket_id: z.string().uuid().optional(),
  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  partner_type: z.enum(['gercek_kisi', 'tuzel_kisi']).default('gercek_kisi'),
  owner_kind: z.enum(['gercek_kisi', 'tuzel_kisi']).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  trade_name: z.string().optional(),
  short_name: z.string().optional(),
  identity_number: z.string().min(1),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  nationality_country: z.string().optional(),
  nationality: z.string().optional(),
  uyruk: z.string().optional(),
  national_id: z.string().optional(),
  tc_kimlik: z.string().optional(),
  passport_no: z.string().optional(),
  pasaport_no: z.string().optional(),
  share_ratio: z.coerce.number().min(0).max(100).optional().nullable(),
  voting_ratio: z.coerce.number().min(0).max(100).optional(),
  profit_ratio: z.coerce.number().min(0).max(100).optional(),
  start_date: z.string().min(1),
  end_date: z.string().optional(),
  status: z.enum(['Aktif', 'Pasif', 'Devredildi', 'Askıda', 'Tarihsel']).default('Aktif'),
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
  profession: z.string().optional(),
  meslek: z.string().optional(),
  blood_type: z.string().optional(),
  kan_grubu: z.string().optional(),
  engellilik: z.boolean().optional(),
  engellilik_yuzdesi: z.coerce.number().min(0).max(100).optional(),
  askerlik_durumu: z.string().optional(),
  tecil_tarihi: z.string().optional(),
  hukumluluk: z.boolean().optional(),
  okuryazar_degil: z.boolean().optional(),
  egitim_okullari: z.array(z.record(z.any())).optional(),
  yabanci_diller: z.array(z.record(z.any())).optional(),
  sertifikalar: z.array(z.record(z.any())).optional(),
  yakinlar: z.array(z.record(z.any())).optional(),
  marital_status: z.string().optional(),
  medeni_durum: z.string().optional(),
  foundation_date: z.string().optional(),
  company_type: z.string().optional(),
  mersis_no: z.string().optional(),
  trade_registry_no: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  telefonlar: z.array(z.record(z.any())).optional(),
  epostalar: z.array(z.record(z.any())).optional(),
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
  il: z.string().optional(),
  ilce: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  acil_kisi_ad: z.string().optional(),
  acil_kisi_soyad: z.string().optional(),
  acil_kisi_yakinlik: z.string().optional(),
  acil_kisi_telefon: z.string().optional(),
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
  const { from, to } = listRange(listQuery)
  const sortMap: Record<string, string> = {
    display_name: 'display_name',
    ortak_adi: 'ortak_adi',
    identity_number: 'identity_number',
    share_ratio: 'share_ratio',
    voting_ratio: 'voting_ratio',
    profit_ratio: 'profit_ratio',
    status: 'status',
    created_at: 'created_at',
  }
  const sortColumn = sortMap[listQuery.sort || ''] || 'created_at'
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')
  const includePassive = listQuery.includePassive

  let query = supabase
    .from('sirket_ortaklar')
    .select('id,sirket_id,company_id,person_id,organization_id,owner_kind,ortak_tipi,display_name,ortak_adi,identity_number,tckn_vkn,share_ratio,hisse_orani,voting_ratio,profit_ratio,start_date,end_date,status,is_deleted,source_type,source_id,created_at')
    .order(sortColumn, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  if (companyId) query = query.or(`company_id.eq.${companyId},sirket_id.eq.${companyId}`)
  if (status) query = query.eq('status', status)
  if (!includePassive) query = query.eq('is_deleted', false)
  if (listQuery.search) query = query.or(`display_name.ilike.%${listQuery.search}%,ortak_adi.ilike.%${listQuery.search}%,identity_number.ilike.%${listQuery.search}%,tckn_vkn.ilike.%${listQuery.search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

  const rows = data || []
  return NextResponse.json({ data: rows, meta: listMetaFromRows(listQuery, rows.length) })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = PartnerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const row = await attachPartnerIdentity(supabase, parsed.data, mapPartnerForDb(parsed.data))
  if (!row.company_id) {
    return NextResponse.json({ error: 'Bağlı şirket bulunamadı', code: 'COMPANY_REQUIRED' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sirket_ortaklar')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
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
  const ownerKind = partner.partner_type || partner.owner_kind || 'gercek_kisi'
  const displayName = ownerKind === 'tuzel_kisi'
    ? partner.trade_name || partner.short_name
    : [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim()

  return {
    company_id: partner.company_id || partner.sirket_id,
    sirket_id: partner.company_id || partner.sirket_id,
    ortak_adi: displayName || 'Ortak',
    ortak_tipi: ownerKind === 'tuzel_kisi' ? 'sirket' : 'kisi',
    tckn_vkn: partner.identity_number,
    hisse_orani: toNullableNumber(partner.share_ratio ?? partner.hisse_orani),
    imza_yetkisi: !!partner.has_representation_right,
    owner_kind: ownerKind,
    source_type: partner.source_type || 'ortaklar_sayfasi',
    source_id: partner.source_id || partner.person_id || partner.organization_id || null,
    display_name: displayName || 'Ortak',
    identity_number: partner.identity_number || partner.national_id || partner.tc_kimlik || partner.tax_number || partner.vkn_tckn || partner.passport_no || partner.pasaport_no,
    share_class: partner.share_class || 'Adi Pay',
    share_units: toNullableNumber(partner.share_units),
    nominal_value: toNullableNumber(partner.nominal_value),
    capital_amount: toNullableNumber(partner.capital_amount),
    share_ratio: toNullableNumber(partner.share_ratio ?? partner.hisse_orani),
    voting_ratio: toNullableNumber(partner.voting_ratio),
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
    start_date: partner.start_date,
    end_date: partner.end_date || null,
    status: partner.status || 'Aktif',
    notes: partner.notes || null,
    history: partner.timeline || [],
  photo_logo: partner.photo_logo || [],
  partner_documents: partner.partner_documents || [],
    partner_profile: stripMasterDataForRoleProfile(partner),
    is_deleted: false,
  }
}

async function attachPartnerIdentity(supabase: ReturnType<typeof createServiceClient>, partner: Record<string, any>, row: Record<string, any>) {
  try {
    const kind = row.owner_kind === 'tuzel_kisi' ? 'organization' : 'person'
    if (kind === 'person') {
      if (partner.person_id) return { ...row, person_id: partner.person_id, source_type: 'master_person', source_id: partner.person_id }

      const fullName = row.display_name || [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim()
      const nationality = normalizeCountryId(partner.nationality_country || partner.nationality || partner.uyruk || 'TR')
      const identityNumber = partner.identity_number || partner.national_id || partner.tc_kimlik || partner.passport_no || partner.pasaport_no
      const nationalId = identityNumber && String(identityNumber).length === 11 ? String(identityNumber) : null
      const passportNo = nationalId ? null : partner.passport_no || partner.pasaport_no || null
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
        phone: partner.phone || partner.cep_telefonu || null,
        email: partner.email || null,
        address: partner.address || partner.adres || null,
        city: partner.city || partner.il || null,
        district: partner.district || partner.ilce || null,
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
      registration_number: partner.trade_registry_no || partner.mersis_no || null,
      tax_office: partner.tax_office || null,
      organization_type: partner.company_type || null,
      phone: partner.phone || partner.telefon || null,
      email: partner.email || null,
      address: partner.address || partner.adres || null,
      city: partner.city || partner.il || null,
      district: partner.district || partner.ilce || null,
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
