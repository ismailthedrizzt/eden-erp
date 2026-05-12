type SupabaseClient = {
  from: (table: string) => any
}

type EntityKind = 'person' | 'organization'

const CONTACT_METADATA_KEY = 'contact'

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
  const telefonlar = normalizePhones({ telefonlar: contact.telefonlar || role.telefonlar, phone: master.phone || role.phone || role.cep_telefonu || role.telefon })
  const epostalar = normalizeEmails({ epostalar: contact.epostalar || role.epostalar, email: master.email || role.email })
  const emergency = kind === 'person' && contact.acil_kisi && typeof contact.acil_kisi === 'object' ? contact.acil_kisi : {}
  const photoLogo: Array<Record<string, any>> = normalizeMasterImages(master, kind, role.photo_logo)

  return {
    ...role,
    ...(kind === 'person'
      ? {
          first_name: master.first_name || role.first_name || '',
          last_name: master.last_name || role.last_name || '',
          full_name: master.full_name || role.full_name || role.display_name || '',
          display_name: master.full_name || role.display_name || role.ad_soyad || '',
        }
      : {
          trade_name: master.legal_name || role.trade_name || role.display_name || '',
          legal_name: master.legal_name || role.legal_name || '',
          short_name: master.short_name || role.short_name || '',
          display_name: master.legal_name || role.display_name || role.ad_soyad || '',
        }),
    phone: master.phone || role.phone || role.cep_telefonu || role.telefon || '',
    cep_telefonu: master.phone || role.cep_telefonu || role.phone || '',
    telefon: master.phone || role.telefon || role.phone || '',
    email: master.email || role.email || '',
    address: master.address || role.address || role.adres || '',
    adres: master.address || role.adres || role.address || '',
    city: master.city || role.city || role.il || '',
    il: master.city || role.il || role.city || '',
    district: master.district || role.district || role.ilce || '',
    ilce: master.district || role.ilce || role.district || '',
    phone_1: telefonlar[0]?.numara || master.phone || role.phone_1 || '',
    phone_2: telefonlar[1]?.numara || role.phone_2 || '',
    email_1: epostalar[0]?.adres || master.email || role.email_1 || '',
    email_2: epostalar[1]?.adres || role.email_2 || '',
    telefonlar,
    epostalar,
    photo_logo: photoLogo,
    fotograf_url: photoLogo[0]?.previewUrl || photoLogo[0]?.url || role.fotograf_url || '',
    ...(kind === 'person'
      ? {
          acil_kisi_ad: emergency.ad || role.acil_kisi_ad || '',
          acil_kisi_soyad: emergency.soyad || role.acil_kisi_soyad || '',
          acil_kisi_yakinlik: emergency.yakinlik || role.acil_kisi_yakinlik || '',
          acil_kisi_telefon: emergency.telefon || role.acil_kisi_telefon || '',
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
    if (hasAny('first_name')) update.first_name = clean(source.first_name) || null
    if (hasAny('last_name')) update.last_name = clean(source.last_name) || null
    if (hasAny('display_name', 'full_name', 'first_name', 'last_name')) {
      update.full_name = clean(source.display_name || source.full_name || [source.first_name ?? current?.first_name, source.last_name ?? current?.last_name].filter(Boolean).join(' ')) || null
    }
    if (hasAny('birth_date')) update.birth_date = clean(source.birth_date) || null
  } else {
    if (hasAny('trade_name', 'legal_name', 'display_name')) update.legal_name = clean(source.trade_name || source.legal_name || source.display_name) || null
    if (hasAny('short_name')) update.short_name = clean(source.short_name) || null
    if (hasAny('tax_number', 'tax_id', 'identity_number')) update.tax_number = clean(source.tax_number || source.tax_id || source.identity_number) || null
    if (hasAny('tax_office')) update.tax_office = clean(source.tax_office) || null
    if (hasAny('company_type')) update.organization_type = clean(source.company_type) || null
    if (hasAny('trade_registry_no', 'mersis_no')) update.registration_number = clean(source.trade_registry_no || source.mersis_no) || null
  }

  if (hasAny('phone', 'cep_telefonu', 'telefon', 'phone_1', 'telefonlar')) update.phone = contact.phone
  if (hasAny('email', 'email_1', 'epostalar')) update.email = contact.email
  if (hasAny('address', 'adres')) update.address = contact.address
  if (hasAny('city', 'il')) update.city = contact.city
  if (hasAny('district', 'ilce')) update.district = contact.district

  if (hasAny('telefonlar', 'epostalar', 'acil_kisi_ad', 'acil_kisi_soyad', 'acil_kisi_yakinlik', 'acil_kisi_telefon')) {
    update.metadata_json = {
      ...metadata,
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

  return mergeMasterContactIntoRole(role, data || null, kind)
}

function readContactMetadata(master: Record<string, any>) {
  const metadata = master.metadata_json && typeof master.metadata_json === 'object' ? master.metadata_json : {}
  const contact = metadata[CONTACT_METADATA_KEY]
  return contact && typeof contact === 'object' ? contact : {}
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
