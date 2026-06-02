export type ReleaseEnvironment = 'development' | 'release' | 'test'

type EnvSource = Record<string, string | undefined>

const DEVELOPMENT_ALIASES = new Set(['development', 'develop', 'dev', 'preview', 'local'])
const RELEASE_ALIASES = new Set(['release', 'production', 'prod'])
const TEST_ALIASES = new Set(['test', 'ci'])

export function getCurrentReleaseEnvironment(source: EnvSource = process.env): ReleaseEnvironment {
  const explicit = normalizeEnvironmentValue(source.NEXT_PUBLIC_APP_ENV)
    || normalizeEnvironmentValue(source.NEXT_PUBLIC_RELEASE_CHANNEL)

  if (explicit) return explicit

  const vercelEnv = source.VERCEL_ENV?.trim().toLowerCase()
  if (vercelEnv === 'production') return 'release'
  if (vercelEnv === 'preview' || vercelEnv === 'development') return 'development'

  const nodeEnv = source.NODE_ENV?.trim().toLowerCase()
  if (nodeEnv === 'test') return 'test'
  if (nodeEnv === 'development') return 'development'

  return 'development'
}

export function isReleaseEnvironment(source: EnvSource = process.env) {
  return getCurrentReleaseEnvironment(source) === 'release'
}

export function isDevelopmentEnvironment(source: EnvSource = process.env) {
  return getCurrentReleaseEnvironment(source) === 'development'
}

export function isTestEnvironment(source: EnvSource = process.env) {
  return getCurrentReleaseEnvironment(source) === 'test'
}

function normalizeEnvironmentValue(value: string | undefined): ReleaseEnvironment | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  if (DEVELOPMENT_ALIASES.has(normalized)) return 'development'
  if (RELEASE_ALIASES.has(normalized)) return 'release'
  if (TEST_ALIASES.has(normalized)) return 'test'
  return null
}
