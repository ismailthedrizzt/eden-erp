'use client'

import { createClient } from '@/lib/supabase/client'

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export async function apiClient<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')

  if (!options.skipAuth) {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const detail = body.detail || body
    const message = detail?.message || body.error || response.statusText
    throw new ApiError(message, response.status, detail?.code || body.code, detail)
  }

  return response.json() as Promise<T>
}
