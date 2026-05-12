type SupabaseClient = {
  from: (table: string) => any
}

type EntityKind = 'person' | 'organization'

const CONTACT_METADATA_KEY = 'contact'
const PERSON_MASTER_METADATA_KEY = 'person_master'
const ORGANIZATION_MASTER_METADATA_KEY = 'organization_master'

const PERSON_MASTER_PROFILE_KEYS = [
  'photo_logo',
  'fotograf_url',
  'engellilik',
  'engellilik_yuzdesi',
  'askerlik_durumu',
  'tecil_tarihi',
  'hukumluluk',
  'okuryazar_degil',
  'egitim_okullari',
  'yabanci_diller',
  'sertifikalar',
  'medeni_durum',
  'marital_status',
  'yakinlar',
  'iban',
  'bank_name',
  'occupation',
  'profession',
  'meslek',
  'blood_type',
  'kan_grubu',
]

const ORGANIZATION_MASTER_PROFILE_KEYS = [
  'contact_points',
]

const MASTER_PROFILE_KEYS = new Set([
  'ad',
  'soyad',
  'first_name',
  'last_name',
  'full_name',
  'display_name',
  'trade_name',
  'legal_name',
  'ticari_unvan',
  'kisa_unvan',
  'short_name',
  'uyruk',
  'nationality',
  'nationality_country',
  'tc_kimlik',
  'national_id',
  'pasaport_no',
  'passport_no',
  'identity_number',
  'tax_id',
  'vkn_tckn',
  'tax_number',
  'ticaret_sicil_no',
  'registration_number',
  'mersis_no',
  'dogum_tarihi',
  'birth_date',
  'dogum_yeri',
  'birth_place',
  'cinsiyet',
  'gender',
  'vergi_dairesi',
  'tax_office',
  'sirket_turu',
  'company_type',
  'foundation_date',
  'kurulus_tarihi',
  'telefon',
  'phone',
  'cep_telefonu',
  'email',
  'adres',
  'address',
  'il',
  'city',
  'ilce',
  'district',
  'telefonlar',
  'epostalar',
  ...ORGANIZATION_MASTER_PROFILE_KEYS,
  'photo_logo',
  'fotograf_url',
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
  const phone = clean(source.phone || source.cep_telefonu || source.telefon || source.phone_1 || phones[0]?.numara)
  const email = clean(source.email || source.email_1 || emails[0]?.adres).toLowerCase()
  const address = clean(source.address || source.adres)
  const city = clean(source.city || source.il)
  const district = clean(source.district || source.ilce)

  return {
    phone: phone || null,
    email: email || null,
    address: address || null,
    city: city || null,
    district: district || null,
    telefonlar: phones,
    epostalar: emails,
    acil_kisi: kind === 'person'
      ? {
          ad: clean(source.acil_kisi_ad) || null,
          soyad: clean(source.acil_kisi_soyad) || null,
          yakinlik: clean(source.acil_kisi_yakinlik) || null,
          telefon: clean(source.acil_kisi_telefon) || null,
        }
      : null,
  }
}

export function mergeMasterContactIntoRole(role: Record<string, any>, master: Record<string, any> | null, kind: EntityKind) {
  if (!master) return role

  const contact = readContactMetadata(master)
  const telefonlar = normalizePhones({ telefonlar: contact.telefonlar, phone: master.phone })
  const epostalar = normalizeEmails({ epostalar: contact.epostalar, email: master.email })
  const personMaster = kind === 'person' ? readPersonMasterMetadata(master) : {}
  const organizationMaster = kind === 'organization' ? readOrganizationMasterMetadata(master) : {}
  const emergency = kind === 'person' && contact.acil_kisi && typeof contact.acil_kisi === 'object' ? contact.acil_kisi : {}
  const masterWithMetadata = kind === 'person' ? { ...master, ...personMaster } : { ...master, ...organizationMaster }
  const photoLogo: Array<Record<string, any>> = normalizeMasterImages(masterWithMetadata, kind, undefined)

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
          trade_name: master.legal_name || '',
          legal_name: master.legal_name || '',
          short_name: master.short_name || '',
          display_name: master.legal_name || master.short_name || '',
        }),
    phone: master.phone || '',
    cep_telefonu: master.phone || '',
    telefon: master.phone || '',
    email: master.email || '',
    address: master.address || '',
    adres: master.address || '',
    city: master.city || '',
    il: master.city || '',
    district: master.district || '',
    ilce: master.district || '',
    phone_1: telefonlar[0]?.numara || master.phone || '',
    phone_2: telefonlar[1]?.numara || '',
    email_1: epostalar[0]?.adres || master.email || '',
    email_2: epostalar[1]?.adres || '',
    telefonlar,
    epostalar,
    photo_logo: photoLogo,
    fotograf_url: photoLogo[0]?.previewUrl || photoLogo[0]?.url || '',
    ...(kind === 'person'
      ? {
          acil_kisi_ad: emergency.ad || '',
          acil_kisi_soyad: emergency.soyad || '',
          acil_kisi_yakinlik: emergency.yakinlik || '',
          acil_kisi_telefon: emergency.telefon || '',
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

  const url = kind === 'person'
    ? master.fotograf_url || master.photo_url || master.image_url
    : master.logo_url || master.logoUrl
  return url ? [{ slotId: 'photo_logo', name: kind === 'person' ? 'Fotoğraf' : 'Logo', previewUrl: url, url }] : []
}

export async function syncMasterContact(supabase: SupabaseClient, kind: EntityKind, masterId: string | null | undefined, source: Record<string, any>) {
  if (!masterId) return

  const table = kind === 'person' ? 'persons' : 'organizations'
  const contact = normalizeContactPayload(source, kind)
  const { data: current } = await supabase
    .from(table)
    .select('*')
    .eq('id', masterId)
    .maybeSingle()

  const metadata = current?.metadata_json && typeof current.metadata_json === 'object' ? current.metadata_json : {}
  const update: Record<string, any> = {}
  const hasAny = (...keys: string[]) => keys.some(key => Object.prototype.hasOwnProperty.call(source, key))

  if (kind === 'person') {
    if (hasAny('first_name', 'ad')) update.first_name = clean(source.first_name || source.ad) || null
    if (hasAny('last_name', 'soyad')) update.last_name = clean(source.last_name || source.soyad) || null
    if (hasAny('display_name', 'full_name', 'first_name', 'last_name', 'ad', 'soyad')) {
      update.full_name = clean(source.display_name || source.full_name || [source.first_name ?? source.ad ?? current?.first_name, source.last_name ?? source.soyad ?? current?.last_name].filter(Boolean).join(' ')) || null
    }
    if (hasAny('birth_date', 'dogum_tarihi')) update.birth_date = clean(source.birth_date || source.dogum_tarihi) || null
    if (hasAny('birth_place', 'dogum_yeri')) update.birth_place = clean(source.birth_place || source.dogum_yeri) || null
    if (hasAny('gender', 'cinsiyet')) update.gender = clean(source.gender || source.cinsiyet) || null
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
    if (hasAny('trade_name', 'legal_name', 'display_name', 'ticari_unvan')) update.legal_name = clean(source.trade_name || source.legal_name || source.ticari_unvan || source.display_name) || null
    if (hasAny('short_name', 'kisa_unvan')) update.short_name = clean(source.short_name || source.kisa_unvan) || null
    if (hasAny('tax_number', 'tax_id', 'identity_number', 'vkn_tckn')) update.tax_number = clean(source.tax_number || source.tax_id || source.identity_number || source.vkn_tckn) || null
    if (hasAny('tax_office', 'vergi_dairesi')) update.tax_office = clean(source.tax_office || source.vergi_dairesi) || null
    if (hasAny('company_type', 'sirket_turu')) update.organization_type = clean(source.company_type || source.sirket_turu) || null
    if (hasAny('trade_registry_no', 'ticaret_sicil_no', 'mersis_no')) update.registration_number = clean(source.trade_registry_no || source.ticaret_sicil_no || source.mersis_no) || null
    if (hasAny(...ORGANIZATION_MASTER_PROFILE_KEYS)) {
      update.metadata_json = {
        ...metadata,
        [ORGANIZATION_MASTER_METADATA_KEY]: {
          ...(metadata[ORGANIZATION_MASTER_METADATA_KEY] || {}),
          ...normalizeOrganizationMasterPayload(source),
        },
      }
    }
  }

  if (hasAny('phone', 'cep_telefonu', 'telefon', 'phone_1', 'telefonlar')) update.phone = contact.phone
  if (hasAny('email', 'email_1', 'epostalar')) update.email = contact.email
  if (hasAny('address', 'adres')) update.address = contact.address
  if (hasAny('city', 'il')) update.city = contact.city
  if (hasAny('district', 'ilce')) update.district = contact.district

  if (hasAny('telefonlar', 'epostalar', 'acil_kisi_ad', 'acil_kisi_soyad', 'acil_kisi_yakinlik', 'acil_kisi_telefon')) {
    update.metadata_json = {
      ...(update.metadata_json || metadata),
      [CONTACT_METADATA_KEY]: {
        ...(metadata[CONTACT_METADATA_KEY] || {}),
        ...(hasAny('telefonlar') ? { telefonlar: contact.telefonlar } : {}),
        ...(hasAny('epostalar') ? { epostalar: contact.epostalar } : {}),
        ...(kind === 'person' && hasAny('acil_kisi_ad', 'acil_kisi_soyad', 'acil_kisi_yakinlik', 'acil_kisi_telefon') ? { acil_kisi: contact.acil_kisi } : {}),
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
    .select('*')
    .eq('id', masterId)
    .maybeSingle()

  const master = data || null
  return {
    ...mergeMasterContactIntoRole(role, master, kind),
    master,
    role: stripLayerFields(role),
    derived: extractDerivedSnapshot(role),
    master_entity_kind: kind,
    master_record_id: masterId,
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
  return personMaster && typeof personMaster === 'object' ? personMaster : {}
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
  if (Object.prototype.hasOwnProperty.call(source, 'photo_logo') || Object.prototype.hasOwnProperty.call(source, 'fotograf_url')) {
    payload.photo_logo = normalizeMasterImages(source, 'person', undefined)
  }
  return payload
}

function normalizeOrganizationMasterPayload(source: Record<string, any>) {
  return {
    ...(Object.prototype.hasOwnProperty.call(source, 'contact_points') ? { contact_points: normalizeContactPoints(source.contact_points) } : {}),
  }
}

function normalizeContactPoints(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item: any) => item && typeof item === 'object')
    .map((item: Record<string, any>) => ({
      name: clean(item.name || item.kisi_adi_soyadi || item.full_name),
      department_title: clean(item.department_title || item.birimi_unvani || item.title),
      phone: clean(item.phone || item.telefon),
      email: clean(item.email || item.eposta).toLowerCase(),
    }))
    .filter((item: Record<string, any>) => item.name || item.department_title || item.phone || item.email)
}

function normalizePhones(source: Record<string, any>) {
  const raw = Array.isArray(source.telefonlar)
    ? source.telefonlar
    : [
        source.phone || source.cep_telefonu || source.telefon || source.phone_1,
        source.is_telefonu || source.phone_2,
      ].filter(Boolean).map((numara, index) => ({ etiket: index === 0 ? 'Birincil' : 'Ikincil', numara }))

  return raw
    .filter((item: any) => item && typeof item === 'object')
    .map((item: Record<string, any>, index: number) => ({
      etiket: clean(item.etiket || item.label || (index === 0 ? 'Birincil' : 'Ikincil')),
      numara: clean(item.numara || item.phone || item.value),
    }))
    .filter((item: Record<string, any>) => item.numara)
}

function normalizeEmails(source: Record<string, any>) {
  const raw = Array.isArray(source.epostalar)
    ? source.epostalar
    : [source.email || source.email_1, source.email_2].filter(Boolean).map((adres, index) => ({ etiket: index === 0 ? 'Birincil' : 'Ikincil', adres }))

  return raw
    .filter((item: any) => item && typeof item === 'object')
    .map((item: Record<string, any>, index: number) => ({
      etiket: clean(item.etiket || item.label || (index === 0 ? 'Birincil' : 'Ikincil')),
      adres: clean(item.adres || item.email || item.value).toLowerCase(),
    }))
    .filter((item: Record<string, any>) => item.adres)
}

function clean(value: unknown) {
  return String(value || '').trim()
}
