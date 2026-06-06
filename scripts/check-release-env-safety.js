const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = process.cwd()
loadLocalEnvFile(path.join(root, '.env.local'))

const failures = []
const warnings = []
const env = resolveEnvironment(process.env)

const forbiddenEnvFiles = ['.env', '.env.local', '.env.production', '.env.release', 'backend/.env']
for (const file of forbiddenEnvFiles) {
  if (isTracked(file)) failures.push(`Local secret file must not be tracked: ${file}`)
}

const publicSecretPatterns = [
  /NEXT_PUBLIC_.*SERVICE_ROLE/i,
  /NEXT_PUBLIC_.*INTERNAL_BACKEND_TOKEN/i,
  /NEXT_PUBLIC_.*TOKEN/i,
  /NEXT_PUBLIC_.*PASSWORD/i,
  /NEXT_PUBLIC_.*PRIVATE/i,
  /NEXT_PUBLIC_.*TRUSTED_PROXY_SECRET/i,
  /NEXT_PUBLIC_.*JWT/i,
  /NEXT_PUBLIC_.*CRON_SECRET/i,
  /NEXT_PUBLIC_.*SECRET/i,
]

for (const key of Object.keys(process.env)) {
  if (publicSecretPatterns.some(pattern => pattern.test(key))) {
    failures.push(`${key} looks like a secret but is exposed with NEXT_PUBLIC_.`)
  }
}

for (const file of [
  '.env.local.example',
  '.env.development.example',
  '.env.release.example',
  'backend/.env.example',
  'backend/.env.development.example',
  'backend/.env.release.example',
]) {
  const absolute = path.join(root, file)
  if (!fs.existsSync(absolute)) continue
  const content = fs.readFileSync(absolute, 'utf8')
  for (const pattern of publicSecretPatterns) {
    if (pattern.test(content)) failures.push(`${file} exposes a secret-looking NEXT_PUBLIC_* variable.`)
  }
}

if (env === 'release') {
  if (isEnabled(process.env.EDEN_LOGIN_DISABLED)) failures.push('EDEN_LOGIN_DISABLED=true is forbidden in release.')
  if (isEnabled(process.env.EDEN_ALLOW_LEGACY_API_ACCESS)) failures.push('EDEN_ALLOW_LEGACY_API_ACCESS=true is forbidden in release.')
  if (isEnabled(process.env.EDEN_ENABLE_LEGACY_SUPABASE_AUTH)) failures.push('EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true is forbidden in release.')
  if (isEnabled(process.env.LEGACY_SUPABASE_JWT_ENABLED)) failures.push('LEGACY_SUPABASE_JWT_ENABLED=true is forbidden in release.')
  if (isDisabled(process.env.AUTH_REQUIRED)) failures.push('AUTH_REQUIRED=false is forbidden in release.')
  if (isEnabled(process.env.NEXT_PUBLIC_DEMO_MODE)) failures.push('NEXT_PUBLIC_DEMO_MODE=true is forbidden in release.')
  if (isEnabled(process.env.ALLOW_RELEASE_DB_SEED)) failures.push('ALLOW_RELEASE_DB_SEED=true is forbidden in release.')
  if (isEnabled(process.env.ALLOW_RELEASE_DB_RESET)) failures.push('ALLOW_RELEASE_DB_RESET=true is forbidden in release.')

  if (!process.env.DATABASE_URL) failures.push('DATABASE_URL is required in release.')
  if (!process.env.APP_SESSION_SECRET) failures.push('APP_SESSION_SECRET is required in release.')
  if (!process.env.INTERNAL_BACKEND_TOKEN) failures.push('INTERNAL_BACKEND_TOKEN is required in release.')
  if (!process.env.FASTAPI_BASE_URL) failures.push('FASTAPI_BASE_URL is required in release.')
  if (isEnabled(process.env.ALLOW_TRUSTED_PROXY_HEADERS) && !process.env.TRUSTED_PROXY_SECRET) {
    failures.push('TRUSTED_PROXY_SECRET is required when ALLOW_TRUSTED_PROXY_HEADERS=true in release.')
  }
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) {
  warnings.push('Supabase env configured in local DB deployment. Confirm this is legacy compatibility only.')
}

if (process.env.VERCEL_ENV) {
  warnings.push('VERCEL_ENV is compatibility-only. APP_ENV or NEXT_PUBLIC_APP_ENV is the canonical environment source.')
}

for (const file of collectFiles(root, ['app', 'components', 'lib'], ['.ts', '.tsx', '.js', '.jsx'])) {
  const relative = path.relative(root, file).replace(/\\/g, '/')
  const content = fs.readFileSync(file, 'utf8')
  if (content.includes('NEXT_PUBLIC_INTERNAL_BACKEND_TOKEN')) {
    failures.push(`${relative} references NEXT_PUBLIC_INTERNAL_BACKEND_TOKEN.`)
  }
  if (content.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')) {
    failures.push(`${relative} references NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.`)
  }
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(content) && content.startsWith("'use client'")) {
    failures.push(`${relative} is a client component referencing SUPABASE_SERVICE_ROLE_KEY.`)
  }
}

console.log(`Release environment safety check: env=${env}`)
for (const warning of warnings) console.warn(`WARN: ${warning}`)

if (failures.length) {
  console.error('FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('Suggested fix: correct remote server/local database env values before build or deployment.')
  process.exit(1)
}

console.log('PASS')

function resolveEnvironment(source) {
  const explicit = normalize(source.APP_ENV) || normalize(source.NEXT_PUBLIC_APP_ENV) || normalize(source.NEXT_PUBLIC_RELEASE_CHANNEL)
  if (explicit) return explicit
  if (source.VERCEL_ENV === 'production') return 'release'
  if (source.NODE_ENV === 'test') return 'test'
  if (source.NODE_ENV === 'production') return 'release'
  return 'development'
}

function normalize(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (['release', 'production', 'prod'].includes(normalized)) return 'release'
  if (['development', 'develop', 'dev', 'preview', 'local'].includes(normalized)) return 'development'
  if (['test', 'ci'].includes(normalized)) return 'test'
  return null
}

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function isDisabled(value) {
  return ['0', 'false', 'no', 'off'].includes(String(value || '').trim().toLowerCase())
}

function collectFiles(base, folders, extensions) {
  const files = []
  for (const folder of folders) walk(path.join(base, folder), files, extensions)
  return files
}

function walk(current, files, extensions) {
  if (!fs.existsSync(current)) return
  const stat = fs.statSync(current)
  if (stat.isDirectory()) {
    if (['node_modules', '.next'].includes(path.basename(current))) return
    for (const child of fs.readdirSync(current)) walk(path.join(current, child), files, extensions)
    return
  }
  if (extensions.includes(path.extname(current))) files.push(current)
}

function isTracked(file) {
  try {
    return execSync(`git ls-files -- "${file}"`, { cwd: root, encoding: 'utf8' }).trim().length > 0
  } catch {
    return false
  }
}

function loadLocalEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const contents = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const equalsIndex = line.indexOf('=')
    if (equalsIndex <= 0) continue
    const key = line.slice(0, equalsIndex).trim()
    if (!/^[A-Z0-9_]+$/i.test(key)) continue
    if (process.env[key] !== undefined) continue
    process.env[key] = stripEnvValue(line.slice(equalsIndex + 1).trim())
  }
}

function stripEnvValue(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}
