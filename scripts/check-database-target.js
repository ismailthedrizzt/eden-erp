const fs = require('fs')
const path = require('path')

loadLocalEnvFile(path.join(process.cwd(), '.env.local'))

const env = resolveEnvironment(process.env)
const context = String(process.env.COMMAND_CONTEXT || process.argv[2] || process.env.npm_lifecycle_event || '').toLowerCase()
const databaseUrl = process.env.DATABASE_URL || ''
const dbName = process.env.DB_NAME || extractDatabaseName(databaseUrl) || 'unknown'
const dbClass = normalizeDatabaseTargetClass(process.env.DATABASE_TARGET_CLASS) || classifyDatabaseTarget(databaseUrl, dbName)
const failures = []
const warnings = []

if (!databaseUrl) {
  failures.push('DATABASE_URL is required for database commands.')
}

if (dbClass === 'unknown') {
  warnings.push('Database target name is ambiguous. Use DATABASE_TARGET_CLASS=release or DATABASE_TARGET_CLASS=development when the DB name is intentionally neutral.')
  if (env === 'release') {
    failures.push('Release database target must be explicit.')
  }
}

if (env === 'development' && dbClass === 'release') {
  failures.push('Development context is pointing at a release-like database target.')
}

if (env === 'release') {
  if (/(demo|seed)/.test(context)) {
    failures.push('Release database is protected. Seed/demo commands are blocked.')
  }
  if (/reset/.test(context)) {
    failures.push('Release database is protected. Reset commands are blocked.')
  }
  if (/(import|mutation|write)/.test(context) && process.env.ALLOW_RELEASE_DB_MUTATION !== 'true') {
    failures.push('Release DB mutation commands require ALLOW_RELEASE_DB_MUTATION=true.')
  }
  if (/(migrate|migration)/.test(context)) {
    if (process.env.ALLOW_RELEASE_DB_MIGRATION !== 'true') {
      failures.push('Release migrations require ALLOW_RELEASE_DB_MIGRATION=true.')
    }
    if (!process.env.RELEASE_MIGRATION_APPROVED_BY) {
      failures.push('Release migrations require RELEASE_MIGRATION_APPROVED_BY=<name>.')
    }
  }
  if (process.env.ALLOW_RELEASE_DB_SEED === 'true') {
    failures.push('ALLOW_RELEASE_DB_SEED=true is forbidden in release.')
  }
  if (process.env.ALLOW_RELEASE_DB_RESET === 'true') {
    failures.push('ALLOW_RELEASE_DB_RESET=true is forbidden in release.')
  }
}

console.log(`Database target check: env=${env}`)
console.log(`Database target: ${maskDatabaseUrl(databaseUrl) || 'missing'}`)
console.log(`Database name: ${dbName}`)
console.log(`Database class: ${dbClass}`)
console.log(`Command context: ${context || 'unspecified'}`)
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
  if (source.NODE_ENV === 'test') return 'test'
  if (source.NODE_ENV === 'production') return 'release'
  if (source.VERCEL_ENV === 'production') return 'release'
  return 'development'
}

function normalize(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (['release', 'production', 'prod'].includes(normalized)) return 'release'
  if (['development', 'develop', 'dev', 'preview', 'local'].includes(normalized)) return 'development'
  if (['test', 'ci'].includes(normalized)) return 'test'
  return null
}

function extractDatabaseName(value) {
  try {
    const url = new URL(value)
    return decodeURIComponent(url.pathname.replace(/^\/+/, '')).split('/')[0] || ''
  } catch {
    return ''
  }
}

function classifyDatabaseTarget(databaseUrl, name) {
  const target = `${databaseUrl} ${name}`.toLowerCase()
  if (/\b(prod|production|release)\b/.test(target)) return 'release'
  if (/\b(dev|development|local|test|ci)\b/.test(target)) return 'development'
  return 'unknown'
}

function normalizeDatabaseTargetClass(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (['release', 'production', 'prod'].includes(normalized)) return 'release'
  if (['development', 'develop', 'dev', 'local', 'test', 'ci'].includes(normalized)) return 'development'
  return null
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

function maskDatabaseUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (url.password) url.password = '***'
    if (url.username) url.username = '***'
    return url.toString()
  } catch {
    return value.replace(/:\/\/[^:@]+:[^@]+@/, '://***:***@')
  }
}
