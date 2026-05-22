type SupabaseClient = {
  from: (table: string) => any
}

type EntityKind = 'person' | 'organization'

const CONTACT_METADATA_KEY = 'contact'
const PERSON_MASTER_METADATA_KEY = 'person_master'
const ORGANIZATION_MASTER_METADATA_KEY = 'organization_master'

const PERSON_CONTACT_SELECT = 'id,first_name,last_name,full_name,nationality,national_id,passport_no,birth_date,birth_place,gender,phone,email,address,city,district,metadata_json'
const ORGANIZATION_CONTACT_SELECT = 'id,legal_name,trade_name,short_name,country,tax_number,registration_number,tax_office,organization_type,phone,email,address,city,district,metadata_json'
const EMPLOYEE_MASTER_ENRICH_SELECT = 'id,person_id,national_id,passport_no,is_illiterate,education_schools,foreign_languages,certificates,marital_status,relatives,iban,job_title'

const PERSON_MASTER_PROFILE_KEYS = [
  'photo_logo',
  'photo_url',
  'is_illiterate',
  'education_schools',
  'foreign_languages',
  'certificates',
  'marital_status',
  'relatives',
  'iban',
  'bank_name',
  'occupation',
  'job_title',
]

const ORGANIZATION_MASTER_PROFILE_KEYS = [
  'contact_points',
  'beneficiary_full_name',
  'beneficiary_address',
  'beneficiary_iban',
  'beneficiary_account_no',
  'beneficiary_iban_or_account_no',
  'beneficiary_bank_code',
  'beneficiary_swift_bic',
  'beneficiary_bank_name',
  'beneficiary_bank_address',
  'beneficiary_currency',
]

const MASTER_PROFILE_KEYS = new Set([
  'first_name',
  'last_name',
  'full_name',
  'display_name',
  'trade_name',
  'legal_name',
  'short_name',
  'nationality',
  'nationality_country',
  'national_id',
  'passport_no',
  'identity_number',
  'tax_id',
  'tax_number',
  'trade_registry_number',
  'registration_number',
  'mersis_number',
  'birth_date',
  'birth_place',
  'gender',
  'tax_office',
  'company_type',
  'foundation_date',
  'phone',
  'mobile_phone',
  'email',
  'address',
  'city',
  'district',
  'phones',
  'emails',
  'entity_bank_accounts',
  ...ORGANIZATION_MASTER_PROFILE_KEYS,
  ...PERSON_MASTER_PROFILE_KEYS,
])

export function stripMasterDataForRoleProfile(source: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) =>
      !MASTER_PROFILE_KEYS.has(key) &&
      value !== undefined
    )
  )
}

export function normalizeContactPayload(source: Record<string, any>, kind: EntityKind) {
  const phones = normalizePhones(source)
  const emails = normalizeEmails(source)
  const phone = clean(source.phone || source.mobile_phone || source.phone_1 || phones[0]?.phone)
  const email = clean(source.email || source.email_1 || emails[0]?.address).toLowerCase()
  const address = clean(source.address)
  const city = clean(source.city)
  const district = clean(source.district)

  return {
    phone: phone || null,
    email: email || null,
    address: address || null,
    city: city || null,
    district: district || null,
    phones,
    emails,
    emergency_contact: kind === 'person'
      ? {
          first_name: clean(source.emergency_contact_first_name) || null,
          last_name: clean(source.emergency_contact_last_name) || null,
          relationship: clean(source.emergency_contact_relationship) || null,
          phone: clean(source.emergency_contact_phone) || null,
        }
      : null,
  }
}

export function mergeMasterContactIntoRole(role: Record<string, any>, master: Record<string, any> | null, kind: EntityKind) {
  if (!master) return role

  const contact = readContactMetadata(master)
  const contactPhones = Array.isArray(contact.phones) && contact.phones.length ? contact.phones : master.phones
  const contactEmails = Array.isArray(contact.emails) && contact.emails.length ? contact.emails : master.emails
  const phones = normalizePhones({ phones: contactPhones, phone: master.phone || master.mobile_phone, work_phone: master.work_phone })
  const emails = normalizeEmails({ emails: contactEmails, email: master.email })
  const personMaster = kind === 'person' ? readPersonMasterMetadata(master) : {}
  const organizationMaster = {}
  const rolePhones = normalizePhones({ phones: role.phones, phone: role.phone || role.mobile_phone || role.phone_1, work_phone: role.work_phone || role.phone_2 })
  const roleEmails = normalizeEmails({ emails: role.emails, email: role.email || role.email_1 })
  const emergency = kind === 'person' && contact.emergency_contact && typeof contact.emergency_contact === 'object'
    ? contact.emergency_contact
    : {}
  const masterWithMetadata = kind === 'person' ? { ...master, ...personMaster } : { ...master, ...organizationMaster }
  const photoLogo: Array<Record<string, any>> = normalizeMasterImages(
    masterWithMetadata,
    kind,
    kind === 'organization' ? role.photo_logo || role.hero_images : undefined
  )

  return {
    ...role,
    ...personMaster,
    ...organizationMaster,
    ...(kind === 'person'
      ? {
          first_name: master.first_name || '',
          last_name: master.last_name || '',
          full_name: master.full_name || [master.first_name, master.last_name].filter(Boolean).join(' '),
          display_name: master.full_name || [master.first_name, master.last_name].filter(Boolean).join(' '),
        }
      : {
          trade_name: master.trade_name || master.legal_name || '',
          legal_name: master.legal_name || master.trade_name || '',
          short_name: master.short_name || '',
          display_name: master.legal_name || master.trade_name || master.short_name || '',
        }),
    phone: kind === 'organization' ? clean(role.phone) || master.phone || '' : master.phone || '',
    mobile_phone: kind === 'organization' ? clean(role.mobile_phone || role.phone) || master.phone || '' : master.phone || '',
    email: kind === 'organization' ? clean(role.email) || master.email || '' : master.email || '',
    address: kind === 'organization' ? clean(role.address) || master.address || '' : master.address || '',
    city: kind === 'organization' ? clean(role.city) || master.city || '' : master.city || '',
    district: kind === 'organization' ? clean(role.district) || master.district || '' : master.district || '',
    phone_1: kind === 'organization' ? rolePhones[0]?.phone || phones[0]?.phone || master.phone || '' : phones[0]?.phone || master.phone || '',
    phone_2: kind === 'organization' ? rolePhones[1]?.phone || phones[1]?.phone || '' : phones[1]?.phone || '',
    email_1: kind === 'organization' ? roleEmails[0]?.address || emails[0]?.address || master.email || '' : emails[0]?.address || master.email || '',
    email_2: kind === 'organization' ? roleEmails[1]?.address || emails[1]?.address || '' : emails[1]?.address || '',
    phones: kind === 'organization' && rolePhones.length ? rolePhones : phones,
    emails: kind === 'organization' && roleEmails.length ? roleEmails : emails,
    photo_logo: photoLogo,
    photo_url: photoLogo[0]?.previewUrl || photoLogo[0]?.url || '',
    ...(kind === 'person'
      ? {
          emergency_contact_first_name: emergency.first_name || '',
          emergency_contact_last_name: emergency.last_name || '',
          emergency_contact_relationship: emergency.relationship || '',
          emergency_contact_phone: emergency.phone || '',
        }
      : {}),
  }
}

function normalizeMasterImages(master: Record<string, any>, kind: EntityKind, fallback: unknown) {
  const roleImages = Array.isArray(fallback) ? fallback : []
  const masterImages = Array.isArray(master.photo_logo) ? master.photo_logo : []
  const existing = masterImages.length ? masterImages : roleImages
  if (existing.length) {
    return existing.map((image: Record<string, any>) => ({
      ...image,
      slotId: image.slotId || image.slot_id || 'photo_logo',
      previewUrl: image.previewUrl || image.preview_url || image.url,
    }))
  }

  const heroImages = Array.isArray(master.hero_images) ? master.hero_images : []
  if (kind === 'organization' && heroImages.length) {
    return heroImages.map((image: Record<string, any>) => ({
      ...image,
      slotId: image.slotId || image.slot_id || 'photo_logo',
      previewUrl: image.previewUrl || image.preview_url || image.url,
    }))
  }

  const url = kind === 'person' ? master.photo_url || master.image_url : master.logo_url || master.logoUrl
  return url ? [{ slotId: 'photo_logo', name: kind === 'person' ? 'Photo' : 'Logo', previewUrl: url, url }] : []
}

export async function syncMasterContact(supabase: SupabaseClient, kind: EntityKind, masterId: string | null | undefined, source: Record<string, any>) {
  if (!masterId) return

  const table = kind === 'person' ? 'persons' : 'organizations'
  const contact = normalizeContactPayload(source, kind)
  const { data: current } = await supabase
    .from(table)
    .select(kind === 'person' ? PERSON_CONTACT_SELECT : ORGANIZATION_CONTACT_SELECT)
    .eq('id', masterId)
    .maybeSingle()

  const metadata = current?.metadata_json && typeof current.metadata_json === 'object' ? current.metadata_json : {}
  const update: Record<string, any> = {}
  const hasAny = (...keys: string[]) => keys.some(key => Object.prototype.hasOwnProperty.call(source, key))

  if (kind === 'person') {
    if (hasAny('first_name')) update.first_name = clean(source.first_name) || null
    if (hasAny('last_name')) update.last_name = clean(source.last_name) || null
    if (hasAny('display_name', 'full_name', 'first_name', 'last_name')) {
      update.full_name = clean(
        source.display_name ||
        source.full_name ||
        [source.first_name ?? current?.first_name, source.last_name ?? current?.last_name].filter(Boolean).join(' ')
      ) || null
    }
    if (hasAny('birth_date')) update.birth_date = clean(source.birth_date) || null
    if (hasAny('birth_place')) update.birth_place = clean(source.birth_place) || null
    if (hasAny('gender')) update.gender = clean(source.gender) || null
    if (hasAny(...PERSON_MASTER_PROFILE_KEYS)) {
      update.metadata_json = {
        ...metadata,
        [PERSON_MASTER_METADATA_KEY]: {
          ...(metadata[PERSON_MASTER_METADATA_KEY] || {}),
          ...normalizePersonMasterPayload(source),
        },
      }
    }
  } else {
    if (hasAny('trade_name', 'legal_name', 'display_name')) {
      const legalName = clean(source.legal_name || source.trade_name || source.display_name) || null
      update.legal_name = legalName
      if (hasAny('trade_name')) update.trade_name = clean(source.trade_name) || legalName
    }
    if (hasAny('short_name')) update.short_name = clean(source.short_name) || null
    if (hasAny('tax_number')) update.tax_number = clean(source.tax_number) || null
    if (hasAny('tax_office')) update.tax_office = clean(source.tax_office) || null
    if (hasAny('company_type', 'organization_type')) update.organization_type = clean(source.organization_type || source.company_type) || null
    if (hasAny('trade_registry_number', 'registration_number', 'mersis_number')) update.registration_number = clean(source.registration_number || source.trade_registry_number || source.mersis_number) || null
  }

  if (kind === 'person') {
    if (hasAny('phone', 'mobile_phone', 'phone_1', 'phones')) update.phone = contact.phone
    if (hasAny('email', 'email_1', 'emails')) update.email = contact.email
    if (hasAny('address')) update.address = contact.address
    if (hasAny('city')) update.city = contact.city
    if (hasAny('district')) update.district = contact.district
  }

  if (kind === 'person' && hasAny('phones', 'emails', 'emergency_contact_first_name', 'emergency_contact_last_name', 'emergency_contact_relationship', 'emergency_contact_phone')) {
    update.metadata_json = {
      ...(update.metadata_json || metadata),
      [CONTACT_METADATA_KEY]: {
        ...(metadata[CONTACT_METADATA_KEY] || {}),
        ...(hasAny('phones') ? { phones: contact.phones } : {}),
        ...(hasAny('emails') ? { emails: contact.emails } : {}),
        ...(kind === 'person' && hasAny('emergency_contact_first_name', 'emergency_contact_last_name', 'emergency_contact_relationship', 'emergency_contact_phone') ? { emergency_contact: contact.emergency_contact } : {}),
      },
    }
  }

  if (Object.keys(update).length === 0) return
  await supabase.from(table).update(update).eq('id', masterId)
}

export async function hydrateMasterContact(supabase: SupabaseClient, kind: EntityKind, role: Record<string, any>) {
  const masterId = kind === 'person' ? role.person_id : role.organization_id
  if (!masterId) return role

  const { data } = await supabase
    .from(kind === 'person' ? 'persons' : 'organizations')
    .select(kind === 'person' ? PERSON_CONTACT_SELECT : ORGANIZATION_CONTACT_SELECT)
    .eq('id', masterId)
    .maybeSingle()

  const master = kind === 'person' ? await enrichPersonMasterFromEmployee(supabase, data || null) : data || null
  return {
    ...mergeMasterContactIntoRole(role, master, kind),
    master,
    role: stripLayerFields(role),
    derived: extractDerivedSnapshot(role),
    master_entity_kind: kind,
    master_record_id: masterId,
  }
}

async function enrichPersonMasterFromEmployee(supabase: SupabaseClient, master: Record<string, any> | null) {
  if (!master?.id) return master

  let employee: Record<string, any> | null = null
  const byPerson = await supabase.from('employees').select(EMPLOYEE_MASTER_ENRICH_SELECT).eq('person_id', master.id).limit(1)
  employee = Array.isArray(byPerson.data) ? byPerson.data[0] || null : null

  if (!employee && master.national_id) {
    const byNationalId = await supabase.from('employees').select(EMPLOYEE_MASTER_ENRICH_SELECT).eq('national_id', master.national_id).limit(1)
    employee = Array.isArray(byNationalId.data) ? byNationalId.data[0] || null : null
  }

  if (!employee && master.passport_no) {
    const byPassport = await supabase.from('employees').select(EMPLOYEE_MASTER_ENRICH_SELECT).eq('passport_no', master.passport_no).limit(1)
    employee = Array.isArray(byPassport.data) ? byPassport.data[0] || null : null
  }

  if (!employee) return master

  const employeeProfile: Record<string, any> = {
    is_illiterate: employee.is_illiterate,
    education_schools: employee.education_schools,
    foreign_languages: employee.foreign_languages,
    certificates: employee.certificates,
    marital_status: employee.marital_status,
    relatives: normalizeRelatives(employee.relatives),
    iban: employee.iban,
    occupation: employee.job_title,
    job_title: employee.job_title,
  }

  return {
    ...Object.fromEntries(Object.entries(employeeProfile).filter(([, value]) => value !== undefined && value !== null)),
    ...master,
  }
}

function stripLayerFields(role: Record<string, any>) {
  const { master, role: nestedRole, derived, ...rest } = role
  return rest
}

function extractDerivedSnapshot(role: Record<string, any>) {
  const keys = [
    'current_ownership',
    'current_share_ratio',
    'current_voting_ratio',
    'current_profit_ratio',
    'current_capital_amount',
    'current_share_units',
    'representative_authorities',
    'ownership_transaction_history',
    'history_sections',
  ]

  return Object.fromEntries(keys.filter(key => role[key] !== undefined).map(key => [key, role[key]]))
}

function readContactMetadata(master: Record<string, any>) {
  const metadata = master.metadata_json && typeof master.metadata_json === 'object' ? master.metadata_json : {}
  const contact = metadata[CONTACT_METADATA_KEY]
  return contact && typeof contact === 'object' ? contact : {}
}

function readPersonMasterMetadata(master: Record<string, any>) {
  const metadata = master.metadata_json && typeof master.metadata_json === 'object' ? master.metadata_json : {}
  const personMaster = metadata[PERSON_MASTER_METADATA_KEY]
  const directProfile = Object.fromEntries(
    PERSON_MASTER_PROFILE_KEYS
      .filter(key => Object.prototype.hasOwnProperty.call(master, key))
      .map(key => [key, master[key]])
  )

  return {
    ...directProfile,
    ...(personMaster && typeof personMaster === 'object' ? personMaster : {}),
    ...('relatives' in directProfile || (personMaster && typeof personMaster === 'object' && 'relatives' in personMaster)
      ? { relatives: normalizeRelatives((personMaster && typeof personMaster === 'object' ? personMaster.relatives : undefined) || directProfile.relatives) }
      : {}),
  }
}

function readOrganizationMasterMetadata(master: Record<string, any>) {
  const metadata = master.metadata_json && typeof master.metadata_json === 'object' ? master.metadata_json : {}
  const organizationMaster = metadata[ORGANIZATION_MASTER_METADATA_KEY]
  return organizationMaster && typeof organizationMaster === 'object' ? organizationMaster : {}
}

function normalizePersonMasterPayload(source: Record<string, any>) {
  const payload = Object.fromEntries(
    PERSON_MASTER_PROFILE_KEYS
      .filter(key => Object.prototype.hasOwnProperty.call(source, key))
      .map(key => [key, source[key] ?? null])
  )
  if (Object.prototype.hasOwnProperty.call(source, 'relatives')) {
    payload.relatives = normalizeRelatives(source.relatives)
  }
  if (Object.prototype.hasOwnProperty.call(source, 'photo_logo') || Object.prototype.hasOwnProperty.call(source, 'photo_url')) {
    payload.photo_logo = normalizeMasterImages(source, 'person', undefined)
  }
  return payload
}

function normalizeRelatives(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, any> => !!item && typeof item === 'object')
    .map(item => ({
      ...item,
      full_name: clean(item.full_name || item.display_name || item.name || [item.first_name, item.last_name].filter(Boolean).join(' ')) || null,
      birth_date: clean(item.birth_date) || null,
      relationship: clean(item.relationship) || null,
    }))
}

function normalizeOrganizationMasterPayload(source: Record<string, any>) {
  const payload: Record<string, any> = Object.fromEntries(
    ORGANIZATION_MASTER_PROFILE_KEYS
      .filter(key => key !== 'contact_points' && Object.prototype.hasOwnProperty.call(source, key))
      .map(key => [key, clean(source[key]) || null])
  )

  if (Object.prototype.hasOwnProperty.call(source, 'beneficiary_currency')) {
    payload.beneficiary_currency = clean(source.beneficiary_currency).toUpperCase() || null
  }

  if (Object.prototype.hasOwnProperty.call(source, 'beneficiary_bank_code')) {
    payload.beneficiary_bank_code = clean(source.beneficiary_bank_code).replace(/\D/g, '') || null
  }

  if (Object.prototype.hasOwnProperty.call(source, 'beneficiary_swift_bic')) {
    payload.beneficiary_swift_bic = clean(source.beneficiary_swift_bic).toUpperCase() || null
  }

  if (Object.prototype.hasOwnProperty.call(source, 'contact_points')) {
    payload.contact_points = normalizeContactPoints(source.contact_points)
  }

  return payload
}

function normalizeContactPoints(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item: any) => item && typeof item === 'object')
    .map((item: Record<string, any>) => ({
      name: clean(item.name || item.full_name),
      department_title: clean(item.department_title || item.title),
      phone: clean(item.phone),
      email: clean(item.email).toLowerCase(),
    }))
    .filter((item: Record<string, any>) => item.name || item.department_title || item.phone || item.email)
}

function normalizePhones(source: Record<string, any>) {
  const raw = Array.isArray(source.phones)
    ? source.phones
    : [
        source.phone || source.mobile_phone || source.phone_1,
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

function normalizeEmails(source: Record<string, any>) {
  const raw = Array.isArray(source.emails)
    ? source.emails
    : [source.email || source.email_1, source.email_2].filter(Boolean).map((address, index) => ({ label: index === 0 ? 'Primary' : 'Secondary', address }))

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
