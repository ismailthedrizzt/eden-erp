import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { fetchWorkspaceSummary } from '@/lib/user-state/server'

export type LoginIdentifierType = 'email' | 'phone'

export type TenantAccessOption = {
  tenant_id: string
  tenant_name: string
  logoUrl?: string | null
  role_label?: string | null
  role_key?: string | null
  is_default?: boolean
}

export type TenantUserLookupResult = {
  identifier: string
  identifier_type: LoginIdentifierType
  user_id: string | null
  display_name: string | null
  tenants: TenantAccessOption[]
  status: 'found' | 'no_tenants'
  message: string
}

export type TenantLoginStatus = {
  login_enabled: boolean
  tenant_count: number
  status: 'ready' | 'empty'
}

type TenantLookupSupabase = ReturnType<typeof createServiceClient>

const UNKNOWN_USER_MESSAGE = 'Kayıtlı olmayan kullanıcı. Kaydolun ya da sistem yöneticinizle temasa geçin.'

export function normalizeLoginIdentifier(value: string) {
  const trimmed = value.trim()
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)

  if (email) {
    return { identifier: trimmed.toLowerCase(), type: 'email' as const }
  }

  let digits = trimmed.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('90')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)

  if (/^[0-9]{10,11}$/.test(digits)) {
    return { identifier: digits, type: 'phone' as const }
  }

  return null
}

export async function lookupTenantUserAccess(value: string): Promise<TenantUserLookupResult> {
  const normalized = normalizeLoginIdentifier(value)

  if (!normalized) {
    throw new Error('Geçerli bir e-posta veya telefon numarası giriniz.')
  }

  const supabase = createServiceClient()
  const noAccess = (message = UNKNOWN_USER_MESSAGE): TenantUserLookupResult => ({
    identifier: normalized.identifier,
    identifier_type: normalized.type,
    user_id: null,
    display_name: null,
    tenants: [],
    status: 'no_tenants',
    message,
  })

  const personResult = await findPersonsByIdentifier(supabase, normalized)
  if (personResult.error) {
    if (isMissingTenantFoundationError(personResult.error)) return noAccess()
    throw new Error(personResult.error.message || 'Kullanıcı sorgusu tamamlanamadı.')
  }

  const persons = personResult.data || []
  if (!persons.length) return noAccess()

  const personIds = persons.map(person => person.id).filter(Boolean)
  const { data: memberships, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, user_id, role_key, is_default, status')
    .in('user_id', personIds)
    .eq('status', 'active')

  if (membershipError) {
    if (isMissingTenantFoundationError(membershipError)) return noAccess()
    throw new Error(membershipError.message || 'Kullanıcı tenant üyeliği sorgulanamadı.')
  }

  const activeMemberships = memberships || []
  if (!activeMemberships.length) return noAccess()

  const tenantIds = Array.from(new Set(activeMemberships.map(item => item.tenant_id).filter(Boolean)))
  const { data: tenantRows, error: tenantError } = await supabase
    .from('erp_instances')
    .select('id, name, status')
    .in('id', tenantIds)
    .eq('status', 'active')

  if (tenantError) throw new Error(tenantError.message || 'Tenant bilgisi sorgulanamadı.')

  const tenantById = new Map((tenantRows || []).map(tenant => [tenant.id, tenant]))
  const workspaceSummaries = await Promise.all(
    tenantIds.map(async tenantId => {
      try {
        return [tenantId, await fetchWorkspaceSummary(supabase, tenantId)] as const
      } catch {
        return [tenantId, null] as const
      }
    })
  )
  const workspaceSummaryById = new Map(workspaceSummaries)
  const tenants = activeMemberships
    .filter(membership => tenantById.has(membership.tenant_id))
    .map(membership => {
      const tenant = tenantById.get(membership.tenant_id)
      const workspaceSummary = workspaceSummaryById.get(membership.tenant_id)
      return {
        tenant_id: membership.tenant_id,
        tenant_name: workspaceSummary?.name || tenant?.name || 'Eden ERP',
        logoUrl: workspaceSummary?.logoUrl || null,
        role_key: membership.role_key || null,
        role_label: roleLabel(membership.role_key),
        is_default: Boolean(membership.is_default),
      }
    })

  if (!tenants.length) return noAccess()

  const primaryMembership = activeMemberships.find(item => item.is_default) || activeMemberships[0]
  const person = persons.find(item => item.id === primaryMembership?.user_id) || persons[0]

  return {
    identifier: normalized.identifier,
    identifier_type: normalized.type,
    user_id: person?.id || null,
    display_name: person?.full_name || [person?.first_name, person?.last_name].filter(Boolean).join(' ') || null,
    tenants,
    status: 'found',
    message: 'Kullanıcı tanımlı.',
  }
}

export async function lookupTenantLoginStatus(supabase: TenantLookupSupabase): Promise<TenantLoginStatus> {
  const { count, error } = await supabase
    .from('tenant_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  if (error) {
    if (isMissingTenantFoundationError(error)) {
      return {
        login_enabled: false,
        tenant_count: 0,
        status: 'empty',
      }
    }

    throw new Error(error.message || 'Login status could not be checked.')
  }

  const tenantCount = count || 0

  return {
    login_enabled: tenantCount > 0,
    tenant_count: tenantCount,
    status: tenantCount > 0 ? 'ready' : 'empty',
  }
}

async function findPersonsByIdentifier(
  supabase: TenantLookupSupabase,
  normalized: { identifier: string; type: LoginIdentifierType }
) {
  const baseQuery = supabase
    .from('persons')
    .select('id, first_name, last_name, full_name, email, phone')
    .eq('is_deleted', false)

  if (normalized.type === 'email') {
    return baseQuery.eq('email', normalized.identifier)
  }

  return baseQuery.in('phone', phoneCandidates(normalized.identifier))
}

function phoneCandidates(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const local = digits.length === 12 && digits.startsWith('90')
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0')
      ? digits.slice(1)
      : digits
  const candidates = new Set<string>([phone, digits, local])
  if (local.length === 10) {
    candidates.add(`0${local}`)
    candidates.add(`90${local}`)
    candidates.add(`+90${local}`)
  }
  return Array.from(candidates)
}

function roleLabel(roleKey?: string | null) {
  if (roleKey === 'yonetici') return 'Yönetici'
  if (roleKey === 'admin') return 'Admin'
  if (roleKey === 'super_admin') return 'Süper Admin'
  return roleKey || null
}

function isMissingTenantFoundationError(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''

  return error?.code === '42P01'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}
