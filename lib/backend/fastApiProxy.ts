import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantContext } from '@/lib/tenancy/server'

type FastApiQuery = URLSearchParams | Record<string, string | number | boolean | null | undefined>

type ProxyOptions = {
  method?: string
  tenantId?: string | null
  userId?: string | null
  companyScope?: string | null
  timeoutMs?: number
  bodyText?: string
  query?: FastApiQuery
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

export function buildBackendHeaders(request: NextRequest, options: ProxyOptions = {}) {
  const tenantContext = resolveTenantContext(request)
  const headers = new Headers()
  headers.set('accept', request.headers.get('accept') || 'application/json')
  headers.set('content-type', request.headers.get('content-type') || 'application/json')
  headers.set('x-tenant-id', options.tenantId || tenantContext.tenantId)
  headers.set('x-user-id', options.userId || request.headers.get('x-user-id') || '')
  if (request.headers.get('x-user-permissions')) {
    headers.set('x-user-permissions', request.headers.get('x-user-permissions') || '')
  }
  if (request.headers.get('x-company-id')) {
    headers.set('x-company-id', request.headers.get('x-company-id') || '')
  }
  if (request.headers.get('x-branch-id')) {
    headers.set('x-branch-id', request.headers.get('x-branch-id') || '')
  }
  if (options.companyScope) headers.set('x-company-scope', options.companyScope)
  if (!options.companyScope && request.headers.get('x-company-scope')) {
    headers.set('x-company-scope', request.headers.get('x-company-scope') || '')
  }
  if (request.headers.get('x-branch-scope')) {
    headers.set('x-branch-scope', request.headers.get('x-branch-scope') || '')
  }
  if (request.headers.get('x-request-id')) headers.set('x-request-id', request.headers.get('x-request-id') || '')
  if (process.env.INTERNAL_BACKEND_TOKEN) {
    headers.set('authorization', `Bearer ${process.env.INTERNAL_BACKEND_TOKEN}`)
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

export function normalizeFastApiProxyError(error: unknown) {
  const reason = error instanceof Error ? error.message : String(error)
  return {
    error: 'Backend servisine ulasilamadi. Lutfen tekrar deneyin.',
    code: 'FASTAPI_BACKEND_UNREACHABLE',
    message: 'Backend servisine ulasilamadi. Lutfen tekrar deneyin.',
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

  const method = options.method || request.method
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000)

  try {
    const body = method === 'GET' || method === 'HEAD'
      ? undefined
      : options.bodyText ?? await request.text()
    const response = await fetch(targetUrl, {
      method,
      headers: buildBackendHeaders(request, options),
      body,
      cache: 'no-store',
      signal: controller.signal,
    })
    const contentType = response.headers.get('content-type') || 'application/json'
    const responseBody = await response.text()
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    return NextResponse.json(normalizeFastApiProxyError(error), { status: 503 })
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
