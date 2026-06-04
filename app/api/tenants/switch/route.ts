// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/security/tenants/switch
// NOTES: Thin proxy plus app-session tenant refresh after FastAPI validates access.

import { NextRequest, NextResponse } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { APP_SESSION_COOKIE_NAME, appSessionCookieOptions, createAppSessionToken, verifyAppSessionToken } from '@/lib/auth/appSession'
import { TENANT_ID_COOKIE, WORKSPACE_ID_COOKIE } from '@/lib/tenancy/constants'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const bodyText = await request.text()
  const response = await proxyToFastApi(request, '/api/v1/security/tenants/switch', { bodyText })
  if (!response) return fastApiUnavailableResponse()

  const responseText = await response.text()
  const nextResponse = new NextResponse(responseText, {
    status: response.status,
    headers: response.headers,
  })
  nextResponse.headers.set('Cache-Control', 'no-store')

  if (!response.ok) return nextResponse

  const payload = parseJson(responseText)
  const requestPayload = parseJson(bodyText)
  const tenantId = payload?.data?.workspace?.id || requestPayload?.tenant_id
  const workspaceUserId = payload?.data?.workspace?.user_id || null
  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)

  if (tenantId && appSession) {
    const sessionToken = await createAppSessionToken({
      sub: workspaceUserId || appSession.sub,
      userId: workspaceUserId || appSession.userId,
      tenantId,
      email: appSession.email,
      phone: appSession.phone,
    })
    const tenantCookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
    }
    nextResponse.cookies.set(APP_SESSION_COOKIE_NAME, sessionToken, appSessionCookieOptions())
    nextResponse.cookies.set(TENANT_ID_COOKIE, tenantId, tenantCookieOptions)
    nextResponse.cookies.set(WORKSPACE_ID_COOKIE, tenantId, tenantCookieOptions)
  }

  return nextResponse
}

function parseJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
