'use client'

const DEFAULT_USER_KEY = 'legacy-user'

export function getCurrentWidgetPreferenceUserKey() {
  if (typeof window === 'undefined') return DEFAULT_USER_KEY
  return (
    localStorage.getItem('eden-current-user-id') ||
    localStorage.getItem('currentUserId') ||
    localStorage.getItem('userId') ||
    DEFAULT_USER_KEY
  )
}

export function widgetPreferenceStorageKey(scope: string) {
  return `eden:${getCurrentWidgetPreferenceUserKey()}:widgets:${scope}`
}

export function parseWidgetPreferenceIds(value: string | null, fallbackIds: string[], allowedIds = fallbackIds) {
  if (!value) return fallbackIds
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return fallbackIds
    return normalizeWidgetPreferenceIds(parsed, allowedIds)
  } catch {
    return fallbackIds
  }
}

export function normalizeWidgetPreferenceIds(ids: unknown[], allowedIds: string[]) {
  const allowed = new Set(allowedIds)
  const normalized = ids
    .map(id => String(id))
    .filter(id => allowed.has(id))
  return Array.from(new Set(normalized))
}

export function moveWidgetId(ids: string[], draggedId: string, targetId: string) {
  if (draggedId === targetId) return ids
  const from = ids.indexOf(draggedId)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0) return ids

  const next = [...ids]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
