const fs = require('fs')
const path = require('path')

const root = process.cwd()

const skippedDirs = new Set([
  '.git',
  '.next',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  'node_modules',
  '__pycache__',
])

const clientRoots = [
  'app/app/',
  'components/',
]

const serverOnlyClientPatterns = [
  { pattern: /@\/lib\/supabase\/server/, label: 'server Supabase client' },
  { pattern: /@\/lib\/backend\/fastApiProxy/, label: 'FastAPI server proxy' },
  { pattern: /createServiceClient|createServerClient/, label: 'server DB client factory' },
  { pattern: /SUPABASE_SERVICE_ROLE_KEY|INTERNAL_BACKEND_TOKEN|TRUSTED_PROXY_SECRET/, label: 'server secret env' },
  { pattern: /\bpg\b|from ['"]pg['"]/, label: 'Postgres driver' },
  { pattern: /from ['"](fs|path|async_hooks)['"]/, label: 'Node server module' },
]

const backendCoreImportPattern = /@\/lib\/(operations|orchestrators|process|outbox|audit|integrity|setup|domains|read-models|action-center|action-guide|field-controls|workflow|services|documents\/documentThumbnail)/
const routeBackendImportPattern = /@\/lib\/(operations|orchestrators|process|outbox|audit|integrity|setup|domains|read-models|action-center|action-guide|field-controls|workflow|services|documents\/documentThumbnail|supabase\/server)/
const directDbPattern = /createServiceClient|createServerClient|supabase\s*\.\s*from\s*\(|\.(insert|update|upsert|delete|rpc)\s*\(/
const fallbackPattern = /fallback|legacy|temporary|LOCAL_REFERENCE_FALLBACK|localReferenceFallback/i
const lifecycleRoutePattern = /\/(companies|ownership-transactions|employees)\/|official-changes|opening-wizard|liquidation-wizard|deregistration-wizard|capital-increases|capital-decreases|authority-transactions/

function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    if (error && (error.code === 'EACCES' || error.code === 'EPERM')) return acc
    throw error
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && !skippedDirs.has(entry.name)) walk(full, predicate, acc)
    else if (entry.isFile() && predicate(full)) acc.push(full)
  }
  return acc
}

function toPosix(file) {
  return file.split(path.sep).join('/')
}

function rel(file) {
  return toPosix(path.relative(root, file))
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function isTsFile(file) {
  return /\.(ts|tsx)$/.test(file)
}

function isClientFile(file, source) {
  const relative = rel(file)
  return clientRoots.some(prefix => relative.startsWith(prefix)) || /['"]use client['"]/.test(source)
}

function migrationStatus(source) {
  return source.split(/\r?\n/).slice(0, 12).join('\n').match(/BACKEND_MIGRATION_STATUS:\s*([a-z_]+)/)?.[1] || null
}

function routePath(file) {
  return rel(file)
}

function checkClientBoundaries(files) {
  const errors = []
  const warnings = []
  for (const file of files) {
    const source = read(file)
    if (!isClientFile(file, source)) continue

    for (const rule of serverOnlyClientPatterns) {
      if (rule.pattern.test(source)) {
        errors.push(`${rel(file)} imports or references ${rule.label}`)
      }
    }

    if (backendCoreImportPattern.test(source)) {
      warnings.push(`${rel(file)} imports TS backend-core helpers; keep only frontend/shared contracts here`)
    }
  }
  return { errors, warnings }
}

function checkRouteBoundaries(routeFiles) {
  const errors = []
  const warnings = []
  const temporaryFallbacks = []

  for (const file of routeFiles) {
    const source = read(file)
    const status = migrationStatus(source)
    const hasBackendImport = routeBackendImportPattern.test(source)
    const hasDirectDb = directDbPattern.test(source)

    if (status === 'proxy_to_fastapi' && (hasBackendImport || hasDirectDb)) {
      errors.push(`${routePath(file)} is proxy_to_fastapi but still imports backend/domain or direct DB code`)
    }

    if (status === 'proxy_to_fastapi' && fallbackPattern.test(source)) {
      warnings.push(`${routePath(file)} is proxy_to_fastapi but still references fallback/legacy behavior; verify there is no executable TS fallback before closing the burn-down item`)
    }

    if (
      status === 'proxy_to_fastapi_with_legacy_fallback'
      || status === 'proxy_to_fastapi_with_temporary_fallback'
      || status === 'keep_temporary_fallback'
    ) {
      temporaryFallbacks.push(routePath(file))
      if (hasBackendImport || hasDirectDb) {
        warnings.push(`${routePath(file)} keeps temporary TS fallback logic; removal is P1 after FastAPI Development verification`)
      }
    }

    if ((status === 'migrate_to_fastapi' || temporaryFallbacks.includes(routePath(file))) && lifecycleRoutePattern.test(routePath(file))) {
      warnings.push(`${routePath(file)} is a lifecycle/operation route with non-final backend ownership; treat as P0/P1 burn-down item`)
    }
  }

  return { errors, warnings, temporaryFallbacks }
}

const tsFiles = walk(root, file => isTsFile(file))
const routeFiles = walk(path.join(root, 'app', 'api'), file => file.endsWith(`${path.sep}route.ts`))

const client = checkClientBoundaries(tsFiles)
const routes = checkRouteBoundaries(routeFiles)
const errors = [...client.errors, ...routes.errors]
const warnings = [...client.warnings, ...routes.warnings]

console.log('Import boundary check')
console.log(`TS files scanned: ${tsFiles.length}`)
console.log(`Route files scanned: ${routeFiles.length}`)
console.log(`Temporary fallback routes: ${routes.temporaryFallbacks.length}`)
console.log(`Warnings: ${warnings.length}`)
console.log(`Critical errors: ${errors.length}`)

for (const warning of warnings.slice(0, 80)) console.log(`WARNING ${warning}`)
if (warnings.length > 80) console.log(`WARNING ... ${warnings.length - 80} more warnings omitted`)

for (const error of errors) console.log(`ERROR ${error}`)

if (errors.length > 0 || process.argv.includes('--strict')) {
  process.exitCode = errors.length > 0 ? 1 : 0
}
