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

  return {
    ...role,
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

export async function syncMasterContact(supabase: SupabaseClient, kind: EntityKind, masterId: string | null | undefined, source: Record<string, any>) {
  if (!masterId) return

  const table = kind === 'person' ? 'persons' : 'organizations'
  const contact = normalizeContactPayload(source, kind)
  const { data: current } = await supabase
    .from(table)
    .select('metadata_json')
    .eq('id', masterId)
    .maybeSingle()

  const metadata = current?.metadata_json && typeof current.metadata_json === 'object' ? current.metadata_json : {}
  const update: Record<string, any> = {
    phone: contact.phone,
    email: contact.email,
    address: contact.address,
    city: contact.city,
    district: contact.district,
    metadata_json: {
      ...metadata,
      [CONTACT_METADATA_KEY]: {
        ...(metadata[CONTACT_METADATA_KEY] || {}),
        telefonlar: contact.telefonlar,
        epostalar: contact.epostalar,
        ...(kind === 'person' ? { acil_kisi: contact.acil_kisi } : {}),
      },
    },
  }

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
