import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizeIdentityCountry } from '@/lib/identity-gate'

const ResolveSchema = z.object({
  entityKind: z.enum(['person', 'organization']),
  identity: z.object({
    nationality: z.string().optional(),
    national_id: z.string().optional(),
    passport_no: z.string().optional(),
    country: z.string().optional(),
    tax_number: z.string().optional(),
    registration_number: z.string().optional(),
  }),
  roleTable: z.string().min(1),
  roleDuplicateCheck: z.string().optional(),
  allowMultipleActiveRoles: z.boolean().optional(),
  roleScope: z.record(z.any()).optional(),
})

const allowedRoleTables = new Set([
  'employees',
  'sirketler',
  'companies',
  'sirket_ortaklar',
  'company_partners',
  'sirket_temsilciler',
  'company_representatives',
  'stakeholders',
])

const roleTableAliases: Record<string, string> = {
  companies: 'sirketler',
  company_partners: 'sirket_ortaklar',
  company_representatives: 'sirket_temsilciler',
}

export async function POST(request: NextRequest) {
  const parsed = ResolveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz kimlik çözümleme isteği', details: parsed.error.flatten() }, { status: 400 })
  }

  const payload = parsed.data
  if (!allowedRoleTables.has(payload.roleTable)) {
    return NextResponse.json({ error: 'Bu rol tablosu için kimlik kapısı desteklenmiyor' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const roleTable = roleTableAliases[payload.roleTable] || payload.roleTable
  const identity = payload.identity

  const masterResult = payload.entityKind === 'person'
    ? await findPerson(supabase, identity)
    : await findOrganization(supabase, identity)

  if ('error' in masterResult) {
    return NextResponse.json({ error: masterResult.error }, { status: 400 })
  }

  const masterRecord = masterResult.record
  let roleRecord: Record<string, any> | null = null

  if (masterRecord && !payload.allowMultipleActiveRoles) {
    const roleResult = await findRoleRecord(supabase, {
      roleTable,
      entityKind: payload.entityKind,
      masterId: masterRecord.id,
      roleScope: payload.roleScope || {},
    })

    if (roleResult.error) {
      return NextResponse.json({ error: roleResult.error }, { status: 500 })
    }
    roleRecord = roleResult.record
  }

  if (masterRecord && roleRecord) {
    return NextResponse.json({
      state: 'role_found',
      entityKind: payload.entityKind,
      masterFound: true,
      masterRecord,
      roleFound: true,
      roleRecord,
      prefill: buildPrefill(payload.entityKind, masterRecord),
      message: payload.entityKind === 'person'
        ? 'Bu kişinin bu modülde zaten kaydı var. Mevcut kaydı düzenlemek ister misiniz?'
        : 'Bu tüzel kişinin bu modülde zaten kaydı var. Mevcut kaydı düzenlemek ister misiniz?',
    })
  }

  if (masterRecord) {
    return NextResponse.json({
      state: 'ready_for_insert',
      entityKind: payload.entityKind,
      masterFound: true,
      masterRecord,
      roleFound: false,
      roleRecord: null,
      prefill: buildPrefill(payload.entityKind, masterRecord),
      message: payload.entityKind === 'person'
        ? 'Gerçek kişi bulundu. Mevcut veriler forma aktarılacaktır.'
        : 'Tüzel kişi bulundu. Mevcut veriler forma aktarılacaktır.',
    })
  }

  return NextResponse.json({
    state: 'ready_for_insert',
    entityKind: payload.entityKind,
    masterFound: false,
    masterRecord: null,
    roleFound: false,
    roleRecord: null,
    prefill: buildNewMasterPrefill(payload.entityKind, identity),
    message: payload.entityKind === 'person'
      ? 'Bu gerçek kişi master kayıtlarda bulunamadı. Yeni kişi kaydı oluşturulacak.'
      : 'Bu tüzel kişi master kayıtlarda bulunamadı. Yeni kurum kaydı oluşturulacak.',
    warning: masterResult.warning || (payload.entityKind === 'organization' && !identity.tax_number && identity.registration_number
      ? 'VKN olmadan ticaret sicil no ile ilerleniyor; kayıt duplicate uyarısı gerektirebilir.'
      : undefined),
  })
}

async function findPerson(supabase: ReturnType<typeof createServiceClient>, identity: z.infer<typeof ResolveSchema>['identity']) {
  const nationality = normalizeIdentityCountry(identity.nationality)
  const nationalId = onlyDigits(identity.national_id)
  const passportNo = clean(identity.passport_no)

  if (!nationalId && !passportNo) {
    return { error: 'Devam etmek için TC Kimlik No veya Pasaport No girin.' }
  }

  let query = supabase.from('persons').select('*').eq('nationality', nationality).eq('is_deleted', false)
  query = nationalId ? query.eq('national_id', nationalId) : query.eq('passport_no', passportNo)
  const { data, error } = await query.maybeSingle()
  if (isMissingTableError(error, 'persons')) {
    return { record: null, warning: 'Girilen kişi kayıtlı kişiler listesinde bulunamadı. Yeni kayıt oluşturulacak.' }
  }
  if (error) return { error: error.message }
  return { record: data || null }
}

async function findOrganization(supabase: ReturnType<typeof createServiceClient>, identity: z.infer<typeof ResolveSchema>['identity']) {
  const country = normalizeIdentityCountry(identity.country)
  const taxNumber = onlyDigits(identity.tax_number)
  const registrationNumber = clean(identity.registration_number)

  if (!taxNumber && !registrationNumber) {
    return { error: 'Devam etmek için VKN veya Ticaret Sicil No girin.' }
  }

  let query = supabase.from('organizations').select('*').eq('country', country).eq('is_deleted', false)
  query = taxNumber ? query.eq('tax_number', taxNumber) : query.eq('registration_number', registrationNumber)
  const { data, error } = await query.maybeSingle()
  if (isMissingTableError(error, 'organizations')) {
    return { record: null, warning: 'Girilen kurum kayıtlı kurumlar listesinde bulunamadı. Yeni kayıt oluşturulacak.' }
  }
  if (error) return { error: error.message }
  return { record: data || null }
}

async function findRoleRecord(
  supabase: ReturnType<typeof createServiceClient>,
  input: { roleTable: string; entityKind: 'person' | 'organization'; masterId: string; roleScope: Record<string, unknown> }
) {
  let query = supabase.from(input.roleTable).select('*').limit(1)
  query = query.eq(input.entityKind === 'person' ? 'person_id' : 'organization_id', input.masterId)

  const companyId = clean(input.roleScope.company_id || input.roleScope.sirket_id)
  if (companyId && ['sirket_ortaklar', 'sirket_temsilciler', 'stakeholders'].includes(input.roleTable)) {
    const companyColumn = input.roleTable === 'stakeholders' ? 'company_id' : 'company_id'
    query = query.eq(companyColumn, companyId)
  }

  if (input.roleTable === 'employees' || input.roleTable === 'sirketler') {
    query = query.eq('is_active', true)
  } else {
    query = query.eq('status', 'Aktif')
  }

  const { data, error } = await query
  if (error) return { error: error.message, record: null }
  return { error: null, record: Array.isArray(data) ? data[0] || null : null }
}

function buildPrefill(entityKind: 'person' | 'organization', record: Record<string, any>) {
  if (entityKind === 'person') {
    return {
      person_id: record.id,
      ad: record.first_name || '',
      soyad: record.last_name || '',
      full_name: record.full_name || '',
      uyruk: normalizePersonUyruk(record.nationality),
      nationality: record.nationality || 'TR',
      nationality_country: record.nationality || 'TR',
      tc_kimlik: record.national_id || '',
      national_id: record.national_id || '',
      tax_id: record.national_id || record.passport_no || '',
      identity_number: record.national_id || record.passport_no || '',
      pasaport_no: record.passport_no || '',
      passport_no: record.passport_no || '',
      stakeholder_type: 'gercek_kisi',
      partner_type: 'gercek_kisi',
      person_or_entity_type: 'gercek_kisi',
      dogum_tarihi: record.birth_date || '',
      dogum_yeri: record.birth_place || '',
      cinsiyet: record.gender || '',
      cep_telefonu: record.phone || '',
      phone: record.phone || '',
      email: record.email || '',
      adres: record.address || '',
      address: record.address || '',
    }
  }

  return {
    organization_id: record.id,
    ticari_unvan: record.legal_name || '',
    legal_name: record.legal_name || '',
    kisa_unvan: record.short_name || '',
    short_name: record.short_name || '',
    ulke: record.country || 'TR',
    country: record.country || 'TR',
    nationality_country: record.country || 'TR',
    vkn_tckn: record.tax_number || '',
    tax_number: record.tax_number || '',
    tax_id: record.tax_number || '',
    identity_number: record.tax_number || '',
    ticaret_sicil_no: record.registration_number || '',
    registration_number: record.registration_number || '',
    stakeholder_type: 'tuzel_kisi',
    partner_type: 'tuzel_kisi',
    person_or_entity_type: 'tuzel_kisi',
    vergi_dairesi: record.tax_office || '',
    tax_office: record.tax_office || '',
    telefon: record.phone || '',
    phone: record.phone || '',
    email: record.email || '',
    adres: record.address || '',
    address: record.address || '',
    il: record.city || '',
    ilce: record.district || '',
  }
}

function buildNewMasterPrefill(entityKind: 'person' | 'organization', identity: z.infer<typeof ResolveSchema>['identity']) {
  if (entityKind === 'person') {
    return {
      uyruk: normalizePersonUyruk(identity.nationality),
      nationality: normalizeIdentityCountry(identity.nationality),
      nationality_country: normalizeIdentityCountry(identity.nationality),
      tc_kimlik: onlyDigits(identity.national_id),
      national_id: onlyDigits(identity.national_id),
      tax_id: onlyDigits(identity.national_id) || clean(identity.passport_no),
      identity_number: onlyDigits(identity.national_id) || clean(identity.passport_no),
      pasaport_no: clean(identity.passport_no),
      passport_no: clean(identity.passport_no),
      stakeholder_type: 'gercek_kisi',
      partner_type: 'gercek_kisi',
      person_or_entity_type: 'gercek_kisi',
    }
  }

  return {
    ulke: normalizeIdentityCountry(identity.country),
    country: normalizeIdentityCountry(identity.country),
    nationality_country: normalizeIdentityCountry(identity.country),
    vkn_tckn: onlyDigits(identity.tax_number),
    tax_number: onlyDigits(identity.tax_number),
    tax_id: onlyDigits(identity.tax_number),
    identity_number: onlyDigits(identity.tax_number),
    ticaret_sicil_no: clean(identity.registration_number),
    registration_number: clean(identity.registration_number),
    stakeholder_type: 'tuzel_kisi',
    partner_type: 'tuzel_kisi',
    person_or_entity_type: 'tuzel_kisi',
  }
}

function clean(value: unknown) {
  return String(value || '').trim()
}

function onlyDigits(value: unknown) {
  return clean(value).replace(/\D/g, '')
}

function normalizePersonUyruk(value: unknown) {
  return normalizeIdentityCountry(String(value || 'TR'))
}

function isMissingTableError(error: { message?: string; code?: string } | null, tableName: string) {
  const message = error?.message || ''
  return error?.code === 'PGRST205' || message.includes(`'public.${tableName}'`) || message.includes(`table '${tableName}'`) || message.includes('schema cache')
}
