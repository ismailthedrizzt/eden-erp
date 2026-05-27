import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantContext } from '@/lib/tenancy/server'

type ProxyOptions = {
  method?: string
  tenantId?: string | null
  userId?: string | null
  companyScope?: string | null
  timeoutMs?: number
  bodyText?: string
}

function backendBaseUrl() {
  return process.env.FASTAPI_BASE_URL?.replace(/\/+$/, '') || null
}

export function isFastApiEnabled() {
  return Boolean(backendBaseUrl())
}

export function buildBackendHeaders(request: NextRequest, options: ProxyOptions = {}) {
  const tenantContext = resolveTenantContext(request)
  const headers = new Headers()
  headers.set('accept', request.headers.get('accept') || 'application/json')
  headers.set('content-type', request.headers.get('content-type') || 'application/json')
  headers.set('x-tenant-id', options.tenantId || tenantContext.tenantId)
  headers.set('x-user-id', options.userId || request.headers.get('x-user-id') || '')
  if (options.companyScope) headers.set('x-company-scope', options.companyScope)
  if (request.headers.get('x-request-id')) headers.set('x-request-id', request.headers.get('x-request-id') || '')
  if (process.env.INTERNAL_BACKEND_TOKEN) {
    headers.set('authorization', `Bearer ${process.env.INTERNAL_BACKEND_TOKEN}`)
  }
  return headers
}

export async function proxyToFastApi(
  request: NextRequest,
  targetPath: string,
  options: ProxyOptions = {}
) {
  const baseUrl = backendBaseUrl()
  if (!baseUrl) return null

  const targetUrl = new URL(`${baseUrl}${targetPath}`)
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value)
  })

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
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Backend servisine ulaşılamadı. Lütfen tekrar deneyin.',
        code: 'FASTAPI_BACKEND_UNREACHABLE',
        message: 'Backend servisine ulaşılamadı. Lütfen tekrar deneyin.',
        details: process.env.NODE_ENV === 'development' ? { reason: error?.message } : undefined,
      },
      { status: 503 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
