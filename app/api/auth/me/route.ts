import { NextRequest, NextResponse } from 'next/server'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'
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
  const proxied = await proxyToFastApi(request, '/api/v1/security/me', { timeoutMs: 2500 })
  if (proxied?.ok) return proxied

  const fallback = await readCurrentUserFromAppSession(request)
  if (fallback) {
    return NextResponse.json({ data: fallback }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (proxied && proxied.status < 500 && proxied.status !== 404 && proxied.status !== 405) return proxied

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

  return {
    id: userId,
    displayName: null,
    roleKey: null,
    roleLabel: null,
    avatarUrl: null,
    email: session?.email || null,
    phone: session?.phone || null,
  }
}
