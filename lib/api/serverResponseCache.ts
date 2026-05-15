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
  const authScope = request.headers.get('authorization') ? 'auth' : 'anon'
  const cookieScope = request.headers.get('cookie')?.includes('demo_auth=true') ? 'demo' : 'session'
  return `${scope}:${authScope}:${cookieScope}:${url.pathname}?${url.searchParams.toString()}`
}
