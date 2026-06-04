'use client'

import { createClient } from '@/lib/supabase/client'
import { getPublicApiBaseUrl } from '@/lib/api/publicApiBaseUrl'
import { normalizeBackendError } from '@/lib/backend/backendErrors'
import { tenantRequestHeaders } from '@/lib/tenancy/client'

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown
  requestId?: string | null
  correlationId?: string | null

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
    requestId?: string | null,
    correlationId?: string | null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
    this.correlationId = correlationId
  }
}

export interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean
  query?: Record<string, string | number | boolean | null | undefined>
  useCache?: boolean
  staleTime?: number
  tenantId?: string | null
}

const DEFAULT_STALE_TIME = 60_000
const getCache = new Map<string, { expiresAt: number; value: unknown }>()
const inFlightGets = new Map<string, Promise<unknown>>()

type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null

function buildUrl(path: string, query?: ApiClientOptions['query']) {
  const apiBaseUrl = getPublicApiBaseUrl()
  const url = path.startsWith('http') || path.startsWith('/api/')
    ? path
    : `${apiBaseUrl}${path}`
  if (!query) return url

  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    params.set(key, String(value))
  })

  const queryString = params.toString()
  if (!queryString) return url
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`
}

async function request<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const { query, useCache, staleTime, tenantId, ...requestOptions } = options
  const method = (requestOptions.method || 'GET').toUpperCase()
  const url = buildUrl(path, query)
  const tenantHeaders = tenantRequestHeaders(tenantId)
  const tenantScope = tenantHeaders['x-eden-tenant-id'] || tenantHeaders['x-eden-workspace-id'] || tenantId || 'default'
  const shouldCache = method === 'GET' && useCache !== false
  const cacheKey = shouldCache ? `tenant=${tenantScope}:${url}` : ''

  if (shouldCache) {
    const cached = getCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.value as T

    const existing = inFlightGets.get(cacheKey)
    if (existing) return existing as Promise<T>
  }

  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')

  Object.entries(tenantHeaders).forEach(([key, value]) => {
    if (!headers.has(key)) headers.set(key, value)
  })

  if (!options.skipAuth) {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const promise = fetch(url, {
    ...requestOptions,
    headers,
  }).then(async (response) => {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const detail = body.detail || body
      const backendError = normalizeBackendError(detail, response.status)
      const serverMessage = detail?.message || body.error
      const message =
        serverMessage ||
        (response.status === 409
          ? 'Bu kayit baska bir kullanici tarafindan guncellendi. Lutfen kaydi yenileyin.'
          : response.statusText)
      throw new ApiError(
        message,
        response.status,
        detail?.code || body.code || backendError.code,
        detail,
        detail?.request_id || backendError.requestId,
        detail?.correlation_id || backendError.correlationId,
      )
    }

    if (response.status === 204) return undefined as T
    const value = await response.json() as T
    if (shouldCache) {
      getCache.set(cacheKey, { value, expiresAt: Date.now() + (staleTime ?? DEFAULT_STALE_TIME) })
    }
    return value
  }).finally(() => {
    if (shouldCache) inFlightGets.delete(cacheKey)
  })

  if (shouldCache) inFlightGets.set(cacheKey, promise)
  return promise
}

function withJsonBody(method: string, body?: JsonBody, options: ApiClientOptions = {}) {
  const nextBody = addClientRequestId(method, body)
  return {
    ...options,
    method,
    body: nextBody === undefined ? undefined : JSON.stringify(nextBody),
  }
}

function addClientRequestId(method: string, body?: JsonBody): JsonBody | undefined {
  if (body === undefined) return undefined
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase())) return body
  if (!body || Array.isArray(body) || typeof body !== 'object') return body
  const record = body as Record<string, unknown>
  if (record.client_request_id || record.clientRequestId) return body
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return { ...record, client_request_id: `ui:${randomId}` }
}


function matchesCachePrefix(key: string, prefix: string, resolvedPrefix: string) {
  return key.startsWith(prefix)
    || key.startsWith(resolvedPrefix)
    || key.includes(`:${prefix}`)
    || key.includes(`:${resolvedPrefix}`)
}

export const apiClient = Object.assign(request, {
  get: <T>(path: string, options: ApiClientOptions = {}) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: JsonBody, options: ApiClientOptions = {}) => request<T>(path, withJsonBody('POST', body, options)),
  patch: <T>(path: string, body?: JsonBody, options: ApiClientOptions = {}) => request<T>(path, withJsonBody('PATCH', body, options)),
  delete: <T>(path: string, options: ApiClientOptions = {}) => request<T>(path, { ...options, method: 'DELETE' }),
  invalidate: (prefix?: string) => {
    if (!prefix) {
      getCache.clear()
      inFlightGets.clear()
      return
    }

    const resolvedPrefix = buildUrl(prefix)
    for (const key of getCache.keys()) {
      if (matchesCachePrefix(key, prefix, resolvedPrefix)) getCache.delete(key)
    }
    for (const key of inFlightGets.keys()) {
      if (matchesCachePrefix(key, prefix, resolvedPrefix)) inFlightGets.delete(key)
    }
  },
})
