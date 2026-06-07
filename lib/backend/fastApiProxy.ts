import 'server-only'

// Deployment contract:
// - FASTAPI_BASE_URL must be set in production Next.js environments.
// - INTERNAL_BACKEND_TOKEN and TRUSTED_PROXY_SECRET are server-only secrets.
// - Never expose these values through NEXT_PUBLIC_*.

import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'

type FastApiQuery = URLSearchParams | Record<string, string | number | boolean | null | undefined>

type ProxyOptions = {
  method?: string
  tenantId?: string | null
  userId?: string | null
  companyScope?: string | null
  timeoutMs?: number
  bodyText?: string
  query?: FastApiQuery
  internal?: boolean
  requestId?: string
  correlationId?: string
}

function backendBaseUrl() {
  return process.env.FASTAPI_BASE_URL?.replace(/\/+$/, '') || null
}

export function isFastApiEnabled() {
  return Boolean(backendBaseUrl())
}

export function buildFastApiUrl(path: string, query?: FastApiQuery) {
  const baseUrl = backendBaseUrl()
  if (!baseUrl) return null

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const targetUrl = new URL(`${baseUrl}${normalizedPath}`)
  if (query instanceof URLSearchParams) {
    query.forEach((value, key) => targetUrl.searchParams.set(key, value))
  } else if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined) targetUrl.searchParams.set(key, String(value))
    })
  }
  return targetUrl
}

function isByteStringHeaderValue(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 255) return false
  }
  return true
}

export async function buildBackendHeaders(request: NextRequest, options: ProxyOptions = {}) {
  const tenantContext = resolveTenantContext(request)
  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)
  const headers = new Headers()
  const requestId = options.requestId || request.headers.get('x-request-id') || crypto.randomUUID()
  const correlationId = options.correlationId || request.headers.get('x-correlation-id') || requestId
  headers.set('accept', request.headers.get('accept') || 'application/json')
  headers.set('content-type', request.headers.get('content-type') || 'application/json')
  headers.set('x-tenant-id', options.tenantId || tenantContext.tenantId)
  const userId = (options.userId || appSession?.userId || '').trim()
  if (userId) headers.set('x-user-id', userId)
  if (appSession?.email) headers.set('x-user-email', appSession.email)
  if (appSession?.phone) headers.set('x-user-phone', appSession.phone)
  if (appSession?.displayName) {
    if (isByteStringHeaderValue(appSession.displayName)) {
      headers.set('x-user-name', appSession.displayName)
    } else {
      headers.set('x-user-name-encoded', encodeURIComponent(appSession.displayName))
    }
  }
  if (options.companyScope) headers.set('x-company-scope', options.companyScope)
  headers.set('x-request-id', requestId)
  headers.set('x-correlation-id', correlationId)
  headers.set('x-forwarded-user-agent', request.headers.get('user-agent') || '')
  const forwardedFor = request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || (request as { ip?: string }).ip
    || ''
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor)

  const incomingAuthorization = request.headers.get('authorization')
  const accessToken = incomingAuthorization?.toLowerCase().startsWith('bearer ')
    ? incomingAuthorization.replace(/^Bearer\s+/i, '')
    : null

  if (options.internal && process.env.INTERNAL_BACKEND_TOKEN) {
    headers.set('authorization', `Bearer ${process.env.INTERNAL_BACKEND_TOKEN}`)
  } else if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`)
  }

  if (process.env.TRUSTED_PROXY_SECRET) {
    headers.set('x-proxy-secret', process.env.TRUSTED_PROXY_SECRET)
  }
  return headers
}

export function fastApiUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Backend servisi yapilandirilmamis veya ulasilamiyor. Lutfen tekrar deneyin.',
      code: 'FASTAPI_BACKEND_NOT_CONFIGURED',
      message: 'Backend servisi yapilandirilmamis veya ulasilamiyor. Lutfen tekrar deneyin.',
    },
    { status }
  )
}

export function normalizeFastApiProxyError(error: unknown, requestId?: string, correlationId?: string) {
  const reason = error instanceof Error ? error.message : String(error)
  return {
    error: 'Backend servisine ulasilamadi. Lutfen tekrar deneyin.',
    code: 'FASTAPI_BACKEND_UNREACHABLE',
    message: 'Backend servisine ulasilamadi. Lutfen tekrar deneyin.',
    request_id: requestId,
    correlation_id: correlationId,
    details: process.env.NODE_ENV === 'development' ? { reason } : undefined,
  }
}

export async function proxyToFastApi(
  request: NextRequest,
  targetPath: string,
  options: ProxyOptions = {}
) {
  const targetUrl = buildFastApiUrl(targetPath, options.query || request.nextUrl.searchParams)
  if (!targetUrl) return null

  const requestId = options.requestId || request.headers.get('x-request-id') || crypto.randomUUID()
  const correlationId = options.correlationId || request.headers.get('x-correlation-id') || requestId
  const method = options.method || request.method
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000)

  try {
    const body = method === 'GET' || method === 'HEAD'
      ? undefined
      : options.bodyText ?? await request.arrayBuffer()
    const headers = await buildBackendHeaders(request, { ...options, requestId, correlationId })
    if (options.bodyText !== undefined) headers.set('content-type', 'application/json')
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: controller.signal,
    })
    const contentType = response.headers.get('content-type') || 'application/json'
    const responseBody = await response.arrayBuffer()
    const responseHeaders = new Headers()
    responseHeaders.set('content-type', contentType)
    responseHeaders.set('cache-control', 'no-store, max-age=0')
    responseHeaders.set('x-request-id', response.headers.get('x-request-id') || requestId)
    responseHeaders.set('x-correlation-id', response.headers.get('x-correlation-id') || correlationId)
    ;['content-disposition', 'accept-ranges', 'last-modified', 'etag'].forEach(header => {
      const value = response.headers.get(header)
      if (value) responseHeaders.set(header, value)
    })
    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    return NextResponse.json(
      normalizeFastApiProxyError(error, requestId, correlationId),
      {
        status: 503,
        headers: {
          'x-request-id': requestId,
          'x-correlation-id': correlationId,
        },
      }
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function proxyJsonToFastApi(
  request: NextRequest,
  targetPath: string,
  json: unknown,
  options: ProxyOptions = {}
) {
  return proxyToFastApi(request, targetPath, {
    ...options,
    bodyText: JSON.stringify(json),
  })
}
