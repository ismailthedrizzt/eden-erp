import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, syncMasterContact } from '@/lib/identity/masterContact'

const CompanyStatusSchema = z.enum(['aktif', 'tasfiye_halinde', 'terkin_edilmis'])

const SirketUpdateSchema = z.object({
  ticari_unvan: z.string().min(1).max(300).optional(),
  kisa_unvan: z.string().min(1).max(120).optional(),
  vkn_tckn: z.string().regex(/^\d{10}$/, 'VKN 10 haneli sayı olmalıdır').optional(),
  vergi_dairesi: z.string().min(1).max(120).optional(),
  mersis_no: z.string().optional(),
  ticaret_sicil_no: z.string().optional(),
  kurulus_tarihi: z.string().optional(),
  sirket_turu: z.enum(['anonim', 'limited', 'komandit', 'kolektif', 'adi_komandit', 'adi_sirket']).optional(),
  ulke: z.string().min(1).optional(),
  il: z.string().min(1).max(120).optional(),
  ilce: z.string().min(1).max(120).optional(),
  adres: z.string().min(1).optional(),
  telefon: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  web_sitesi: z.string().optional(),
  legal_entity: z.string().optional(),
  electronic_notification_address: z.string().regex(/^\d{5}-\d{5}-\d{5}$/, 'Elektronik tebligat adresi 25888-57689-53086 formatinda olmalidir').optional(),
  trade_registry_office: z.string().optional(),
  parent_company_id: z.string().uuid().optional().nullable(),
  sirket_kodu: z.string().optional(),
  e_fatura_mukellefi: z.boolean().optional(),
  e_arsiv_mukellefi: z.boolean().optional(),
  e_irsaliye_mukellefi: z.boolean().optional(),
  sgk_is_yeri_sicil_no: z.string().optional(),
  sgk_il: z.string().optional(),
  sgk_sube: z.string().optional(),
  nace_kodlari: z.array(z.string()).optional(),
  tehlike_sinifi: z.enum(['az_tehlikeli', 'tehlikeli', 'cok_tehlikeli']).optional(),
  varsayilan_para_birimi: z.string().optional(),
  varsayilan_dil: z.string().optional(),
  zaman_dilimi: z.string().optional(),
  mali_yil_baslangici: z.number().int().min(1).max(12).optional(),
  is_active: z.boolean().optional(),
  company_status: CompanyStatusSchema.optional(),
  hero_images: z.array(z.record(z.any())).optional(),
  hero_documents: z.array(z.record(z.any())).optional(),
  contact_points: z.array(z.record(z.any())).optional(),
  beneficiary_full_name: z.string().optional(),
  beneficiary_address: z.string().optional(),
  beneficiary_iban_or_account_no: z.string().optional(),
  beneficiary_swift_bic: z.string().optional(),
  beneficiary_bank_name: z.string().optional(),
  beneficiary_bank_address: z.string().optional(),
  beneficiary_currency: z.string().optional(),
  ortaklar: z.array(z.record(z.any())).optional(),
  temsilciler: z.array(z.record(z.any())).optional(),
  public_tax: z.record(z.any()).optional(),
  public_sgk: z.record(z.any()).optional(),
  public_incentives: z.record(z.any()).optional(),
  public_registry: z.record(z.any()).optional(),
  public_licenses: z.array(z.record(z.any())).optional(),
  public_channels: z.record(z.any()).optional(),
})

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')
}

function applyCompanyStatus(payload: Record<string, any>) {
  if (!('company_status' in payload) && !('is_active' in payload)) return payload
  const companyStatus = payload.company_status || (payload.is_active === false ? 'terkin_edilmis' : 'aktif')
  return {
    ...payload,
    company_status: companyStatus,
    is_active: companyStatus !== 'terkin_edilmis',
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: company, error } = await supabase
    .from('sirketler')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  const [
    partners,
    representatives,
    stakeholders,
    logos,
    publicTax,
    publicSgk,
    publicIncentives,
    publicRegistry,
    publicLicenses,
    publicChannels,
    currentOwnership,
  ] = await Promise.all([
    supabase.from('sirket_ortaklar').select('*').or(`sirket_id.eq.${id},company_id.eq.${id}`),
    supabase.from('sirket_temsilciler').select('*').or(`sirket_id.eq.${id},company_id.eq.${id}`),
    supabase.from('stakeholders').select('*').eq('company_id', id),
    supabase.from('sirket_logolar').select('*').eq('sirket_id', id),
    supabase.from('company_public_tax').select('*').eq('company_id', id).maybeSingle(),
    supabase.from('company_public_sgk').select('*').eq('company_id', id).maybeSingle(),
    supabase.from('company_public_incentives').select('*').eq('company_id', id).maybeSingle(),
    supabase.from('company_public_registry').select('*').eq('company_id', id).maybeSingle(),
    supabase.from('company_public_licenses').select('*').eq('company_id', id),
    supabase.from('company_public_channels').select('*').eq('company_id', id).maybeSingle(),
    supabase.from('v_current_ownership').select('*').eq('company_id', id),
  ])

  const relatedError = [
    partners.error,
    representatives.error,
    stakeholders.error,
    logos.error,
    publicTax.error,
    publicSgk.error,
    publicIncentives.error,
    publicRegistry.error,
    publicLicenses.error,
    publicChannels.error,
    currentOwnership.error,
  ].find(Boolean)

  if (relatedError) {
    return NextResponse.json({
      error: relatedError.message,
      code: relatedError.code || 'RELATED_FETCH_FAILED',
    }, { status: 500 })
  }

  const companyNaceCodes = await supabase
    .from('company_nace_codes')
    .select('*,nace_code:nace_codes(*)')
    .eq('company_id', id)
    .eq('is_deleted', false)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (companyNaceCodes.error && !isMissingTableError(companyNaceCodes.error)) {
    return NextResponse.json({
      error: companyNaceCodes.error.message,
      code: companyNaceCodes.error.code || 'COMPANY_NACE_FETCH_FAILED',
    }, { status: 500 })
  }

  const ownershipByPartnerId = new Map((currentOwnership.data || []).map((row: Record<string, any>) => [row.partner_id, row]))
  const partnersWithOwnership = (partners.data || []).map((partner: Record<string, any>) => {
    const ownership = ownershipByPartnerId.get(partner.id)
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

  const data = {
    ...company,
    ortaklar: partnersWithOwnership,
    temsilciler: representatives.data || [],
    paydaslar: stakeholders.data || [],
    logolar: logos.data || [],
    public_tax: publicTax.data || {},
    public_sgk: publicSgk.data || {},
    public_incentives: publicIncentives.data || {},
    public_registry: publicRegistry.data || {},
    public_licenses: publicLicenses.data || [],
    public_channels: publicChannels.data || {},
    company_nace_codes: companyNaceCodes.data || [],
  }

  const hydrated = data.organization_id
    ? await hydrateMasterContact(supabase, 'organization', data)
    : data

  return NextResponse.json(
    { data: hydrated },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const body = omitNullishValues(await request.json())
  const parsed = SirketUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data: current, error: currentError } = await supabase
    .from('sirketler')
    .select('id,organization_id,field_history,kisa_unvan,ticari_unvan,vkn_tckn,vergi_dairesi,sirket_turu,il,ilce,adres,telefon,email,is_active,company_status,mersis_no,ticaret_sicil_no,kurulus_tarihi,legal_entity,electronic_notification_address,trade_registry_office,sirket_kodu,ulke,web_sitesi,e_fatura_mukellefi,e_arsiv_mukellefi,e_irsaliye_mukellefi,sgk_is_yeri_sicil_no,sgk_il,sgk_sube,tehlike_sinifi,varsayilan_para_birimi,varsayilan_dil,zaman_dilimi,mali_yil_baslangici')
    .eq('id', id)
    .single()

  if (currentError) {
    if (currentError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  }

  const {
    ortaklar,
    temsilciler,
    contact_points,
    beneficiary_full_name,
    beneficiary_address,
    beneficiary_iban_or_account_no,
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
    ...rawCompanyUpdates
  } = parsed.data
  const organizationMasterUpdates = {
    ...(contact_points !== undefined ? { contact_points } : {}),
    ...(beneficiary_full_name !== undefined ? { beneficiary_full_name } : {}),
    ...(beneficiary_address !== undefined ? { beneficiary_address } : {}),
    ...(beneficiary_iban_or_account_no !== undefined ? { beneficiary_iban_or_account_no } : {}),
    ...(beneficiary_swift_bic !== undefined ? { beneficiary_swift_bic } : {}),
    ...(beneficiary_bank_name !== undefined ? { beneficiary_bank_name } : {}),
    ...(beneficiary_bank_address !== undefined ? { beneficiary_bank_address } : {}),
    ...(beneficiary_currency !== undefined ? { beneficiary_currency } : {}),
  }
  const companyUpdates = applyCompanyStatus(rawCompanyUpdates)
  const nextHistory = buildFieldHistory(current, companyUpdates)
  const { data, error } = await supabase
    .from('sirketler')
    .update({
      ...companyUpdates,
      field_history: nextHistory,
    })
    .eq('id', id)
    .select('id,kisa_unvan,ticari_unvan,vkn_tckn,is_active,company_status,updated_at')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  }

  const organizationUnitError = await ensureCompanyRootUnit(supabase, id, { ...current, ...companyUpdates })
  if (organizationUnitError) return NextResponse.json({ error: organizationUnitError.message, code: organizationUnitError.code || 'COMPANY_ORG_UNIT_SAVE_FAILED' }, { status: 500 })

  await syncMasterContact(
    supabase,
    'organization',
    current.organization_id,
    { ...companyUpdates, ...organizationMasterUpdates }
  )

  if (ortaklar) {
    const partnerError = await replaceCompanyPartners(supabase, id, ortaklar)
    if (partnerError) return NextResponse.json({ error: partnerError.message, code: partnerError.code || 'PARTNER_SAVE_FAILED' }, { status: 500 })
  }

  if (temsilciler) {
    const representativeError = await replaceCompanyRepresentatives(supabase, id, temsilciler)
    if (representativeError) return NextResponse.json({ error: representativeError.message, code: representativeError.code || 'REPRESENTATIVE_SAVE_FAILED' }, { status: 500 })
  }

  const publicError = await replaceCompanyPublicData(supabase, id, {
    public_tax,
    public_sgk,
    public_incentives,
    public_registry,
    public_licenses,
    public_channels,
  })
  if (publicError) return NextResponse.json({ error: publicError.message, code: publicError.code || 'PUBLIC_SAVE_FAILED' }, { status: 500 })

  return NextResponse.json({ data })
}

async function ensureCompanyRootUnit(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  companyData: Record<string, any>
) {
  const { data: unitType, error: typeError } = await supabase
    .from('organization_unit_types')
    .upsert({ name: 'Şirket', slug: 'sirket', color: '#0f766e', icon: 'Building2', sort_order: 0, is_active: true }, { onConflict: 'slug' })
    .select('id')
    .single()

  if (typeError) return typeError

  const companyName = companyData.ticari_unvan || companyData.kisa_unvan || 'Şirket'
  const { data: existing, error: findError } = await supabase
    .from('birimler')
    .select('id')
    .eq('sirket_id', companyId)
    .is('ust_birim_id', null)
    .eq('tip', 'sirket')
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()

  if (findError) return findError

  const payload = {
    sirket_id: companyId,
    ust_birim_id: null,
    ad: companyName,
    name: companyName,
    short_name: companyData.kisa_unvan || null,
    tip: 'sirket',
    unit_type_id: unitType?.id || null,
    status: 'Aktif',
    aktif: true,
    is_deleted: false,
  }

  if (existing?.id) {
    const { error } = await supabase.from('birimler').update(payload).eq('id', existing.id)
    return error
  }

  const { error } = await supabase.from('birimler').insert(payload)
  return error
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('sirketler')
    .update({ is_active: false, company_status: 'terkin_edilmis' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'SOFT_DELETE_FAILED' }, { status: 500 })

  return NextResponse.json({ success: true })
}

function buildFieldHistory(current: Record<string, any>, updates: Record<string, any>) {
  const existingHistory = (current.field_history && typeof current.field_history === 'object') ? current.field_history : {}
  const nextHistory: Record<string, any[]> = { ...existingHistory }
  const ignored = new Set(['id', 'created_at', 'updated_at', 'created_by', 'field_history', 'hero_images', 'hero_documents'])

  Object.entries(updates).forEach(([field, nextValue]) => {
    if (ignored.has(field)) return
    const previousValue = current[field]
    if (JSON.stringify(previousValue ?? null) === JSON.stringify(nextValue ?? null)) return

    nextHistory[field] = [
      ...(nextHistory[field] || []),
      {
        value: previousValue ?? '',
        date: new Date().toISOString(),
        user: 'Sistem Kullanıcısı',
      },
    ]
  })

  return nextHistory
}

async function replaceCompanyPartners(supabase: ReturnType<typeof createServiceClient>, sirketId: string, partners: Record<string, any>[]) {
  const { data: existing, error: fetchError } = await supabase
    .from('sirket_ortaklar')
    .select('id')
    .or(`sirket_id.eq.${sirketId},company_id.eq.${sirketId}`)

  if (fetchError) return fetchError

  const incomingIds = new Set(partners.map(row => row.id).filter(Boolean))
  const missingIds = (existing || [])
    .map(row => row.id)
    .filter(id => !incomingIds.has(id))

  if (missingIds.length > 0) {
    const { error } = await supabase
      .from('sirket_ortaklar')
      .update({
        is_deleted: true,
        status: 'Pasif',
        deleted_at: new Date().toISOString(),
        deleted_by: 'Sistem Kullanıcısı',
      })
      .in('id', missingIds)

    if (error) return error
  }

  if (!partners.length) return null

  const { error } = await supabase
    .from('sirket_ortaklar')
    .upsert(partners.map(partner => mapPartnerForDb(sirketId, partner)), { onConflict: 'id' })

  return error
}

function mapPartnerForDb(sirketId: string, partner: Record<string, any>) {
  const displayName = partner.display_name || [partner.ad, partner.soyad].filter(Boolean).join(' ').trim() || partner.ortak_adi || 'Ortak'

  return {
    ...(partner.id ? { id: partner.id } : {}),
    sirket_id: sirketId,
    company_id: sirketId,
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
    is_beneficial_owner: !!(partner.beneficial_owner || partner.is_beneficial_owner),
    beneficial_ratio: partner.beneficial_ratio ? Number(partner.beneficial_ratio) : null,
    beneficial_note: partner.beneficial_note || null,
    is_ultimate_controller: !!partner.is_ultimate_controller,
    has_representation_right: !!(partner.has_representation_right ?? partner.imza_yetkisi),
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
    deleted_by: partner.is_deleted ? 'Sistem Kullanıcısı' : null,
  }
}

async function replaceCompanyRepresentatives(supabase: ReturnType<typeof createServiceClient>, sirketId: string, representatives: Record<string, any>[]) {
  const { data: existing, error: fetchError } = await supabase
    .from('sirket_temsilciler')
    .select('id')
    .or(`sirket_id.eq.${sirketId},company_id.eq.${sirketId}`)

  if (fetchError) return fetchError

  const incomingIds = new Set(representatives.map(row => row.id).filter(Boolean))
  const missingIds = (existing || [])
    .map(row => row.id)
    .filter(id => !incomingIds.has(id))

  if (missingIds.length > 0) {
    const { error } = await supabase
      .from('sirket_temsilciler')
      .update({
        is_deleted: true,
        status: 'Pasif',
        deleted_at: new Date().toISOString(),
        deleted_by: 'Sistem Kullanıcısı',
      })
      .in('id', missingIds)

    if (error) return error
  }

  if (!representatives.length) return null

  const rows = representatives.map(representative => mapRepresentativeForDb(sirketId, representative))
  const { error } = await supabase
    .from('sirket_temsilciler')
    .upsert(rows, { onConflict: 'id' })

  return error
}

const COMPANY_REPRESENTATIVE_AUTHORITY_VALUE_BY_LABEL: Record<string, string> = {
  'Imza Yetkilisi': 'imza_yetkilisi',
  'İmza Yetkilisi': 'imza_yetkilisi',
  'Banka Yetkilisi': 'banka_yetkilisi',
  'GIB Yetkilisi': 'gib_yetkilisi',
  'GİB Yetkilisi': 'gib_yetkilisi',
  'SGK Yetkilisi': 'sgk_yetkilisi',
  'Sozlesme Yetkilisi': 'sozlesme_yetkilisi',
  'Sözleşme Yetkilisi': 'sozlesme_yetkilisi',
  'Satinalma Onay Yetkilisi': 'satinalma_onay_yetkilisi',
  'Satınalma Onay Yetkilisi': 'satinalma_onay_yetkilisi',
  'Odeme Onay Yetkilisi': 'odeme_onay_yetkilisi',
  'Ödeme Onay Yetkilisi': 'odeme_onay_yetkilisi',
  'Mesul Mudur': 'mesul_mudur',
  'Mesul Müdür': 'mesul_mudur',
  'Kanuni Temsilci': 'kanuni_temsilci',
}

function normalizeCompanyRepresentativeAuthority(value: unknown) {
  const text = String(value || '').trim()
  if (!text) return ''
  return COMPANY_REPRESENTATIVE_AUTHORITY_VALUE_BY_LABEL[text] || text
}

function getCompanyRepresentativePrimaryAuthority(representative: Record<string, any>) {
  const candidates = [
    representative.gorev,
    representative.primary_authority_type,
    Array.isArray(representative.authority_types) ? representative.authority_types[0] : null,
    representative.yetki_turu,
  ]
  return candidates.map(normalizeCompanyRepresentativeAuthority).find(Boolean) || ''
}

function mapRepresentativeForDb(sirketId: string, representative: Record<string, any>) {
  const primaryAuthority = getCompanyRepresentativePrimaryAuthority(representative)
  const authorityTypes = Array.isArray(representative.authority_types) && representative.authority_types.length
    ? representative.authority_types.map(normalizeCompanyRepresentativeAuthority).filter(Boolean)
    : [primaryAuthority].filter(Boolean)

  return {
    ...(representative.id ? { id: representative.id } : {}),
    sirket_id: sirketId,
    company_id: sirketId,
    ad_soyad: representative.display_name || representative.ad_soyad || 'Temsilci',
    gorev: primaryAuthority || null,
    yetki_turu: primaryAuthority || 'diger',
    authority_types: authorityTypes,
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
    deleted_by: representative.is_deleted ? 'Sistem Kullanıcısı' : null,
  }
}

async function replaceCompanyPublicData(
  supabase: ReturnType<typeof createServiceClient>,
  sirketId: string,
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
      .upsert({ ...cleanPublicRow(row), company_id: sirketId }, { onConflict: 'company_id' })
    if (error) return error
  }

  if (payload.public_licenses) {
    const { data: existing, error: fetchError } = await supabase
      .from('company_public_licenses')
      .select('id')
      .eq('company_id', sirketId)

    if (fetchError) return fetchError

    const incomingIds = new Set(payload.public_licenses.map((row) => row.id).filter(Boolean))
    const missingIds = (existing || [])
      .map((row) => row.id)
      .filter((licenseId) => !incomingIds.has(licenseId))

    if (missingIds.length > 0) {
      const { error } = await supabase
        .from('company_public_licenses')
        .update({
          is_deleted: true,
          status: 'Pasif',
          deleted_at: new Date().toISOString(),
          deleted_by: 'Sistem Kullanıcısı',
        })
        .in('id', missingIds)

      if (error) return error
    }

    if (payload.public_licenses.length > 0) {
      const { error } = await supabase
        .from('company_public_licenses')
        .upsert(payload.public_licenses.map((license) => ({
          ...cleanPublicRow(license),
          ...(license.id ? { id: license.id } : {}),
          company_id: sirketId,
          reminder_days: license.reminder_days ? Number(license.reminder_days) : null,
          is_deleted: !!license.is_deleted,
          deleted_at: license.deleted_at || null,
          deleted_by: license.deleted_by || null,
        })), { onConflict: 'id' })

      if (error) return error
    }
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
