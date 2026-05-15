export type EntityDetailCacheEntry<TData, TMeta = unknown> = {
  data: TData
  meta?: TMeta
  expiresAt: number
}

type WriteOptions<TMeta> = {
  meta?: TMeta
  ttlMs?: number
}

const DEFAULT_TTL_MS = 5 * 60 * 1000
const DEFAULT_LIMIT = 120
const cache = new Map<string, EntityDetailCacheEntry<unknown, unknown>>()

function cacheKey(namespace: string, id: string) {
  return `${namespace}:${id}`
}

export function readEntityDetailCache<TData, TMeta = unknown>(namespace: string, id?: string | null) {
  if (!id) return null

  const key = cacheKey(namespace, id)
  const cached = cache.get(key) as EntityDetailCacheEntry<TData, TMeta> | undefined
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }

  cache.delete(key)
  cache.set(key, cached)
  return cached
}

export function writeEntityDetailCache<TData, TMeta = unknown>(
  namespace: string,
  id: string | undefined | null,
  data: TData,
  options: WriteOptions<TMeta> = {}
) {
  if (!id) return

  while (cache.size >= DEFAULT_LIMIT) {
    const firstKey = cache.keys().next().value
    if (!firstKey) break
    cache.delete(firstKey)
  }

  cache.set(cacheKey(namespace, id), {
    data,
    meta: options.meta,
    expiresAt: Date.now() + (options.ttlMs ?? DEFAULT_TTL_MS),
  })
}

export function invalidateEntityDetailCache(namespace?: string, id?: string | null) {
  if (!namespace) {
    cache.clear()
    return
  }

  if (id) {
    cache.delete(cacheKey(namespace, id))
    return
  }

  const prefix = `${namespace}:`
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}
