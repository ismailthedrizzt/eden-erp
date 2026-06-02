const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = process.cwd()
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
  if (isEnabled(process.env.NEXT_PUBLIC_DEMO_MODE)) failures.push('NEXT_PUBLIC_DEMO_MODE=true is forbidden in release.')
  if (isEnabled(process.env.ALLOW_RELEASE_DB_SEED)) failures.push('ALLOW_RELEASE_DB_SEED=true is forbidden in release.')
  if (isEnabled(process.env.ALLOW_RELEASE_DB_RESET)) failures.push('ALLOW_RELEASE_DB_RESET=true is forbidden in release.')

  if (!process.env.DATABASE_URL) failures.push('DATABASE_URL is required in release.')

  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  if (supabaseConfigured) {
    for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
      if (!process.env[key]) failures.push(`${key} is required when Supabase is configured.`)
    }
  }
  if (process.env.REQUIRE_FASTAPI_BASE_URL === 'true' && !process.env.FASTAPI_BASE_URL) {
    failures.push('FASTAPI_BASE_URL is required because REQUIRE_FASTAPI_BASE_URL=true.')
  }

  if (looksLikeDevelopmentSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    failures.push('Release env appears to point at a development Supabase URL.')
  }
}

if (env === 'development' && looksLikeReleaseSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  warnings.push('Development env appears to point at a release Supabase URL.')
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
  console.error('Suggested fix: correct the Vercel/Supabase env values before build or deployment.')
  process.exit(1)
}

console.log('PASS')

function resolveEnvironment(source) {
  const explicit = normalize(source.NEXT_PUBLIC_APP_ENV) || normalize(source.NEXT_PUBLIC_RELEASE_CHANNEL)
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

function looksLikeDevelopmentSupabase(value) {
  const url = String(value || '').toLowerCase()
  if (!url) return false
  if (process.env.DEVELOPMENT_SUPABASE_URL && url === process.env.DEVELOPMENT_SUPABASE_URL.toLowerCase()) return true
  if (process.env.DEVELOPMENT_SUPABASE_PROJECT_REF && url.includes(process.env.DEVELOPMENT_SUPABASE_PROJECT_REF.toLowerCase())) return true
  return /\b(dev|development|preview|test)\b/.test(url)
}

function looksLikeReleaseSupabase(value) {
  const url = String(value || '').toLowerCase()
  if (!url) return false
  if (process.env.RELEASE_SUPABASE_URL && url === process.env.RELEASE_SUPABASE_URL.toLowerCase()) return true
  if (process.env.RELEASE_SUPABASE_PROJECT_REF && url.includes(process.env.RELEASE_SUPABASE_PROJECT_REF.toLowerCase())) return true
  return /\b(prod|production|release)\b/.test(url)
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
