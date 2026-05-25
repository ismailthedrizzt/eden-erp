import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'
import { normalizeLoginIdentifier } from '@/lib/auth/tenantUserLookup'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchWorkspaceSummary } from '@/lib/user-state/server'

export const runtime = 'nodejs'

type Supabase = ReturnType<typeof createServiceClient>

const SetDefaultTenantSchema = z.object({
  tenant_id: z.string().uuid('Gecerli bir calisma alani seciniz.'),
})

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const parsed = SetDefaultTenantSchema.safeParse(await request.json().catch(() => ({})))

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Form verileri gecersiz.', code: 'VALIDATION_FAILED' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const auth = await resolveAuthenticatedUser(request, supabase)
  if (!auth.personIds.length) {
    return NextResponse.json(
      { error: 'Oturum bulunamadi.', code: 'AUTH_REQUIRED' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('erp_instances')
    .select('id,status')
    .eq('id', parsed.data.tenant_id)
    .eq('status', 'active')
    .maybeSingle()

  if (tenantError) {
    return NextResponse.json(
      { error: tenantError.message, code: 'TENANT_LOOKUP_FAILED' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (!tenant) {
    return NextResponse.json(
      { error: 'Calisma alani aktif degil.', code: 'TENANT_NOT_ACTIVE' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('id,user_id,role_key,status,is_default')
    .eq('tenant_id', parsed.data.tenant_id)
    .in('user_id', auth.personIds)
    .eq('status', 'active')
    .limit(10)

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message, code: 'TENANT_ACCESS_CHECK_FAILED' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const membership = (memberships || []).find(item => item.user_id === auth.userId)
    || (memberships || []).find(item => item.is_default)
    || (memberships || [])[0]

  if (!membership) {
    return NextResponse.json(
      { error: 'Bu calisma alanina erisiminiz yok.', code: 'TENANT_ACCESS_DENIED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const clearDefaults = await supabase
    .from('tenant_memberships')
    .update({ is_default: false })
    .in('user_id', auth.personIds)
    .eq('status', 'active')
    .eq('is_default', true)

  if (clearDefaults.error) {
    return NextResponse.json(
      { error: clearDefaults.error.message, code: 'TENANT_DEFAULT_CLEAR_FAILED' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const setDefault = await supabase
    .from('tenant_memberships')
    .update({ is_default: true })
    .eq('id', membership.id)

  if (setDefault.error) {
    return NextResponse.json(
      { error: setDefault.error.message, code: 'TENANT_DEFAULT_SET_FAILED' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const workspace = await fetchWorkspaceSummary(supabase, parsed.data.tenant_id)

  return NextResponse.json(
    { data: { tenant_id: parsed.data.tenant_id, workspace } },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

async function resolveAuthenticatedUser(request: NextRequest, supabase: Supabase) {
  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)
  if (appSession?.userId) {
    const personIds = await findSessionPersonIds(supabase, {
      userId: appSession.userId,
      email: appSession.email,
      phone: appSession.phone,
    })

    return { userId: appSession.userId, personIds }
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { userId: null, personIds: [] }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.id) return { userId: null, personIds: [] }

  const personIds = await findSessionPersonIds(supabase, {
    userId: data.user.id,
    email: data.user.email,
    phone: data.user.phone,
  })

  return { userId: data.user.id, personIds }
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
