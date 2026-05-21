export type LoginIdentifierType = 'email' | 'phone'

export type TenantAccessOption = {
  tenant_id: string
  tenant_name: string
  role_label?: string | null
}

export type TenantUserLookupResult = {
  identifier: string
  identifier_type: LoginIdentifierType
  tenants: TenantAccessOption[]
  status: 'found' | 'no_tenants'
  message: string
}

export function normalizeLoginIdentifier(value: string) {
  const trimmed = value.trim()
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  const phone = trimmed.replace(/\s/g, '')

  if (email) {
    return { identifier: trimmed.toLowerCase(), type: 'email' as const }
  }

  if (/^[0-9]{10,11}$/.test(phone)) {
    return { identifier: phone, type: 'phone' as const }
  }

  return null
}

export async function lookupTenantUserAccess(value: string): Promise<TenantUserLookupResult> {
  const normalized = normalizeLoginIdentifier(value)

  if (!normalized) {
    throw new Error('Gecerli bir e-posta veya telefon numarasi giriniz.')
  }

  return {
    identifier: normalized.identifier,
    identifier_type: normalized.type,
    tenants: [],
    status: 'no_tenants',
    message: 'Henuz aktif tenant bulunmadigi icin giris gecici olarak pasif.',
  }
}
