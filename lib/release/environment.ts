export type ReleaseEnvironment = 'development' | 'preview' | 'staging' | 'release' | 'test'

type EnvSource = Record<string, string | undefined>

const DEVELOPMENT_ALIASES = new Set(['development', 'develop', 'dev', 'local'])
const PREVIEW_ALIASES = new Set(['preview'])
const STAGING_ALIASES = new Set(['staging'])
const RELEASE_ALIASES = new Set(['release', 'production', 'prod'])
const TEST_ALIASES = new Set(['test', 'ci'])

export function getCurrentReleaseEnvironment(source: EnvSource = process.env): ReleaseEnvironment {
  const explicit = normalizeEnvironmentValue(source.NEXT_PUBLIC_APP_ENV)
    || normalizeEnvironmentValue(source.NEXT_PUBLIC_RELEASE_CHANNEL)

  if (explicit) return explicit

  const vercelEnv = source.VERCEL_ENV?.trim().toLowerCase()
  if (vercelEnv === 'production') return 'release'
  if (vercelEnv === 'preview') return 'preview'
  if (vercelEnv === 'development') return 'development'

  const nodeEnv = source.NODE_ENV?.trim().toLowerCase()
  if (nodeEnv === 'test') return 'test'
  if (nodeEnv === 'development') return 'development'
  if (nodeEnv === 'production') return 'release'

  return 'development'
}

export function isReleaseEnvironment(source: EnvSource = process.env) {
  return getCurrentReleaseEnvironment(source) === 'release'
}

export function isPreviewEnvironment(source: EnvSource = process.env) {
  return getCurrentReleaseEnvironment(source) === 'preview'
}

export function isStagingEnvironment(source: EnvSource = process.env) {
  return getCurrentReleaseEnvironment(source) === 'staging'
}

export function isRemoteProtectedEnvironment(source: EnvSource = process.env) {
  return ['preview', 'staging', 'release'].includes(getCurrentReleaseEnvironment(source))
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
  if (PREVIEW_ALIASES.has(normalized)) return 'preview'
  if (STAGING_ALIASES.has(normalized)) return 'staging'
  if (RELEASE_ALIASES.has(normalized)) return 'release'
  if (TEST_ALIASES.has(normalized)) return 'test'
  return null
}
