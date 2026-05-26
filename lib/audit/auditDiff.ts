import 'server-only'

export function diffAuditValues(
  oldValues: Record<string, any> | null | undefined,
  newValues: Record<string, any> | null | undefined
) {
  const before = oldValues || {}
  const after = newValues || {}
  const fields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  const changedFields = fields.filter(field => normalizeAuditComparableValue(before[field]) !== normalizeAuditComparableValue(after[field]))

  return {
    changedFields,
    oldValues: Object.fromEntries(changedFields.map(field => [field, before[field] ?? null])),
    newValues: Object.fromEntries(changedFields.map(field => [field, after[field] ?? null])),
  }
}

export function pickChangedValues(
  oldRecord: Record<string, any> | null | undefined,
  newRecord: Record<string, any> | null | undefined,
  fields?: string[]
) {
  const before = oldRecord || {}
  const after = newRecord || {}
  const keys = fields?.length ? fields : Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  const changedFields = keys.filter(field => normalizeAuditComparableValue(before[field]) !== normalizeAuditComparableValue(after[field]))

  return {
    changedFields,
    oldValues: Object.fromEntries(changedFields.map(field => [field, before[field] ?? null])),
    newValues: Object.fromEntries(changedFields.map(field => [field, after[field] ?? null])),
  }
}

export function normalizeAuditComparableValue(value: unknown) {
  if (value === undefined) return 'null'
  if (value === null) return 'null'
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort())
  return String(value)
}

export function summarizeChangedFields(fields: string[], entityType?: string | null) {
  if (!fields.length) return entityType ? `${entityType} kaydinda degisiklik yok.` : 'Degisiklik yok.'
  const visible = fields.slice(0, 4).join(', ')
  const suffix = fields.length > 4 ? ` ve ${fields.length - 4} alan daha` : ''
  return `${visible}${suffix} guncellendi.`
}
