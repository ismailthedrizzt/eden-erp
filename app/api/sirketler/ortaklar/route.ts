import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PartnerSchema = z.object({
  company_id: z.string().uuid().optional(),
  sirket_id: z.string().uuid().optional(),
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
  share_ratio: z.coerce.number().min(0).max(100),
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
  marital_status: z.string().optional(),
  foundation_date: z.string().optional(),
  company_type: z.string().optional(),
  mersis_no: z.string().optional(),
  trade_registry_no: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
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
})

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('sirket_ortaklar')
    .select('*')
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('sirket_id', companyId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = PartnerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const row = await attachPartnerIdentity(supabase, parsed.data, mapPartnerForDb(parsed.data))
  if (!row.sirket_id) {
    return NextResponse.json({ error: 'Bağlı şirket bulunamadı', code: 'COMPANY_REQUIRED' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sirket_ortaklar')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

function mapPartnerForDb(partner: Record<string, any>) {
  const ownerKind = partner.partner_type || partner.owner_kind || 'gercek_kisi'
  const displayName = ownerKind === 'tuzel_kisi'
    ? partner.trade_name || partner.short_name
    : [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim()

  return {
    sirket_id: partner.company_id || partner.sirket_id,
    ortak_adi: displayName || 'Ortak',
    ortak_tipi: ownerKind === 'tuzel_kisi' ? 'sirket' : 'kisi',
    tckn_vkn: partner.identity_number,
    hisse_orani: partner.share_ratio,
    imza_yetkisi: !!partner.has_representation_right,
    owner_kind: ownerKind,
    source_type: partner.source_type || 'ortaklar_sayfasi',
    source_id: partner.source_id || partner.person_id || partner.organization_id || null,
    display_name: displayName || 'Ortak',
    identity_number: partner.identity_number,
    share_class: partner.share_class || 'Adi Pay',
    share_units: partner.share_units || null,
    nominal_value: partner.nominal_value || null,
    capital_amount: partner.capital_amount || null,
    share_ratio: partner.share_ratio,
    voting_ratio: partner.voting_ratio || null,
    profit_ratio: partner.profit_ratio || null,
    beneficial_owner: !!(partner.beneficial_owner || partner.is_beneficial_owner),
    is_beneficial_owner: !!(partner.beneficial_owner || partner.is_beneficial_owner),
    beneficial_ratio: partner.beneficial_ratio || null,
    is_ultimate_controller: !!partner.is_ultimate_controller,
    has_representation_right: !!partner.has_representation_right,
    has_control_right: !!partner.has_control_right,
    control_type: partner.control_type || null,
    has_board_nomination_right: !!partner.has_board_nomination_right,
    has_veto_right: !!partner.has_veto_right,
    has_privileged_share: !!(partner.has_privileged_share || partner.has_privilege),
    start_date: partner.start_date,
    end_date: partner.end_date || null,
    status: partner.status || 'Aktif',
    notes: partner.notes || null,
    history: partner.timeline || [],
    photo_logo: partner.photo_logo || [],
    partner_documents: partner.partner_documents || [],
    partner_profile: partner,
    is_deleted: false,
  }
}

async function attachPartnerIdentity(supabase: ReturnType<typeof createServiceClient>, partner: Record<string, any>, row: Record<string, any>) {
  try {
    const kind = row.owner_kind === 'tuzel_kisi' ? 'organization' : 'person'
    if (kind === 'person') {
      const fullName = row.display_name || [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim()
      const nationality = partner.nationality_country || partner.nationality || 'TR'
      const nationalId = partner.identity_number && String(partner.identity_number).length === 11 ? String(partner.identity_number) : null
      const passportNo = nationalId ? null : partner.passport_no || null
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
        metadata_json: { source: 'partners_create' },
      }).select('id').single()).data?.id
      return { ...row, person_id: personId || null, source_type: row.source_type || 'master_person', source_id: row.source_id || personId || null }
    }

    const legalName = partner.trade_name || row.display_name
    const country = partner.country || partner.nationality_country || 'TR'
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
      metadata_json: { source: 'partners_create' },
    }).select('id').single()).data?.id
    return { ...row, organization_id: organizationId || null, source_type: row.source_type || 'master_organization', source_id: row.source_id || organizationId || null }
  } catch {
    return row
  }
}
