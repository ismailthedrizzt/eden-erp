const env = resolveEnvironment(process.env)
console.warn('DEPRECATED: check-supabase-target.js is legacy. Use scripts/check-database-target.js for remote server/local DB deployments.')
const context = String(process.env.COMMAND_CONTEXT || process.env.npm_lifecycle_event || process.argv[2] || '').toLowerCase()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const databaseUrl = process.env.DATABASE_URL || ''
const projectRef = process.env.SUPABASE_PROJECT_REF || extractProjectRef(supabaseUrl) || 'unknown'
const failures = []
const warnings = []

if (databaseUrl && !supabaseUrl) {
  warnings.push('Direct DATABASE_URL is configured; Supabase project target checks are skipped.')
} else if (env === 'release') {
  if (/(demo|seed)/.test(context)) {
    failures.push('VS database is protected. Seed/demo commands are blocked.')
  }

  if (/reset/.test(context)) {
    failures.push('VS database is protected. Reset commands are blocked.')
  }

  if (/(migrate|migration)/.test(context)) {
    if (process.env.ALLOW_RELEASE_DB_MIGRATION !== 'true') {
      failures.push('Release migrations require ALLOW_RELEASE_DB_MIGRATION=true.')
    }
    if (!process.env.RELEASE_MIGRATION_APPROVED_BY) {
      failures.push('Release migrations require RELEASE_MIGRATION_APPROVED_BY=<name>.')
    }
  }

  if (/(import|mutation|write)/.test(context) && process.env.ALLOW_RELEASE_DB_MUTATION !== 'true') {
    failures.push('Release DB mutation commands require ALLOW_RELEASE_DB_MUTATION=true.')
  }
}

if (!databaseUrl && env === 'development') {
  if (process.env.DEVELOPMENT_SUPABASE_PROJECT_REF && projectRef !== process.env.DEVELOPMENT_SUPABASE_PROJECT_REF) {
    failures.push('Development environment must target DEVELOPMENT_SUPABASE_PROJECT_REF.')
  }
  if (process.env.DEVELOPMENT_SUPABASE_URL && normalizeUrl(supabaseUrl) !== normalizeUrl(process.env.DEVELOPMENT_SUPABASE_URL)) {
    failures.push('Development environment must target DEVELOPMENT_SUPABASE_URL.')
  }
  if (process.env.RELEASE_SUPABASE_PROJECT_REF && projectRef === process.env.RELEASE_SUPABASE_PROJECT_REF) {
    failures.push('Development env points to the configured release Supabase project ref.')
  }
  if (process.env.RELEASE_SUPABASE_URL && normalizeUrl(supabaseUrl) === normalizeUrl(process.env.RELEASE_SUPABASE_URL)) {
    failures.push('Development env points to the configured release Supabase URL.')
  }
}

console.log(`Supabase target check: env=${env}`)
console.log(`Supabase project ref: ${projectRef}`)
console.log(`Command context: ${context || 'unspecified'}`)
for (const warning of warnings) console.warn(`WARN: ${warning}`)

if (failures.length) {
  console.error('FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('Suggested fix: run against the intended VS database and add explicit migration approval env values when required.')
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

function extractProjectRef(url) {
  try {
    const hostname = new URL(url).hostname
    return hostname.endsWith('.supabase.co') ? hostname.split('.')[0] : null
  } catch {
    return null
  }
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').toLowerCase()
}
