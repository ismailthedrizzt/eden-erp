import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizeIdentityCountry } from '@/lib/identity-gate'
import { mergeMasterContactIntoRole } from '@/lib/identity/masterContact'

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

  let masterResult = payload.entityKind === 'person'
    ? await findPerson(supabase, identity)
    : await findOrganization(supabase, identity)

  if ('error' in masterResult) {
    return NextResponse.json({ error: masterResult.error }, { status: 400 })
  }

  if (!masterResult.record && !masterResult.warning) {
    masterResult = payload.entityKind === 'person'
      ? await findOrCreatePersonFromEmployee(supabase, identity)
      : await findOrCreateOrganizationFromCompany(supabase, identity)
  }

  const masterRecord = masterResult.record as Record<string, any> | null
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
        ? 'Kişi bulundu. Ana Kişi Kaydına bağlandı ve kayıtlı veriler çekildi.'
        : 'Tüzel kişi bulundu. Ana Kurum Kaydına bağlandı ve kayıtlı veriler çekildi.',
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
  let { data, error } = await query.maybeSingle()
  if (isMissingTableError(error, 'persons')) {
    return { record: null, warning: 'Girilen kişi kayıtlı kişiler listesinde bulunamadı. Yeni kayıt oluşturulacak.' }
  }
  if (error) return { error: error.message }
  if (!data && nationalId) {
    const fallback = await supabase
      .from('persons')
      .select('*')
      .eq('national_id', nationalId)
      .eq('is_deleted', false)
      .limit(1)
    if (fallback.error) return { error: fallback.error.message }
    data = Array.isArray(fallback.data) ? fallback.data[0] || null : null
  }
  return { record: data ? await enrichPersonFromEmployee(supabase, data) : null }
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
  let { data, error } = await query.maybeSingle()
  if (isMissingTableError(error, 'organizations')) {
    return { record: null, warning: 'Girilen kurum kayıtlı kurumlar listesinde bulunamadı. Yeni kayıt oluşturulacak.' }
  }
  if (error) return { error: error.message }
  if (!data && taxNumber) {
    const fallback = await supabase
      .from('organizations')
      .select('*')
      .eq('tax_number', taxNumber)
      .eq('is_deleted', false)
      .limit(1)
    if (fallback.error) return { error: fallback.error.message }
    data = Array.isArray(fallback.data) ? fallback.data[0] || null : null
  }
  return { record: data ? await enrichOrganizationFromCompany(supabase, data) : null }
}

async function enrichPersonFromEmployee(supabase: ReturnType<typeof createServiceClient>, person: Record<string, any>) {
  const existingImages = normalizePersonImages(person)

  let employee: Record<string, any> | null = null

  if (person.id) {
    const { data } = await supabase.from('employees').select('*').eq('person_id', person.id).limit(1)
    employee = Array.isArray(data) ? data[0] || null : null
  }

  if (!employee && person.national_id) {
    const { data } = await supabase.from('employees').select('*').eq('tc_kimlik', person.national_id).limit(1)
    employee = Array.isArray(data) ? data[0] || null : null
  }

  if (!employee && person.passport_no) {
    const { data } = await supabase.from('employees').select('*').eq('pasaport_no', person.passport_no).limit(1)
    employee = Array.isArray(data) ? data[0] || null : null
  }

  return employee
    ? mergeEmployeeIntoPerson({ ...person, photo_logo: existingImages }, employee)
    : { ...person, photo_logo: existingImages }
}

async function enrichOrganizationFromCompany(supabase: ReturnType<typeof createServiceClient>, organization: Record<string, any>) {
  const existingImages = normalizeOrganizationImages(organization)
  if (existingImages.length) return { ...organization, photo_logo: existingImages }

  let company: Record<string, any> | null = null

  if (organization.id) {
    const { data } = await supabase.from('sirketler').select('*').eq('is_active', true).eq('organization_id', organization.id).limit(1)
    company = Array.isArray(data) ? data[0] || null : null
  }

  if (!company && organization.tax_number) {
    const { data } = await supabase.from('sirketler').select('*').eq('is_active', true).eq('vkn_tckn', organization.tax_number).limit(1)
    company = Array.isArray(data) ? data[0] || null : null
  }

  if (!company && organization.registration_number) {
    const { data } = await supabase.from('sirketler').select('*').eq('is_active', true).eq('ticaret_sicil_no', organization.registration_number).limit(1)
    company = Array.isArray(data) ? data[0] || null : null
  }

  return company ? mergeCompanyIntoOrganization(organization, company) : organization
}

async function findOrCreatePersonFromEmployee(supabase: ReturnType<typeof createServiceClient>, identity: z.infer<typeof ResolveSchema>['identity']) {
  const nationality = normalizeIdentityCountry(identity.nationality)
  const nationalId = onlyDigits(identity.national_id)
  const passportNo = clean(identity.passport_no)

  if (!nationalId && !passportNo) return { record: null }

  let query = supabase.from('employees').select('*').limit(1)
  query = nationalId ? query.eq('tc_kimlik', nationalId) : query.eq('pasaport_no', passportNo)
  const { data, error } = await query
  if (error) return { record: null }

  const employee = Array.isArray(data) ? data[0] : null
  if (!employee) return { record: null }

  if (employee.person_id) {
    const { data: existingPerson } = await supabase.from('persons').select('*').eq('id', employee.person_id).maybeSingle()
    if (existingPerson) return { record: mergeEmployeeIntoPerson(existingPerson, employee) }
  }

  const fullName = [employee.ad, employee.soyad].filter(Boolean).join(' ').trim()
  const { data: created, error: createError } = await supabase
    .from('persons')
    .insert({
      first_name: employee.ad || null,
      last_name: employee.soyad || null,
      full_name: fullName,
      nationality: employee.uyruk || nationality,
      national_id: nationalId || null,
      passport_no: passportNo || null,
      birth_date: employee.dogum_tarihi || null,
      birth_place: employee.dogum_yeri || null,
      gender: employee.cinsiyet || null,
      phone: employee.cep_telefonu || employee.is_telefonu || null,
      email: employee.email || null,
      address: employee.adres || null,
      metadata_json: { source_table: 'employees', source_id: employee.id, source: 'identity_resolve' },
    })
    .select('*')
    .single()

  if (createError || !created) return { record: null }

  await supabase.from('employees').update({ person_id: created.id }).eq('id', employee.id)
  return { record: mergeEmployeeIntoPerson(created, employee) }
}

async function findOrCreateOrganizationFromCompany(supabase: ReturnType<typeof createServiceClient>, identity: z.infer<typeof ResolveSchema>['identity']) {
  const country = normalizeIdentityCountry(identity.country)
  const taxNumber = onlyDigits(identity.tax_number)
  const registrationNumber = clean(identity.registration_number)

  if (!taxNumber && !registrationNumber) return { record: null }

  let query = supabase.from('sirketler').select('*').eq('is_active', true).limit(1)
  query = taxNumber ? query.eq('vkn_tckn', taxNumber) : query.eq('ticaret_sicil_no', registrationNumber)
  const { data, error } = await query
  if (error) return { record: null }

  const company = Array.isArray(data) ? data[0] : null
  if (!company) return { record: null }

  if (company.organization_id) {
    const { data: existingOrganization } = await supabase.from('organizations').select('*').eq('id', company.organization_id).maybeSingle()
    if (existingOrganization) return { record: mergeCompanyIntoOrganization(existingOrganization, company) }
  }

  const { data: created, error: createError } = await supabase
    .from('organizations')
    .insert({
      legal_name: company.ticari_unvan,
      short_name: company.kisa_unvan || null,
      country: company.ulke || country,
      tax_number: taxNumber || null,
      registration_number: company.ticaret_sicil_no || company.mersis_no || registrationNumber || null,
      tax_office: company.vergi_dairesi || null,
      organization_type: company.sirket_turu || null,
      phone: company.telefon || null,
      email: company.email || null,
      address: company.adres || null,
      city: company.il || null,
      district: company.ilce || null,
      metadata_json: { source_table: 'sirketler', source_id: company.id, source: 'identity_resolve' },
    })
    .select('*')
    .single()

  if (createError || !created) return { record: null }

  await supabase.from('sirketler').update({ organization_id: created.id }).eq('id', company.id)
  return { record: mergeCompanyIntoOrganization(created, company) }
}

async function findRoleRecord(
  supabase: ReturnType<typeof createServiceClient>,
  input: { roleTable: string; entityKind: 'person' | 'organization'; masterId: string; roleScope: Record<string, unknown> }
) {
  let query = supabase.from(input.roleTable).select('*').limit(1)
  query = query.eq(input.entityKind === 'person' ? 'person_id' : 'organization_id', input.masterId)

  const companyId = clean(input.roleScope.company_id || input.roleScope.sirket_id)
  if (companyId && ['sirket_ortaklar', 'sirket_temsilciler', 'stakeholders'].includes(input.roleTable)) {
    query = query.eq(input.roleTable === 'stakeholders' ? 'company_id' : 'sirket_id', companyId)
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
    const firstName = record.first_name || record.ad || ''
    const lastName = record.last_name || record.soyad || ''
    const fullName = record.full_name || [firstName, lastName].filter(Boolean).join(' ')
    const documents = normalizePersonDocuments(record)
    const images = normalizePersonImages(record)
    const cvDocument = documents.find(document => document.slotId === 'cv') || documents[0] || null

    return mergeMasterContactIntoRole({
      person_id: record.id,
      ad: firstName,
      soyad: lastName,
      first_name: firstName,
      last_name: lastName,
      display_name: fullName,
      full_name: fullName,
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
      birth_date: record.birth_date || '',
      birth_place: record.birth_place || '',
      cinsiyet: record.gender || '',
      gender: record.gender || '',
      cep_telefonu: record.phone || '',
      phone: record.phone || '',
      email: record.email || '',
      adres: record.address || '',
      address: record.address || '',
      fotograf_url: images[0]?.previewUrl || images[0]?.url || '',
      photo_logo: images,
      cv_belgesi: cvDocument,
      partner_documents: documents,
      authority_documents: documents,
      stakeholder_documents: documents,
      document_summary: documents,
    }, record, 'person')
  }

  const legalName = record.legal_name || record.ticari_unvan || ''
  const shortName = record.short_name || record.kisa_unvan || ''
  const documents = normalizeOrganizationDocuments(record)

  return mergeMasterContactIntoRole({
    organization_id: record.id,
    ticari_unvan: legalName,
    legal_name: legalName,
    trade_name: legalName,
    display_name: legalName || shortName,
    kisa_unvan: shortName,
    short_name: shortName,
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
    city: record.city || '',
    ilce: record.district || '',
    district: record.district || '',
    foundation_date: record.foundation_date || record.kurulus_tarihi || '',
    company_type: record.organization_type || record.sirket_turu || '',
    photo_logo: normalizeOrganizationImages(record),
    partner_documents: documents,
    authority_documents: documents,
    stakeholder_documents: documents,
    document_summary: documents,
  }, record, 'organization')
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

function mergeEmployeeIntoPerson(person: Record<string, any>, employee: Record<string, any>) {
  return {
    ...person,
    first_name: person.first_name || employee.ad || '',
    last_name: person.last_name || employee.soyad || '',
    full_name: person.full_name || [employee.ad, employee.soyad].filter(Boolean).join(' '),
    nationality: person.nationality || employee.uyruk || 'TR',
    national_id: person.national_id || employee.tc_kimlik || '',
    passport_no: person.passport_no || employee.pasaport_no || '',
    birth_date: person.birth_date || employee.dogum_tarihi || '',
    birth_place: person.birth_place || employee.dogum_yeri || '',
    gender: person.gender || employee.cinsiyet || '',
    phone: person.phone || employee.cep_telefonu || employee.is_telefonu || '',
    email: person.email || employee.email || '',
    address: person.address || employee.adres || '',
    engellilik: person.engellilik ?? employee.engellilik ?? false,
    engellilik_yuzdesi: person.engellilik_yuzdesi ?? employee.engellilik_yuzdesi ?? null,
    askerlik_durumu: person.askerlik_durumu || employee.askerlik_durumu || '',
    tecil_tarihi: person.tecil_tarihi || employee.tecil_tarihi || '',
    hukumluluk: person.hukumluluk ?? employee.hukumluluk ?? false,
    okuryazar_degil: person.okuryazar_degil ?? employee.okuryazar_degil ?? false,
    egitim_okullari: Array.isArray(person.egitim_okullari) ? person.egitim_okullari : Array.isArray(employee.egitim_okullari) ? employee.egitim_okullari : [],
    yabanci_diller: Array.isArray(person.yabanci_diller) ? person.yabanci_diller : Array.isArray(employee.yabanci_diller) ? employee.yabanci_diller : [],
    sertifikalar: Array.isArray(person.sertifikalar) ? person.sertifikalar : Array.isArray(employee.sertifikalar) ? employee.sertifikalar : [],
    medeni_durum: person.medeni_durum || employee.medeni_durum || '',
    marital_status: person.marital_status || employee.medeni_durum || '',
    yakinlar: Array.isArray(person.yakinlar) ? person.yakinlar : Array.isArray(employee.yakinlar) ? employee.yakinlar : [],
    iban: person.iban || employee.iban || '',
    occupation: person.occupation || employee.occupation || employee.profession || employee.meslek || '',
    profession: person.profession || employee.profession || employee.meslek || '',
    meslek: person.meslek || employee.meslek || employee.profession || '',
    blood_type: person.blood_type || employee.kan_grubu || '',
    kan_grubu: person.kan_grubu || employee.kan_grubu || '',
    photo_logo: normalizePersonImages(person).length ? normalizePersonImages(person) : normalizePersonImages(employee),
    partner_documents: normalizePersonDocuments(employee),
  }
}

function mergeCompanyIntoOrganization(organization: Record<string, any>, company: Record<string, any>) {
  return {
    ...organization,
    legal_name: organization.legal_name || company.ticari_unvan || '',
    short_name: organization.short_name || company.kisa_unvan || '',
    country: organization.country || company.ulke || 'TR',
    tax_number: organization.tax_number || company.vkn_tckn || '',
    registration_number: organization.registration_number || company.ticaret_sicil_no || company.mersis_no || '',
    tax_office: organization.tax_office || company.vergi_dairesi || '',
    organization_type: organization.organization_type || company.sirket_turu || '',
    phone: organization.phone || company.telefon || '',
    email: organization.email || company.email || '',
    address: organization.address || company.adres || '',
    city: organization.city || company.il || '',
    district: organization.district || company.ilce || '',
    foundation_date: organization.foundation_date || company.kurulus_tarihi || '',
    photo_logo: normalizeOrganizationImages(company),
    partner_documents: normalizeOrganizationDocuments(company),
  }
}

function normalizePersonImages(record: Record<string, any>) {
  const existing = Array.isArray(record.photo_logo) ? record.photo_logo : []
  if (existing.length) return existing
  const url = record.fotograf_url || record.photo_url || record.image_url
  return url ? [{ slotId: 'photo_logo', name: 'Fotoğraf', previewUrl: url, url }] : []
}

function normalizeOrganizationImages(record: Record<string, any>) {
  const existing = Array.isArray(record.photo_logo) ? record.photo_logo : []
  if (existing.length) return existing

  const heroImages = Array.isArray(record.hero_images) ? record.hero_images : []
  if (heroImages.length) {
    return heroImages.map((image: Record<string, any>) => ({
      ...image,
      slotId: image.slotId || image.slot_id || 'photo_logo',
      previewUrl: image.previewUrl || image.preview_url || image.url,
    }))
  }

  const logoUrl = record.logo_url || record.logoUrl
  return logoUrl ? [{ slotId: 'photo_logo', name: 'Logo', previewUrl: logoUrl, url: logoUrl }] : []
}

function normalizePersonDocuments(record: Record<string, any>) {
  const existing = Array.isArray(record.partner_documents) ? record.partner_documents : []
  if (existing.length) return existing

  const docs: Record<string, any>[] = []
  if (record.cv_belgesi && typeof record.cv_belgesi === 'object') {
    docs.push({ slotId: 'cv', title: 'CV', ...record.cv_belgesi })
  }
  if (record.diploma_belgesi && typeof record.diploma_belgesi === 'object') {
    docs.push({ slotId: 'diploma', title: 'Diploma', ...record.diploma_belgesi })
  }
  if (Array.isArray(record.ise_giris_belgeleri)) docs.push(...record.ise_giris_belgeleri)
  if (Array.isArray(record.isten_cikis_belgeleri)) docs.push(...record.isten_cikis_belgeleri)

  return docs.map((doc, index) => ({
    ...doc,
    slotId: doc.slotId || doc.slot_id || `employee_document_${index + 1}`,
    name: doc.name || doc.fileName || doc.title || 'Belge',
    type: doc.type || doc.mime_type || doc.mimeType || 'application/octet-stream',
    size: doc.size || doc.file_size || 0,
    url: doc.url || doc.previewUrl || doc.preview_url,
    previewUrl: doc.previewUrl || doc.preview_url || doc.url,
    thumbnailUrl: doc.thumbnailUrl || doc.thumbnail_url || doc.preview_thumb_url || doc.preview_image_url,
  }))
}

function normalizeOrganizationDocuments(record: Record<string, any>) {
  const existing = Array.isArray(record.partner_documents) ? record.partner_documents : []
  if (existing.length) return existing

  const docs = Array.isArray(record.hero_documents) ? record.hero_documents : []
  return docs.map((doc: Record<string, any>, index: number) => ({
    ...doc,
    slotId: doc.slotId || doc.slot_id || `company_document_${index + 1}`,
    name: doc.name || doc.fileName || doc.title || 'Belge',
    type: doc.type || doc.mime_type || doc.mimeType || 'application/octet-stream',
    size: doc.size || doc.file_size || 0,
    url: doc.url || doc.previewUrl || doc.preview_url,
    previewUrl: doc.previewUrl || doc.preview_url || doc.url,
    thumbnailUrl: doc.thumbnailUrl || doc.thumbnail_url || doc.preview_thumb_url || doc.preview_image_url,
  }))
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
