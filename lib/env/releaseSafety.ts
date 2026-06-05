import { getCurrentReleaseEnvironment } from '@/lib/release/environment'

type EnvSource = Record<string, string | undefined>

const SECRET_PUBLIC_PATTERNS = [
  /NEXT_PUBLIC_.*SERVICE_ROLE/i,
  /NEXT_PUBLIC_.*INTERNAL_BACKEND_TOKEN/i,
  /NEXT_PUBLIC_.*TOKEN/i,
  /NEXT_PUBLIC_.*PASSWORD/i,
  /NEXT_PUBLIC_.*PRIVATE/i,
  /NEXT_PUBLIC_.*SECRET/i,
  /NEXT_PUBLIC_.*JWT/i,
]

export function getReleaseEnvSafetyViolations(source: EnvSource = process.env) {
  const env = getCurrentReleaseEnvironment(source)
  const violations: string[] = []

  if (env === 'release') {
    if (isEnabled(source.EDEN_LOGIN_DISABLED)) {
      violations.push('EDEN_LOGIN_DISABLED cannot be true in release.')
    }
    if (isEnabled(source.EDEN_ALLOW_LEGACY_API_ACCESS)) {
      violations.push('EDEN_ALLOW_LEGACY_API_ACCESS cannot be true in release.')
    }
    if (isEnabled(source.EDEN_ENABLE_LEGACY_SUPABASE_AUTH)) {
      violations.push('EDEN_ENABLE_LEGACY_SUPABASE_AUTH cannot be true in release.')
    }
    if (isEnabled(source.NEXT_PUBLIC_DEMO_MODE)) {
      violations.push('NEXT_PUBLIC_DEMO_MODE cannot be true in release.')
    }
    if (isEnabled(source.ALLOW_RELEASE_DB_SEED)) {
      violations.push('ALLOW_RELEASE_DB_SEED cannot be true in release.')
    }
    if (isEnabled(source.ALLOW_RELEASE_DB_RESET)) {
      violations.push('ALLOW_RELEASE_DB_RESET cannot be true in release.')
    }
    if (!source.DATABASE_URL) {
      violations.push('DATABASE_URL is required in release.')
    }
    if (!source.APP_SESSION_SECRET && !source.SETUP_INTENT_SECRET && !source.OTP_SECRET) {
      violations.push('APP_SESSION_SECRET or an equivalent app-session secret is required in release.')
    }
    if (!source.INTERNAL_BACKEND_TOKEN) {
      violations.push('INTERNAL_BACKEND_TOKEN is required in release.')
    }
    if (!source.FASTAPI_BASE_URL) {
      violations.push('FASTAPI_BASE_URL is required in release.')
    }
    if (isEnabled(source.ALLOW_TRUSTED_PROXY_HEADERS) && !source.TRUSTED_PROXY_SECRET) {
      violations.push('TRUSTED_PROXY_SECRET is required when ALLOW_TRUSTED_PROXY_HEADERS=true in release.')
    }
  }

  for (const key of Object.keys(source)) {
    if (SECRET_PUBLIC_PATTERNS.some(pattern => pattern.test(key))) {
      violations.push(`${key} looks like a secret but is exposed with NEXT_PUBLIC_.`)
    }
  }

  return violations
}

export function assertReleaseEnvSafety(source: EnvSource = process.env) {
  const violations = getReleaseEnvSafetyViolations(source)
  if (violations.length) {
    throw new Error(`Release environment safety failed: ${violations.join(' ')}`)
  }
}

function isEnabled(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() || '')
}
