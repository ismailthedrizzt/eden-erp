import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SirketSchema = z.object({
  ticari_unvan: z.string().min(1).max(300),
  kisa_unvan: z.string().min(1).max(120),
  vkn_tckn: z.string().regex(/^\d{10}$/, 'VKN 10 haneli sayı olmalıdır'),
  vergi_dairesi: z.string().min(1).max(120),
  mersis_no: z.string().optional(),
  ticaret_sicil_no: z.string().optional(),
  kurulus_tarihi: z.string().optional(),
  sirket_turu: z.enum(['anonim', 'limited', 'komandit', 'kolektif', 'adi_komandit', 'adi_sirket']).optional(),
  ulke: z.string().min(1).default('Türkiye'),
  il: z.string().min(1).max(120),
  ilce: z.string().min(1).max(120),
  adres: z.string().min(1),
  telefon: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  web_sitesi: z.string().optional(),
  legal_entity: z.string().optional(),
  parent_company_id: z.string().uuid().optional().nullable(),
  sirket_kodu: z.string().optional(),
  e_fatura_mukellefi: z.boolean().default(false),
  e_arsiv_mukellefi: z.boolean().default(false),
  e_irsaliye_mukellefi: z.boolean().default(false),
  sgk_is_yeri_sicil_no: z.string().optional(),
  sgk_il: z.string().optional(),
  sgk_sube: z.string().optional(),
  nace_kodlari: z.array(z.string()).optional(),
  tehlike_sinifi: z.enum(['az_tehlikeli', 'tehlikeli', 'cok_tehlikeli']).optional(),
  varsayilan_para_birimi: z.string().default('TRY'),
  varsayilan_dil: z.string().default('tr'),
  zaman_dilimi: z.string().default('Europe/Istanbul'),
  mali_yil_baslangici: z.number().int().min(1).max(12).default(1),
  is_active: z.boolean().default(true),
  hero_images: z.array(z.record(z.any())).optional(),
  hero_documents: z.array(z.record(z.any())).optional(),
  ortaklar: z.array(z.record(z.any())).optional(),
  temsilciler: z.array(z.record(z.any())).optional(),
})

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)

  const ara = searchParams.get('ara')
  const isActive = searchParams.get('is_active')

  let query = supabase
    .from('sirketler')
    .select('*')
    .order('kisa_unvan', { ascending: true })

  if (ara) {
    query = query.or(`kisa_unvan.ilike.%${ara}%,ticari_unvan.ilike.%${ara}%,vkn_tckn.ilike.%${ara}%`)
  }

  if (isActive === 'true') query = query.eq('is_active', true)
  if (isActive === 'false') query = query.eq('is_active', false)

  const { data, error } = await query
  if (error) {
    if (error.message.includes("Could not find the table 'public.sirketler'")) {
      return NextResponse.json({
        data: [],
        warning: 'sirketler tablosu bulunamadı. supabase/migrations/20240501_create_sirketler_table.sql uygulanmalı.'
      })
    }

    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = SirketSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const { ortaklar, temsilciler, ...companyData } = parsed.data
  const { data, error } = await supabase
    .from('sirketler')
    .insert(companyData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })

  const partnerError = await replaceCompanyPartners(supabase, data.id, ortaklar || [])
  if (partnerError) return NextResponse.json({ error: partnerError.message, code: partnerError.code || 'PARTNER_SAVE_FAILED' }, { status: 500 })

  const representativeError = await replaceCompanyRepresentatives(supabase, data.id, temsilciler || [])
  if (representativeError) return NextResponse.json({ error: representativeError.message, code: representativeError.code || 'REPRESENTATIVE_SAVE_FAILED' }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

async function replaceCompanyPartners(supabase: ReturnType<typeof createServiceClient>, sirketId: string, partners: Record<string, any>[]) {
  if (!partners.length) return null

  const { error } = await supabase
    .from('sirket_ortaklar')
    .insert(partners.map(partner => mapPartnerForDb(sirketId, partner)))

  return error
}

function mapPartnerForDb(sirketId: string, partner: Record<string, any>) {
  const displayName = partner.display_name || [partner.ad, partner.soyad].filter(Boolean).join(' ').trim() || partner.ortak_adi || 'Ortak'

  return {
    sirket_id: sirketId,
    ortak_adi: displayName,
    ortak_tipi: partner.owner_kind === 'tuzel_kisi' || partner.ortak_tipi === 'sirket' ? 'sirket' : 'kisi',
    tckn_vkn: partner.identity_number || partner.tckn_vkn || null,
    hisse_orani: partner.share_ratio || partner.hisse_orani ? Number(partner.share_ratio ?? partner.hisse_orani) : null,
    imza_yetkisi: !!(partner.has_representation_right ?? partner.imza_yetkisi),
    owner_kind: partner.owner_kind || (partner.ortak_tipi === 'sirket' ? 'tuzel_kisi' : 'gercek_kisi'),
    source_type: partner.source_type || null,
    source_id: partner.source_id || null,
    display_name: displayName,
    identity_number: partner.identity_number || partner.tckn_vkn || null,
    share_class: partner.share_class || 'Adi Pay',
    share_units: partner.share_units ? Number(partner.share_units) : null,
    nominal_value: partner.nominal_value ? Number(partner.nominal_value) : null,
    capital_amount: partner.capital_amount ? Number(partner.capital_amount) : null,
    share_ratio: partner.share_ratio || partner.hisse_orani ? Number(partner.share_ratio ?? partner.hisse_orani) : null,
    voting_ratio: partner.voting_ratio ? Number(partner.voting_ratio) : null,
    profit_ratio: partner.profit_ratio ? Number(partner.profit_ratio) : null,
    beneficial_owner: !!partner.beneficial_owner,
    beneficial_ratio: partner.beneficial_ratio ? Number(partner.beneficial_ratio) : null,
    beneficial_note: partner.beneficial_note || null,
    has_representation_right: !!(partner.has_representation_right ?? partner.imza_yetkisi),
    has_board_nomination_right: !!partner.has_board_nomination_right,
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

async function replaceCompanyRepresentatives(supabase: ReturnType<typeof createServiceClient>, sirketId: string, representatives: Record<string, any>[]) {
  if (!representatives.length) return null

  const { error } = await supabase
    .from('sirket_temsilciler')
    .insert(representatives.map(representative => mapRepresentativeForDb(sirketId, representative)))

  return error
}

function mapRepresentativeForDb(sirketId: string, representative: Record<string, any>) {
  return {
    sirket_id: sirketId,
    ad_soyad: representative.display_name || representative.ad_soyad || 'Temsilci',
    gorev: representative.notes || null,
    yetki_turu: 'diger',
    authority_types: representative.authority_types || [],
    person_kind: representative.person_kind || 'gercek_kisi',
    source_type: representative.source_type || null,
    source_id: representative.source_id || null,
    display_name: representative.display_name || representative.ad_soyad || null,
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
