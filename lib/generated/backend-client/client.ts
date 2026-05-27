// HAND_WRITTEN_ADAPTER
// Generated contract types live in ./types.ts; keep this adapter small and reviewable.

import type { paths } from './types'

type BackendClientOptions = {
  baseUrl?: string
  defaultHeaders?: HeadersInit
}

type BackendRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | null | undefined>
}

export type BackendPaths = paths

export type BackendApiSuccess<T> = {
  data: T
  message?: string | null
  warnings?: string[] | null
}

export type BackendOperationResponse<T> = BackendApiSuccess<T> & {
  operation_id?: string | null
  operation_status?: string | null
}

export type BackendListResponse<T> = {
  data: T[]
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    totalPages?: number
  }
  projection?: {
    key?: string
    name?: string
    version?: string
    sourceName?: string | null
    fallbackUsed?: boolean
  } | null
  warnings?: string[] | null
}

export type BackendApiErrorBody = {
  error?: string
  code?: string
  message?: string
  details?: unknown
  operation_id?: string | null
  operation_status?: string | null
}

export class BackendApiError extends Error {
  code: string
  status: number
  details: unknown

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message)
    this.name = 'BackendApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function normalizeBackendApiError(payload: unknown, status: number) {
  const body = payload && typeof payload === 'object' ? payload as BackendApiErrorBody : {}
  return new BackendApiError(
    body.message || body.error || 'Islem tamamlanamadi.',
    body.code || 'BACKEND_REQUEST_FAILED',
    status,
    body.details,
  )
}

export function unwrapBackendData<T>(payload: BackendApiSuccess<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as BackendApiSuccess<T>).data
  }
  return payload as T
}

export function createBackendClient(options: BackendClientOptions = {}) {
  const baseUrl = (options.baseUrl || '').replace(/\/+$/, '')

  async function request<T>(path: string, init: BackendRequestOptions = {}): Promise<T> {
    const url = new URL(`${baseUrl}${path}`, baseUrl || 'http://localhost')
    Object.entries(init.query || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) url.searchParams.set(key, String(value))
    })
    const response = await fetch(baseUrl ? url.toString() : `${path}${url.search}`, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...options.defaultHeaders,
        ...init.headers,
      },
      cache: init.cache ?? 'no-store',
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw normalizeBackendApiError(payload, response.status)
    }
    return payload as T
  }

  return { request }
}

export const backendClient = createBackendClient()
