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
  'companies',
  'company_partners',
  'company_representatives',
  'stakeholders',
])

const PERSON_SELECT = 'id,first_name,last_name,full_name,nationality,national_id,passport_no,birth_date,birth_place,gender,phone,email,address,city,district,metadata_json,updated_at'
const ORGANIZATION_SELECT = 'id,legal_name,short_name,country,tax_number,registration_number,tax_office,organization_type,phone,email,address,city,district,metadata_json,updated_at'
const EMPLOYEE_IDENTITY_SELECT = 'id,person_id,nationality,national_id,passport_no,birth_date,birth_place,gender,mobile_phone,work_phone,email,address,phones,emails,job_title,is_illiterate,education_schools,foreign_languages,certificates,marital_status,relatives,iban,photo_url,cv_document,diploma_document,entry_documents,exit_documents'
const COMPANY_IDENTITY_SELECT = 'id,organization_id,trade_name,short_name,country,tax_number,trade_registry_number,mersis_number,tax_office,company_type,phone,email,address,city,district,foundation_date,logo_url,hero_images,hero_documents'
const ROLE_SELECT_BY_TABLE: Record<string, string> = {
  employees: 'id,person_id,national_id,passport_no,work_status',
  companies: 'id,organization_id,trade_name,short_name,tax_number,trade_registry_number',
  company_partners: 'id,company_id,company_id,person_id,organization_id,display_name,partner_name,first_name,last_name,identity_tax_number,share_ratio,share_ratio,status',
  company_representatives: 'id,company_id,company_id,person_id,organization_id,display_name,full_name,authority_types,status',
  stakeholders: 'id,company_id,person_id,organization_id,display_name,tax_id,stakeholder_type,status',
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
  const roleTable = payload.roleTable
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

  let query = supabase.from('persons').select(PERSON_SELECT).eq('nationality', nationality)
  query = nationalId ? query.eq('national_id', nationalId) : query.eq('passport_no', passportNo)
  let { data, error } = await query.maybeSingle()
  if (isMissingTableError(error, 'persons')) {
    return { record: null, warning: 'Girilen kişi kayıtlı kişiler listesinde bulunamadı. Yeni kayıt oluşturulacak.' }
  }
  if (error) return { error: error.message }
  if (!data && nationalId) {
    const fallback = await supabase
      .from('persons')
      .select(PERSON_SELECT)
      .eq('national_id', nationalId)
      
      .limit(1)
    if (fallback.error) return { error: fallback.error.message }
    data = Array.isArray(fallback.data) ? fallback.data[0] || null : null
  }
  return { record: data ? await enrichPersonFromEmployee(supabase, data) : null }
}

async function findOrganization(supabase: ReturnType<typeof createServiceClient>, identity: z.infer<typeof ResolveSchema>['identity']) {
  const country = normalizeIdentityCountry(identity.country)
  const taxNumber = normalizeOrganizationTaxNumber(identity.tax_number, country)
  const registrationNumber = clean(identity.registration_number)

  if (!taxNumber && !registrationNumber) {
    return { error: 'Devam etmek için VKN veya Ticaret Sicil No girin.' }
  }

  let query = supabase.from('organizations').select(ORGANIZATION_SELECT).eq('country', country)
  query = taxNumber ? query.eq('tax_number', taxNumber) : query.eq('registration_number', registrationNumber)
  let { data, error } = await query.maybeSingle()
  if (isMissingTableError(error, 'organizations')) {
    return { record: null, warning: 'Girilen kurum kayıtlı kurumlar listesinde bulunamadı. Yeni kayıt oluşturulacak.' }
  }
  if (error) return { error: error.message }
  if (!data && taxNumber) {
    const fallback = await supabase
      .from('organizations')
      .select(ORGANIZATION_SELECT)
      .eq('tax_number', taxNumber)
      
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
    const { data } = await supabase.from('employees').select(EMPLOYEE_IDENTITY_SELECT).eq('person_id', person.id).limit(1)
    employee = Array.isArray(data) ? data[0] || null : null
  }

  if (!employee && person.national_id) {
    const { data } = await supabase.from('employees').select(EMPLOYEE_IDENTITY_SELECT).eq('national_id', person.national_id).limit(1)
    employee = Array.isArray(data) ? data[0] || null : null
  }

  if (!employee && person.passport_no) {
    const { data } = await supabase.from('employees').select(EMPLOYEE_IDENTITY_SELECT).eq('passport_no', person.passport_no).limit(1)
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
    const { data } = await supabase.from('companies').select(COMPANY_IDENTITY_SELECT).eq('organization_id', organization.id).limit(1)
    company = Array.isArray(data) ? data[0] || null : null
  }

  if (!company && organization.tax_number) {
    const { data } = await supabase.from('companies').select(COMPANY_IDENTITY_SELECT).eq('tax_number', organization.tax_number).limit(1)
    company = Array.isArray(data) ? data[0] || null : null
  }

  if (!company && organization.registration_number) {
    const { data } = await supabase.from('companies').select(COMPANY_IDENTITY_SELECT).eq('trade_registry_number', organization.registration_number).limit(1)
    company = Array.isArray(data) ? data[0] || null : null
  }

  return company ? mergeCompanyIntoOrganization(organization, company) : organization
}

async function findOrCreatePersonFromEmployee(supabase: ReturnType<typeof createServiceClient>, identity: z.infer<typeof ResolveSchema>['identity']) {
  const nationality = normalizeIdentityCountry(identity.nationality)
  const nationalId = onlyDigits(identity.national_id)
  const passportNo = clean(identity.passport_no)

  if (!nationalId && !passportNo) return { record: null }

  let query = supabase.from('employees').select(EMPLOYEE_IDENTITY_SELECT).limit(1)
  query = nationalId ? query.eq('national_id', nationalId) : query.eq('passport_no', passportNo)
  const { data, error } = await query
  if (error) return { record: null }

  const employee = Array.isArray(data) ? data[0] as Record<string, any> : null
  if (!employee) return { record: null }

  if (employee.person_id) {
    const { data: existingPerson } = await supabase.from('persons').select(PERSON_SELECT).eq('id', employee.person_id).maybeSingle()
    if (existingPerson) return { record: mergeEmployeeIntoPerson(existingPerson, employee) }
  }

  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim()
  const { data: created, error: createError } = await supabase
    .from('persons')
    .insert({
      first_name: employee.first_name || null,
      last_name: employee.last_name || null,
      full_name: fullName,
      nationality: employee.nationality || nationality,
      national_id: nationalId || null,
      passport_no: passportNo || null,
      birth_date: employee.birth_date || null,
      birth_place: employee.birth_place || null,
      gender: employee.gender || null,
      phone: employee.mobile_phone || employee.work_phone || null,
      email: employee.email || null,
      address: employee.address || null,
      metadata_json: { source_table: 'employees', source_id: employee.id, source: 'identity_resolve' },
    })
    .select(PERSON_SELECT)
    .single()

  if (createError || !created) return { record: null }

  await supabase.from('employees').update({ person_id: created.id }).eq('id', employee.id)
  return { record: mergeEmployeeIntoPerson(created, employee) }
}

async function findOrCreateOrganizationFromCompany(supabase: ReturnType<typeof createServiceClient>, identity: z.infer<typeof ResolveSchema>['identity']) {
  const country = normalizeIdentityCountry(identity.country)
  const taxNumber = normalizeOrganizationTaxNumber(identity.tax_number, country)
  const registrationNumber = clean(identity.registration_number)

  if (!taxNumber && !registrationNumber) return { record: null }

  let query = supabase.from('companies').select(COMPANY_IDENTITY_SELECT).limit(1)
  query = taxNumber ? query.eq('tax_number', taxNumber) : query.eq('trade_registry_number', registrationNumber)
  const { data, error } = await query
  if (error) return { record: null }

  const company = Array.isArray(data) ? data[0] : null
  if (!company) return { record: null }

  if (company.organization_id) {
    const { data: existingOrganization } = await supabase.from('organizations').select(ORGANIZATION_SELECT).eq('id', company.organization_id).maybeSingle()
    if (existingOrganization) return { record: mergeCompanyIntoOrganization(existingOrganization, company) }
  }

  const { data: created, error: createError } = await supabase
    .from('organizations')
    .insert({
      legal_name: company.trade_name,
      short_name: company.short_name || null,
      country: company.country || country,
      tax_number: taxNumber || null,
      registration_number: company.trade_registry_number || company.mersis_number || registrationNumber || null,
      tax_office: company.tax_office || null,
      organization_type: company.company_type || null,
      phone: company.phone || null,
      email: company.email || null,
      address: company.address || null,
      city: company.city || null,
      district: company.district || null,
      metadata_json: { source_table: 'companies', source_id: company.id, source: 'identity_resolve' },
    })
    .select(ORGANIZATION_SELECT)
    .single()

  if (createError || !created) return { record: null }

  await supabase.from('companies').update({ organization_id: created.id }).eq('id', company.id)
  return { record: mergeCompanyIntoOrganization(created, company) }
}

async function findRoleRecord(
  supabase: ReturnType<typeof createServiceClient>,
  input: { roleTable: string; entityKind: 'person' | 'organization'; masterId: string; roleScope: Record<string, unknown> }
) {
  const shouldFilterDeleted = ['employees', 'company_partners', 'company_representatives', 'stakeholders'].includes(input.roleTable)
  let { data, error } = await queryRoleRecord(supabase, input, shouldFilterDeleted)

  if (error && shouldFilterDeleted && isMissingColumnError(error, 'is_deleted')) {
    const retry = await queryRoleRecord(supabase, input, false)
    data = retry.data
    error = retry.error
  }

  if (error) return { error: error.message, record: null }
  return { error: null, record: Array.isArray(data) ? data[0] || null : null }
}

async function queryRoleRecord(
  supabase: ReturnType<typeof createServiceClient>,
  input: { roleTable: string; entityKind: 'person' | 'organization'; masterId: string; roleScope: Record<string, unknown> },
  filterDeleted: boolean
) {
  let query = supabase.from(input.roleTable).select(ROLE_SELECT_BY_TABLE[input.roleTable] || 'id').limit(1)
  query = query.eq(input.entityKind === 'person' ? 'person_id' : 'organization_id', input.masterId)

  const companyId = clean(input.roleScope.company_id || input.roleScope.company_id)
  if (companyId && input.roleTable === 'company_representatives') {
    query = query.eq('company_id', companyId)
  }

  if (filterDeleted) query = query.eq('is_deleted', false)
  return query
}

function buildPrefill(entityKind: 'person' | 'organization', record: Record<string, any>) {
  if (entityKind === 'person') {
    const firstName = record.first_name || record.first_name || ''
    const lastName = record.last_name || record.last_name || ''
    const fullName = record.full_name || [firstName, lastName].filter(Boolean).join(' ')
    const documents = normalizePersonDocuments(record)
    const images = normalizePersonImages(record)
    const cvDocument = documents.find(document => document.slotId === 'cv') || documents[0] || null

    return mergeMasterContactIntoRole({
      person_id: record.id,
      first_name: firstName,
      last_name: lastName,
      display_name: fullName,
      full_name: fullName,
      nationality: normalizePersonUyruk(record.nationality),      nationality_country: record.nationality || 'TR',
      national_id: record.national_id || '',      tax_id: record.national_id || record.passport_no || '',
      identity_number: record.national_id || record.passport_no || '',
      passport_no: record.passport_no || '',      stakeholder_type: 'person',
      partner_type: 'person',
      person_or_entity_type: 'person',
      birth_date: record.birth_date || '',
      birth_place: record.birth_place || '',     gender: record.gender || '',      mobile_phone: record.phone || '',
      work_phone: record.work_phone || '',
      phone: record.phone || '',
      email: record.email || '',
      phones: Array.isArray(record.phones) ? record.phones : [],
      emails: Array.isArray(record.emails) ? record.emails : [],
      address: record.address || '',
      job_title: record.job_title || record.occupation || '',
      occupation: record.occupation || record.job_title || '',
      photo_url: images[0]?.previewUrl || images[0]?.url || '',
      photo_logo: images,
      cv_document: cvDocument,
      partner_documents: documents,
      authority_documents: documents,
      stakeholder_documents: documents,
      document_summary: documents,
    }, record, 'person')
  }

  const legalName = record.legal_name || record.trade_name || ''
  const shortName = record.short_name || record.short_name || ''
  const documents = normalizeOrganizationDocuments(record)

  return mergeMasterContactIntoRole({
    organization_id: record.id,
    trade_name: legalName,
    legal_name: legalName,    display_name: legalName || shortName,
    short_name: shortName,    country: record.country || 'TR',    nationality_country: record.country || 'TR',
    tax_number: record.tax_number || '',    tax_id: record.tax_number || '',
    identity_number: record.tax_number || '',
    trade_registry_number: record.registration_number || '',
    registration_number: record.registration_number || '',
    stakeholder_type: 'organization',
    partner_type: 'organization',
    person_or_entity_type: 'organization',
    tax_office: record.tax_office || '',    phone: record.phone || '',
    email: record.email || '',
    address: record.address || '',    city: record.city || '',    district: record.district || '',    foundation_date: record.foundation_date || record.foundation_date || '',
    company_type: record.organization_type || record.company_type || '',
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
      nationality: normalizePersonUyruk(identity.nationality),      nationality_country: normalizeIdentityCountry(identity.nationality),
      national_id: onlyDigits(identity.national_id),      tax_id: onlyDigits(identity.national_id) || clean(identity.passport_no),
      identity_number: onlyDigits(identity.national_id) || clean(identity.passport_no),
      passport_no: clean(identity.passport_no),      stakeholder_type: 'person',
      partner_type: 'person',
      person_or_entity_type: 'person',
    }
  }

  return {
    country: normalizeIdentityCountry(identity.country),    nationality_country: normalizeIdentityCountry(identity.country),
    tax_number: normalizeOrganizationTaxNumber(identity.tax_number, identity.country),    tax_id: normalizeOrganizationTaxNumber(identity.tax_number, identity.country),
    identity_number: normalizeOrganizationTaxNumber(identity.tax_number, identity.country),
    trade_registry_number: clean(identity.registration_number),
    registration_number: clean(identity.registration_number),
    stakeholder_type: 'organization',
    partner_type: 'organization',
    person_or_entity_type: 'organization',
  }
}

function mergeEmployeeIntoPerson(person: Record<string, any>, employee: Record<string, any>) {
  return {
    ...person,
    first_name: person.first_name || employee.first_name || '',
    last_name: person.last_name || employee.last_name || '',
    full_name: person.full_name || [employee.first_name, employee.last_name].filter(Boolean).join(' '),
    nationality: person.nationality || employee.nationality || 'TR',
    national_id: person.national_id || employee.national_id || '',
    passport_no: person.passport_no || employee.passport_no || '',
    birth_date: person.birth_date || employee.birth_date || '',
    birth_place: person.birth_place || employee.birth_place || '',
    gender: person.gender || employee.gender || '',
    phone: person.phone || employee.mobile_phone || employee.work_phone || '',
    mobile_phone: employee.mobile_phone || person.phone || '',
    work_phone: employee.work_phone || '',
    email: person.email || employee.email || '',
    phones: normalizeRolePhones({
      phones: employee.phones,
      phone: person.phone || employee.mobile_phone,
      mobile_phone: employee.mobile_phone,
      work_phone: employee.work_phone,
    }),
    emails: normalizeRoleEmails({
      emails: employee.emails,
      email: person.email || employee.email,
    }),
    address: person.address || employee.address || '',
    is_illiterate: person.is_illiterate ?? employee.is_illiterate ?? false,
    education_schools: Array.isArray(person.education_schools) ? person.education_schools : Array.isArray(employee.education_schools) ? employee.education_schools : [],
    foreign_languages: Array.isArray(person.foreign_languages) ? person.foreign_languages : Array.isArray(employee.foreign_languages) ? employee.foreign_languages : [],
    certificates: Array.isArray(person.certificates) ? person.certificates : Array.isArray(employee.certificates) ? employee.certificates : [],
    marital_status: person.marital_status || employee.marital_status || '',    relatives: Array.isArray(person.relatives) ? person.relatives : Array.isArray(employee.relatives) ? employee.relatives : [],
    iban: person.iban || employee.iban || '',
    occupation: person.occupation || employee.occupation || employee.job_title || '',
    job_title: employee.job_title || person.job_title || person.occupation || employee.occupation || '',
    photo_logo: normalizePersonImages(person).length ? normalizePersonImages(person) : normalizePersonImages(employee),
    partner_documents: normalizePersonDocuments(employee),
  }
}

function mergeCompanyIntoOrganization(organization: Record<string, any>, company: Record<string, any>) {
  return {
    ...organization,
    legal_name: organization.legal_name || company.trade_name || '',
    short_name: organization.short_name || company.short_name || '',
    country: organization.country || company.country || 'TR',
    tax_number: organization.tax_number || company.tax_number || '',
    registration_number: organization.registration_number || company.trade_registry_number || company.mersis_number || '',
    tax_office: organization.tax_office || company.tax_office || '',
    organization_type: organization.organization_type || company.company_type || '',
    phone: organization.phone || company.phone || '',
    email: organization.email || company.email || '',
    address: organization.address || company.address || '',
    city: organization.city || company.city || '',
    district: organization.district || company.district || '',
    foundation_date: organization.foundation_date || company.foundation_date || '',
    photo_logo: normalizeOrganizationImages(company),
    partner_documents: normalizeOrganizationDocuments(company),
  }
}

function normalizePersonImages(record: Record<string, any>) {
  const existing = Array.isArray(record.photo_logo) ? record.photo_logo : []
  if (existing.length) return existing
  const url = record.photo_url || record.photo_url || record.image_url
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
  if (record.cv_document && typeof record.cv_document === 'object') {
    docs.push({ slotId: 'cv', title: 'CV', ...record.cv_document })
  }
  if (record.diploma_document && typeof record.diploma_document === 'object') {
    docs.push({ slotId: 'diploma', title: 'Diploma', ...record.diploma_document })
  }
  if (Array.isArray(record.entry_documents)) docs.push(...record.entry_documents)
  if (Array.isArray(record.exit_documents)) docs.push(...record.exit_documents)

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

function normalizeRolePhones(source: Record<string, any>) {
  const raw = Array.isArray(source.phones) && source.phones.length
    ? source.phones
    : [
        source.phone || source.mobile_phone || source.phone || source.phone_1,
        source.work_phone || source.phone_2,
      ].filter(Boolean).map((phone, index) => ({ label: index === 0 ? 'Primary' : 'Secondary', phone }))

  return raw
    .filter((item: any) => item && typeof item === 'object')
    .map((item: Record<string, any>, index: number) => ({
      label: clean(item.label || (index === 0 ? 'Primary' : 'Secondary')),
      phone: clean(item.phone),
    }))
    .filter((item: Record<string, any>) => item.phone)
}

function normalizeRoleEmails(source: Record<string, any>) {
  const raw = Array.isArray(source.emails) && source.emails.length
    ? source.emails
    : [source.email || source.email_1, source.email_2]
        .filter(Boolean)
        .map((address, index) => ({ label: index === 0 ? 'Primary' : 'Secondary', address }))

  return raw
    .filter((item: any) => item && typeof item === 'object')
    .map((item: Record<string, any>, index: number) => ({
      label: clean(item.label || (index === 0 ? 'Primary' : 'Secondary')),
      address: clean(item.address || item.email).toLowerCase(),
    }))
    .filter((item: Record<string, any>) => item.address)
}

function clean(value: unknown) {
  return String(value || '').trim()
}

function onlyDigits(value: unknown) {
  return clean(value).replace(/\D/g, '')
}

function normalizeOrganizationTaxNumber(value: unknown, country?: unknown) {
  const normalizedCountry = normalizeIdentityCountry(String(country || 'TR'))
  const text = clean(value)
  return normalizedCountry === 'TR'
    ? text.replace(/\D/g, '')
    : text.replace(/[^A-Za-z0-9 ._/-]/g, '').toUpperCase()
}

function normalizePersonUyruk(value: unknown) {
  return normalizeIdentityCountry(String(value || 'TR'))
}

function isMissingTableError(error: { message?: string; code?: string } | null, tableName: string) {
  const message = error?.message || ''
  return error?.code === 'PGRST205' || message.includes(`'public.${tableName}'`) || message.includes(`table '${tableName}'`) || message.includes('schema cache')
}

function isMissingColumnError(error: { message?: string; code?: string } | null, columnName: string) {
  const message = error?.message || ''
  return message.includes(columnName) && (message.includes('does not exist') || message.includes('schema cache'))
}
