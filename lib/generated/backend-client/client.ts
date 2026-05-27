import type { paths } from './types'

type BackendClientOptions = {
  baseUrl?: string
  defaultHeaders?: HeadersInit
}

type BackendRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | null | undefined>
}

export type BackendPaths = paths

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
      throw new BackendApiError(
        payload?.message || payload?.error || 'Islem tamamlanamadi.',
        payload?.code || 'BACKEND_REQUEST_FAILED',
        response.status,
        payload?.details,
      )
    }
    return payload as T
  }

  return { request }
}

export const backendClient = createBackendClient()
