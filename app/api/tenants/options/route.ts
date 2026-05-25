import { NextRequest, NextResponse } from 'next/server'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'
import { normalizeLoginIdentifier } from '@/lib/auth/tenantUserLookup'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { fetchWorkspaceSummary } from '@/lib/user-state/server'

export const runtime = 'nodejs'

type Supabase = ReturnType<typeof createServiceClient>

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const access = await resolveUserAccess(request, supabase)

  if (!access.personIds.length) {
    return NextResponse.json({ error: 'Oturum bulunamadi.', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, user_id, role_key, is_default, status')
    .in('user_id', access.personIds)
    .eq('status', 'active')

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message, code: 'TENANT_MEMBERSHIPS_FAILED' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const tenantIds = Array.from(new Set((memberships || []).map(item => item.tenant_id).filter(Boolean)))
  if (!tenantIds.length) return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'no-store' } })

  const { data: tenants, error: tenantError } = await supabase
    .from('erp_instances')
    .select('id,name,code,status,tenant_key,tenant_type')
    .in('id', tenantIds)
    .eq('status', 'active')

  if (tenantError) {
    return NextResponse.json(
      { error: tenantError.message, code: 'TENANTS_FAILED' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const context = resolveTenantContext(request)
  const currentTenantId = context.source === 'default' && access.sessionTenantId
    ? access.sessionTenantId
    : context.tenantId
  const tenantById = new Map((tenants || []).map(tenant => [tenant.id, tenant]))
  const membershipByTenantId = new Map<string, NonNullable<typeof memberships>[number]>()
  ;(memberships || []).forEach(membership => {
    const current = membershipByTenantId.get(membership.tenant_id)
    if (!current || membership.user_id === access.currentUserId || membership.is_default) {
      membershipByTenantId.set(membership.tenant_id, membership)
    }
  })

  const options = await Promise.all(
    tenantIds
      .filter(tenantId => tenantById.has(tenantId))
      .map(async tenantId => {
        const tenant = tenantById.get(tenantId)
        const membership = membershipByTenantId.get(tenantId)
        const summary = await fetchWorkspaceSummary(supabase, tenantId)

        return {
          id: tenantId,
          name: summary.name || tenant?.name || 'Eden ERP',
          code: tenant?.code || null,
          tenant_key: tenant?.tenant_key || null,
          tenant_type: tenant?.tenant_type || null,
          logoUrl: summary.logoUrl || null,
          lightLogoUrl: summary.lightLogoUrl || null,
          darkLogoUrl: summary.darkLogoUrl || null,
          role_key: membership?.role_key || null,
          role_label: roleLabel(membership?.role_key),
          is_default: Boolean(membership?.is_default),
          is_current: tenantId === currentTenantId,
        }
      })
  )

  options.sort((left, right) => {
    if (left.is_current !== right.is_current) return left.is_current ? -1 : 1
    if (left.is_default !== right.is_default) return left.is_default ? -1 : 1
    return left.name.localeCompare(right.name, 'tr')
  })

  return NextResponse.json({ data: options }, { headers: { 'Cache-Control': 'no-store' } })
}

async function resolveUserAccess(request: NextRequest, supabase: Supabase) {
  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)
  if (appSession?.userId) {
    const personIds = await findSessionPersonIds(supabase, {
      userId: appSession.userId,
      email: appSession.email,
      phone: appSession.phone,
    })

    return { currentUserId: appSession.userId, personIds, sessionTenantId: appSession.tenantId || null }
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { currentUserId: null, personIds: [], sessionTenantId: null }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.id) return { currentUserId: null, personIds: [], sessionTenantId: null }

  const personIds = await findSessionPersonIds(supabase, {
    userId: data.user.id,
    email: data.user.email,
    phone: data.user.phone,
  })

  return { currentUserId: data.user.id, personIds, sessionTenantId: null }
}

async function findSessionPersonIds(
  supabase: Supabase,
  identity: { userId?: string | null; email?: string | null; phone?: string | null }
) {
  const ids = new Set<string>()
  if (identity.userId) ids.add(identity.userId)

  const identifiers = [identity.email, identity.phone]
    .map(value => normalizeLoginIdentifier(String(value || '')))
    .filter((value): value is NonNullable<ReturnType<typeof normalizeLoginIdentifier>> => Boolean(value))

  const lookups = identifiers.map(identifier => {
    let query = supabase
      .from('persons')
      .select('id')
      .eq('is_deleted', false)

    if (identifier.type === 'email') {
      query = query.eq('email', identifier.identifier)
    } else {
      query = query.in('phone', phoneCandidates(identifier.identifier))
    }

    return query
  })

  const results = await Promise.all(lookups)
  results.forEach(({ data, error }) => {
    if (error) throw new Error(error.message)
    ;(data || []).forEach(row => {
      if (row.id) ids.add(row.id)
    })
  })

  return Array.from(ids)
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
  if (roleKey === 'yonetici') return 'Yonetici'
  if (roleKey === 'admin') return 'Admin'
  if (roleKey === 'super_admin') return 'Super Admin'
  return roleKey || null
}
