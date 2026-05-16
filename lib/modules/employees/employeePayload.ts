function hasPayloadValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

function firstPayloadValue(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (hasPayloadValue(value)) return value
  }
  return undefined
}

function assignAlias(next: Record<string, any>, target: string, aliases: string[]) {
  const value = firstPayloadValue(next, [target, ...aliases])
  if (value !== undefined) next[target] = value
}

function normalizeEmployeeGender(value: unknown) {
  const text = String(value || '').trim().toLocaleLowerCase('tr-TR')
  if (['kadin', 'kadın', 'female', 'f', 'k'].includes(text)) return 'kadin'
  if (['erkek', 'male', 'm', 'e'].includes(text)) return 'erkek'
  return value
}

export function normalizeEmployeeAliasPayload(payload: Record<string, any>): Record<string, any> {
  const next: Record<string, any> = { ...payload }

  assignAlias(next, 'ad', ['first_name'])
  assignAlias(next, 'soyad', ['last_name'])
  assignAlias(next, 'cinsiyet', ['gender'])
  assignAlias(next, 'uyruk', ['nationality', 'nationality_country'])
  assignAlias(next, 'tc_kimlik', ['national_id'])
  assignAlias(next, 'pasaport_no', ['passport_no'])
  assignAlias(next, 'dogum_tarihi', ['birth_date'])
  assignAlias(next, 'dogum_yeri', ['birth_place'])
  assignAlias(next, 'kan_grubu', ['blood_type'])
  assignAlias(next, 'gorev', ['occupation', 'profession', 'meslek'])
  assignAlias(next, 'cep_telefonu', ['phone', 'telefon'])
  assignAlias(next, 'adres', ['address'])
  assignAlias(next, 'il', ['city'])
  assignAlias(next, 'ilce', ['district'])
  assignAlias(next, 'medeni_durum', ['marital_status'])

  if (hasPayloadValue(next.identity_number)) {
    const identityNumber = String(next.identity_number).trim()
    if (/^\d{11}$/.test(identityNumber) && !hasPayloadValue(next['tc_kimlik'])) {
      next['tc_kimlik'] = identityNumber
    } else if (!/^\d{11}$/.test(identityNumber) && !hasPayloadValue(next['pasaport_no'])) {
      next['pasaport_no'] = identityNumber
    }
  }

  if (hasPayloadValue(next['cinsiyet'])) {
    next['cinsiyet'] = normalizeEmployeeGender(next['cinsiyet'])
  }

  return next
}
