import { normalizeCountryId } from '@/lib/reference/country-nationalities'

export type IdentityEntityKind = 'person' | 'organization'

export type IdentityGateState =
  | 'initial'
  | 'identity_input'
  | 'searching_master'
  | 'master_not_found'
  | 'master_found'
  | 'role_checking'
  | 'role_not_found'
  | 'role_found'
  | 'ready_for_insert'
  | 'ready_for_edit'
  | 'blocked_duplicate'

export interface IdentityGateConfig {
  enabled: boolean
  allowedEntityKinds: IdentityEntityKind[]
  masterTable: 'persons' | 'organizations' | 'both'
  uniqueFields: {
    person?: Array<'nationality' | 'national_id' | 'passport_no'>
    organization?: Array<'country' | 'tax_number' | 'registration_number'>
  }
  roleTable: string
  roleDuplicateCheck: string
  allowMultipleActiveRoles?: boolean
  roleScopeFields?: string[]
}

export interface IdentityGateResolveRequest {
  entityKind: IdentityEntityKind
  identity: {
    nationality?: string
    national_id?: string
    passport_no?: string
    country?: string
    tax_number?: string
    registration_number?: string
  }
  roleTable: string
  roleDuplicateCheck?: string
  allowMultipleActiveRoles?: boolean
  roleScope?: Record<string, unknown>
}

export interface IdentityGateResolveResult {
  state: IdentityGateState
  entityKind: IdentityEntityKind
  masterFound: boolean
  masterRecord: Record<string, any> | null
  roleFound: boolean
  roleRecord: Record<string, any> | null
  prefill: Record<string, any>
  message: string
  warning?: string
}

export function normalizeIdentityCountry(value?: string) {
  return normalizeCountryId(value)
}
