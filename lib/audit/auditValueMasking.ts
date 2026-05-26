import 'server-only'

const SENSITIVE_PATTERNS = [
  'password',
  'token',
  'secret',
  'api_key',
  'access_token',
  'refresh_token',
  'credential',
  'private_key',
  'signed_url',
  'document_url',
  'iban',
  'account_no',
  'identity_number',
  'national_id',
  'passport_no',
  'tax_number',
  'phone',
  'email',
]

export function maskAuditValues<T>(values: T): T {
  if (Array.isArray(values)) return values.map(item => maskAuditValues(item)) as T
  if (!values || typeof values !== 'object') return values

  return Object.fromEntries(
    Object.entries(values as Record<string, unknown>).map(([field, value]) => [
      field,
      isSensitiveField(field) ? maskSensitiveValue(field, value) : maskAuditValues(value),
    ])
  ) as T
}

export function isSensitiveField(field: string) {
  const normalized = field.toLowerCase()
  return SENSITIVE_PATTERNS.some(pattern => normalized.includes(pattern))
}

export function maskSensitiveValue(field: string, value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'string' && typeof value !== 'number') return '[MASKED]'

  const text = String(value)
  const normalized = field.toLowerCase()
  if (!text) return text
  if (['password', 'token', 'secret', 'api_key', 'access_token', 'refresh_token', 'credential', 'private_key', 'signed_url', 'document_url']
    .some(pattern => normalized.includes(pattern))) {
    return '[MASKED]'
  }
  if (normalized.includes('email')) return maskEmail(text)
  if (normalized.includes('phone')) return maskPhone(text)
  if (normalized.includes('iban') || normalized.includes('account_no')) return maskIban(text)
  return maskIdentifier(text)
}

export function maskEmail(value: string) {
  const [local, domain] = value.split('@')
  if (!local || !domain) return maskIdentifier(value)
  const visibleLocal = local.slice(0, 1)
  const domainParts = domain.split('.')
  const domainName = domainParts[0] || ''
  const suffix = domainParts.slice(1).join('.')
  return `${visibleLocal}${'*'.repeat(Math.max(2, local.length - 1))}@${domainName.slice(0, 1)}***${suffix ? `.${suffix}` : ''}`
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 4) return '*'.repeat(digits.length)
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

export function maskIdentifier(value: string) {
  const trimmed = value.trim()
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length)
  return `${'*'.repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`
}

export function maskIban(value: string) {
  const compact = value.replace(/\s/g, '')
  if (compact.length <= 4) return '*'.repeat(compact.length)
  return `${'*'.repeat(Math.max(0, compact.length - 4))}${compact.slice(-4)}`
}
