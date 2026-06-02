import 'server-only'

import { buildFastApiUrl } from '@/lib/backend/fastApiProxy'

export type LoginIdentifierType = 'email' | 'phone'

export type TenantAccessOption = {
  tenant_id: string
  tenant_name: string
  logoUrl?: string | null
  role_label?: string | null
  role_key?: string | null
  is_default?: boolean
}

export type TenantUserLookupResult = {
  identifier: string
  identifier_type: LoginIdentifierType
  user_id: string | null
  display_name: string | null
  tenants: TenantAccessOption[]
  status: 'found' | 'no_tenants'
  message: string
}

export type TenantLoginStatus = {
  login_enabled: boolean
  tenant_count: number
  status: 'ready' | 'empty'
}

export function normalizeLoginIdentifier(value: string) {
  const trimmed = value.trim()
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)

  if (email) {
    return { identifier: trimmed.toLowerCase(), type: 'email' as const }
  }

  let digits = trimmed.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('90')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)

  if (/^[0-9]{10,11}$/.test(digits)) {
    return { identifier: digits, type: 'phone' as const }
  }

  return null
}

export async function lookupTenantUserAccess(value: string): Promise<TenantUserLookupResult> {
  const normalized = normalizeLoginIdentifier(value)
  if (!normalized) throw new Error('Gecerli bir e-posta veya telefon numarasi giriniz.')

  return callAuthBackend<TenantUserLookupResult>('/api/v1/auth/tenant-access', {
    method: 'POST',
    body: JSON.stringify({ identifier: normalized.identifier }),
  })
}

export async function lookupTenantLoginStatus(_unused?: unknown): Promise<TenantLoginStatus> {
  return callAuthBackend<TenantLoginStatus>('/api/v1/auth/tenant-status')
}

async function callAuthBackend<T>(path: string, init: RequestInit = {}) {
  const targetUrl = buildFastApiUrl(path)
  if (!targetUrl) {
    throw new Error('FastAPI backend servisi yapilandirilmamis. FASTAPI_BASE_URL zorunludur.')
  }

  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  if (process.env.INTERNAL_BACKEND_TOKEN) {
    headers.set('authorization', `Bearer ${process.env.INTERNAL_BACKEND_TOKEN}`)
  }
  if (process.env.TRUSTED_PROXY_SECRET) {
    headers.set('x-proxy-secret', process.env.TRUSTED_PROXY_SECRET)
  }

  const response = await fetch(targetUrl, {
    ...init,
    headers,
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Kullanici sorgusu FastAPI tarafinda tamamlanamadi.')
  }

  return (payload?.data ?? payload) as T
}
