import { NextRequest, NextResponse } from 'next/server'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'
import { lookupTenantUserAccess } from '@/lib/auth/tenantUserLookup'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

type CurrentUserProfile = {
  id: string | null
  displayName: string | null
  roleKey: string | null
  roleLabel: string | null
  avatarUrl: string | null
  email: string | null
  phone: string | null
}

export async function GET(request: NextRequest) {
  const proxied = await proxyToFastApi(request, '/api/v1/users/me/profile', { internal: true, timeoutMs: 8000 })
  if (proxied?.ok) return proxied

  const legacyProxied = await proxyToFastApi(request, '/api/v1/security/me', { internal: true, timeoutMs: 8000 })
  if (legacyProxied?.ok) return legacyProxied

  const fallback = await readCurrentUserFromAppSession(request)
  if (fallback) {
    return NextResponse.json({ data: fallback }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const failedResponse = proxied || legacyProxied
  if (failedResponse && failedResponse.status < 500 && failedResponse.status !== 404 && failedResponse.status !== 405) return failedResponse

  return NextResponse.json(
    { error: 'Oturum bulunamadi.', code: 'AUTH_REQUIRED' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } }
  )
}

async function readCurrentUserFromAppSession(request: NextRequest): Promise<CurrentUserProfile | null> {
  const session = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)
  const devUserId = process.env.EDEN_LOGIN_DISABLED === 'true'
    ? '00000000-0000-0000-0000-000000000001'
    : null
  const userId = session?.userId || devUserId
  if (!userId) return null

  const identifier = session?.email || session?.phone || null
  let lookupDisplayName: string | null = null
  let lookupRoleKey: string | null = null
  let lookupRoleLabel: string | null = null

  if (identifier) {
    try {
      const access = await lookupTenantUserAccess(identifier)
      const tenant = access.tenants.find(item => item.tenant_id === session?.tenantId)
        || access.tenants.find(item => item.is_default)
        || access.tenants[0]
      lookupDisplayName = access.display_name || null
      lookupRoleKey = tenant?.role_key || null
      lookupRoleLabel = tenant?.role_label || null
    } catch {
      // Session fallback must never block profile rendering.
    }
  }

  return {
    id: userId,
    displayName: session?.displayName || lookupDisplayName,
    roleKey: session?.roleKey || lookupRoleKey,
    roleLabel: session?.roleLabel || lookupRoleLabel,
    avatarUrl: session?.avatarUrl || null,
    email: session?.email || null,
    phone: session?.phone || null,
  }
}
