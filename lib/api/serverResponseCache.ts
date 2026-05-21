import 'server-only'

import { APP_SESSION_COOKIE_NAME } from '@/lib/auth/appSession'
import { TENANT_ID_COOKIE, TENANT_ID_HEADER, WORKSPACE_ID_COOKIE, WORKSPACE_ID_HEADER } from '@/lib/tenancy/constants'

type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const cache = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL_MS = 10_000
const MAX_ENTRIES = 250

export function getServerResponseCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.value
}

export function setServerResponseCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  })
}

export function serverListCacheKey(request: Request, scope: string) {
  const url = new URL(request.url)
  const cookies = parseCookieHeader(request.headers.get('cookie') || '')
  const authorization = request.headers.get('authorization') || ''
  const tenantScope =
    request.headers.get(TENANT_ID_HEADER)
    || request.headers.get(WORKSPACE_ID_HEADER)
    || cookies[TENANT_ID_COOKIE]
    || cookies[WORKSPACE_ID_COOKIE]
    || 'default'
  const sessionToken = cookies[APP_SESSION_COOKIE_NAME] || authorization
  const sessionScope = sessionToken ? stableHash(sessionToken) : 'anon'

  return `${scope}:tenant=${tenantScope}:session=${sessionScope}:${url.pathname}?${url.searchParams.toString()}`
}

function parseCookieHeader(header: string) {
  return Object.fromEntries(
    header
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const separatorIndex = part.indexOf('=')
        if (separatorIndex === -1) return [part, '']
        return [
          safeDecodeURIComponent(part.slice(0, separatorIndex).trim()),
          safeDecodeURIComponent(part.slice(separatorIndex + 1).trim()),
        ]
      })
  ) as Record<string, string>
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function stableHash(value: string) {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}
