export type ReferenceOption = {
  value: string
  label: string
}

export function normalizeReferenceSearch(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function matchesReferenceSearch(values: unknown[], query: string) {
  const normalizedQuery = normalizeReferenceSearch(query)
  if (!normalizedQuery) return true

  return values.some(value => normalizeReferenceSearch(value).includes(normalizedQuery))
}

export function parseReferenceLimit(value: string | null, defaultLimit = 50, maxLimit = 100) {
  if (!value) return defaultLimit
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit
  return Math.min(parsed, maxLimit)
}

export function hasReferenceQuery(searchParams: URLSearchParams) {
  return searchParams.has('q') || searchParams.has('limit')
}
