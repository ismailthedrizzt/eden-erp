export const IDENTITY_KINDS = ['person', 'organization'] as const
export type IdentityKind = typeof IDENTITY_KINDS[number]

export const PERSON_MATCH_TYPES = ['national_id', 'passport_no', 'weak_name_birth_nationality'] as const
export type PersonMatchType = typeof PERSON_MATCH_TYPES[number]

export const ORGANIZATION_MATCH_TYPES = ['tax_number', 'registration_number', 'weak_name_country'] as const
export type OrganizationMatchType = typeof ORGANIZATION_MATCH_TYPES[number]

export const ROLE_TYPES = ['company', 'employee', 'partner', 'representative', 'stakeholder', 'board_member', 'customer_account'] as const
export type IdentityRoleType = typeof ROLE_TYPES[number]

export interface PersonIdentity {
  id: string
  first_name?: string | null
  last_name?: string | null
  full_name: string
  nationality: string
  national_id?: string | null
  passport_no?: string | null
  birth_date?: string | null
  version: number
}

export interface OrganizationIdentity {
  id: string
  legal_name: string
  short_name?: string | null
  country: string
  tax_number?: string | null
  registration_number?: string | null
  version: number
}

export interface IdentityMatch<TRecord> {
  record: TRecord
  match_type: string
  strength: 'exact' | 'weak'
  message: string
}

export interface RoleReference {
  role_type: IdentityRoleType
  role_id: string
  company_id?: string | null
  label: string
  status?: string | null
}

export function normalizeIdentityText(value: string | null | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ')
}

export function buildPersonFullName(firstName?: string | null, lastName?: string | null, fallback?: string | null): string {
  return normalizeIdentityText([firstName, lastName].filter(Boolean).join(' ') || fallback)
}
