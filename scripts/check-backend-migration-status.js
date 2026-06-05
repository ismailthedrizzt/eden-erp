const fs = require('fs')
const path = require('path')

const root = process.cwd()
const statusValues = new Set([
  'keep_frontend',
  'keep_bff_proxy',
  'keep_bff_proxy_with_legacy_fallback',
  'proxy_to_fastapi',
  'proxy_to_fastapi_with_legacy_fallback',
  'proxy_to_fastapi_with_temporary_fallback',
  'keep_ui_adapter',
  'keep_session_bootstrap',
  'keep_upload_adapter',
  'keep_temporary_fallback',
  'migrate_to_fastapi',
  'migrate_to_fastapi_then_proxy',
  'delete_obsolete',
  'deprecated_wrapper',
  'contract_endpoint',
  'contract_shared',
  'keep_shared_contract',
  'keep_generated',
  'generated_do_not_edit',
  'local_reference_fallback',
])

const skippedDirs = new Set([
  '.git',
  '.next',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  'node_modules',
  '__pycache__',
])

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
    else if (predicate(full)) acc.push(full)
  }
  return acc
}

function toPosix(file) {
  return file.split(path.sep).join('/')
}

function routePath(file) {
  const rel = toPosix(path.relative(path.join(root, 'app', 'api'), file))
  const route = rel.replace(/\/route\.ts$/, '')
  return `/api/${route}`.replace(/\/index$/, '')
}

function targetEndpoint(route) {
  const mapped = route
    .replace(/^\/api\/companies\/\[company_id\]/, '/api/v1/companies/{company_id}')
    .replace(/^\/api\/companies\/branches\/\[id\]/, '/api/v1/branches/{branch_id}')
    .replace(/^\/api\/companies\/branches/, '/api/v1/branches')
    .replace(/^\/api\/companies\/partners\/\[id\]/, '/api/v1/partners/{partner_id}')
    .replace(/^\/api\/companies\/partners/, '/api/v1/partners')
    .replace(/^\/api\/companies\/representatives\/\[id\]/, '/api/v1/representatives/{representative_id}')
    .replace(/^\/api\/companies\/representatives/, '/api/v1/representatives')
    .replace(/^\/api\/companies/, '/api/v1/companies')
    .replace(/^\/api\/ownership-transactions/, '/api/v1/ownership-transactions')
    .replace(/^\/api\/processes/, '/api/v1/processes')
    .replace(/^\/api\/tasks/, '/api/v1/tasks')
    .replace(/^\/api\/approvals/, '/api/v1/approvals')
    .replace(/^\/api\/audit/, '/api/v1/audit')
    .replace(/^\/api\/action-center/, '/api/v1/action-center')
    .replace(/^\/api\/ai\/action-guide/, '/api/v1/action-guide')
    .replace(/^\/api\/setup/, '/api/v1/setup')
    .replace(/^\/api\/cron\/outbox-dispatch/, 'python-worker:outbox-dispatch')
  const endpoint = (mapped.startsWith('/api/v1/') || mapped.startsWith('python-worker:'))
    ? mapped
    : mapped.replace(/^\/api\//, '/api/v1/')
  return endpoint.replace(/\[([^\]]+)\]/g, '{$1}')
}

function classify(route, source) {
  const hasDb = /\.(from|rpc)\s*\(/.test(source) || /create(Service|Server)?Client|supabase/.test(source)
  const hasMutation = /\.(insert|update|upsert|delete)\s*\(/.test(source) || /\.rpc\s*\(/.test(source)
  const hasOrchestration = /orchestrator|run[A-Za-z]+Operation|TransactionBoundary|officialChange|wizard\/complete/.test(source)
  const hasPlatformLogic = /process|approval|outbox|audit|policy|permission|readiness|integrity/i.test(source)

  let status = 'migrate_to_fastapi'
  let priority = 'P2'
  let responsibility = 'request/response plus backend data access'

  if (/^\/api\/(auth|uploads|media|identity|session|user\/preferences|onboarding)/.test(route)) {
    status = /^\/api\/uploads/.test(route) ? 'keep_upload_adapter' : 'keep_ui_adapter'
    priority = 'P2'
    responsibility = 'UI/auth/upload adapter'
  }
  if (/^\/api\/ai\/action-guide/.test(route)) {
    status = 'proxy_to_fastapi_with_legacy_fallback'
    priority = 'P2'
    responsibility = 'AI guide UI adapter; backend resolver migrates later'
  }
  if (/^\/api\/(companies|ownership-transactions)/.test(route)) {
    status = 'proxy_to_fastapi_with_legacy_fallback'
    priority = /official-changes|capital|branches|representatives|ownership-transactions/.test(route) ? 'P0' : 'P1'
    responsibility = 'ERP domain route'
  }
  if (/^\/api\/(processes|tasks|approvals|audit|action-center|setup|cron\/outbox-dispatch)/.test(route)) {
    status = 'proxy_to_fastapi_with_legacy_fallback'
    priority = /^\/api\/cron\/outbox-dispatch/.test(route) ? 'P1' : 'P1'
    responsibility = 'platform backend route'
  }
  if (/^\/api\/(accounting|muhasebe|employees|organization)/.test(route)) {
    status = 'migrate_to_fastapi'
    priority = 'P2'
    responsibility = 'domain backend route'
  }
  if (/^\/api\/reference|^\/api\/settings|^\/api\/tenants|^\/api\/dashboard|^\/api\/notifications/.test(route)) {
    status = 'migrate_to_fastapi'
    priority = 'P2'
    responsibility = 'platform/read-model route'
  }

  return {
    status,
    priority,
    responsibility,
    business: hasDb || hasOrchestration || hasPlatformLogic,
    mutation: hasMutation,
    orchestration: hasOrchestration,
    platform: hasPlatformLogic,
  }
}

function readHeader(source) {
  const first = source.split(/\r?\n/).slice(0, 14).join('\n')
  const status = first.match(/BACKEND_MIGRATION_STATUS:\s*([a-z_]+)/)?.[1] || null
  const endpoint = first.match(/TARGET_FASTAPI_ENDPOINT:\s*(.+)$/m)?.[1] || first.match(/TARGET_ENDPOINT:\s*(.+)$/m)?.[1] || null
  return { status, endpoint }
}

function routeBoundaryFlags(source) {
  const backendImport = /@\/lib\/(operations|process|outbox|audit|integrity|setup|domains|read-models|action-center|action-guide|field-controls|modules|user-state|documents\/documentThumbnail|supabase\/server)/.test(source)
  const directDb = /createServiceClient|createServerClient|supabase\s*\.\s*from\s*\(|\.(insert|update|upsert|delete|rpc)\s*\(/.test(source)
  const proxyHelper = /proxyToFastApi|proxyJsonToFastApi|createFastApiProxyHandler|proxyDocumentUpload/.test(source)
  return { backendImport, directDb, proxyHelper }
}

function buildInventory() {
  return walk(path.join(root, 'app', 'api'), file => file.endsWith(`${path.sep}route.ts`))
    .sort()
    .map(file => {
      const source = fs.readFileSync(file, 'utf8')
      const route = routePath(file)
      const inferred = classify(route, source)
      const header = readHeader(source)
      const boundary = routeBoundaryFlags(source)
      return {
        route,
        file: toPosix(path.relative(root, file)),
        currentResponsibility: inferred.responsibility,
        business: inferred.business ? 'yes' : 'no',
        mutation: inferred.mutation ? 'yes' : 'no',
        orchestration: inferred.orchestration ? 'yes' : 'no',
        platform: inferred.platform ? 'yes' : 'no',
        targetStatus: header.status || inferred.status,
        targetEndpoint: header.endpoint || targetEndpoint(route),
        priority: inferred.priority,
        cleanupAction: cleanupAction(header.status || inferred.status),
        hasHeader: !!header.status,
        backendImport: boundary.backendImport,
        directDb: boundary.directDb,
        proxyHelper: boundary.proxyHelper,
      }
    })
}

function cleanupAction(status) {
  switch (status) {
    case 'proxy_to_fastapi':
      return 'keep as thin FastAPI proxy; no TS business logic'
    case 'proxy_to_fastapi_with_legacy_fallback':
      return 'proxy to FastAPI; remove TS fallback after validation'
    case 'proxy_to_fastapi_with_temporary_fallback':
      return 'proxy to FastAPI; remove temporary TS fallback after Development verification'
    case 'keep_temporary_fallback':
      return 'temporary compatibility bridge; removal must be scheduled'
    case 'keep_bff_proxy':
      return 'keep thin proxy; move resolver to FastAPI'
    case 'keep_session_bootstrap':
      return 'keep session/bootstrap adapter; no domain mutation'
    case 'keep_upload_adapter':
      return 'keep upload adapter; no domain mutation'
    case 'keep_ui_adapter':
      return 'keep as UI adapter; no domain mutation'
    case 'migrate_to_fastapi_then_proxy':
      return 'move business logic to FastAPI, then proxy'
    case 'migrate_to_fastapi':
      return 'move business logic to FastAPI'
    case 'deprecated_wrapper':
      return 'replace with canonical route/service and remove'
    case 'delete_obsolete':
      return 'delete after import/reference check'
    default:
      return 'review'
  }
}

function markdownInventory(rows) {
  const lines = [
    '# Next API Route Migration Inventory',
    '',
    'Generated from `app/api/**/route.ts`. The classification is intentionally conservative: any route with database access, mutation, orchestration, policy, audit, process, outbox or setup logic is not considered a permanent Next.js backend route.',
    '',
    '| route path | file path | current responsibility | business logic | direct DB mutation | domain orchestration | process/outbox/audit/policy | target status | target FastAPI endpoint | priority | cleanup action |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const row of rows) {
    lines.push(`| \`${row.route}\` | \`${row.file}\` | ${row.currentResponsibility} | ${row.business} | ${row.mutation} | ${row.orchestration} | ${row.platform} | \`${row.targetStatus}\` | \`${row.targetEndpoint}\` | ${row.priority} | ${row.cleanupAction} |`)
  }
  lines.push('', '## Header Coverage', '')
  const withHeader = rows.filter(row => row.hasHeader).length
  lines.push(`- Route files: ${rows.length}`)
  lines.push(`- Files with explicit migration header: ${withHeader}`)
  lines.push(`- Files without explicit migration header: ${rows.length - withHeader}`)
  lines.push('')
  lines.push('The missing-header count is tracked by `npm run migration:status`. P0 routes should be marked first; broader app/api coverage can follow as routes are converted into FastAPI proxies.')
  return `${lines.join('\n')}\n`
}

function displayStatus(status) {
  if (status === 'proxy_to_fastapi_with_legacy_fallback') return 'proxy_to_fastapi_with_temporary_fallback'
  return status
}

function removalCondition(row) {
  if (row.targetStatus === 'proxy_to_fastapi') return 'Keep until frontend generated client/direct FastAPI strategy replaces BFF route.'
  if (row.targetStatus === 'proxy_to_fastapi_with_legacy_fallback') return 'Remove TS fallback after FastAPI endpoint is verified in Development and frontend E2E/smoke passes.'
  if (row.targetStatus === 'deprecated_wrapper') return 'Delete after canonical route or generated/shared contract has no imports.'
  if (row.targetStatus === 'delete_obsolete') return 'Delete immediately after import/reference check.'
  if (row.targetStatus.startsWith('keep_')) return 'Permanent adapter/shared contract; keep thin and do not add ERP domain mutation.'
  if (row.targetStatus === 'migrate_to_fastapi' || row.targetStatus === 'migrate_to_fastapi_then_proxy') return 'Implement FastAPI equivalent, then convert route to proxy or remove.'
  return 'Classify owner before adding behavior.'
}

function markdownProxyMatrix(rows) {
  const lines = [
    '# Next Proxy Coverage Matrix',
    '',
    'Generated from `app/api/**/route.ts` by `npm run proxy:coverage`. Status values are normalized for the productization gate: existing `proxy_to_fastapi_with_legacy_fallback` route headers are shown as `proxy_to_fastapi_with_temporary_fallback` because the fallback is not a permanent architecture role.',
    '',
    '## Summary',
    '',
  ]
  const counts = rows.reduce((acc, row) => {
    const status = displayStatus(row.targetStatus)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})
  lines.push(`- Route files: ${rows.length}`)
  for (const [status, count] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`- ${status}: ${count}`)
  }
  lines.push(
    '',
    '## Matrix',
    '',
    '| route path | status | target FastAPI endpoint | business logic present? | domain/orchestrator import? | removal condition | priority |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  )
  for (const row of rows) {
    const domainImport = row.backendImport || row.orchestration === 'yes'
    lines.push(`| \`${row.route}\` | \`${displayStatus(row.targetStatus)}\` | \`${row.targetEndpoint}\` | ${row.business} | ${domainImport ? 'yes' : 'no'} | ${removalCondition(row)} | ${row.priority} |`)
  }
  lines.push(
    '',
    '## Gate Rules',
    '',
    '- `proxy_to_fastapi` routes must not import TS backend/domain modules or direct DB code.',
    '- `proxy_to_fastapi_with_temporary_fallback` routes are accepted only as P1 migration debt.',
    '- `keep_ui_adapter`, `keep_session_bootstrap` and `keep_upload_adapter` routes may remain, but must stay frontend-adjacent.',
    '- `migrate_to_fastapi` and `deprecated_wrapper` entries are not productization-ready backend homes.',
  )
  return `${lines.join('\n')}\n`
}

function writeInventory() {
  const rows = buildInventory()
  const target = path.join(root, 'docs', 'architecture', 'NextApiRouteMigrationInventory.md')
  fs.writeFileSync(target, markdownInventory(rows))
  console.log(`Wrote ${toPosix(path.relative(root, target))} (${rows.length} routes)`)
}

function writeProxyMatrix() {
  const rows = buildInventory()
  const target = path.join(root, 'docs', 'architecture', 'NextProxyCoverageMatrix.md')
  fs.writeFileSync(target, markdownProxyMatrix(rows))
  console.log(`Wrote ${toPosix(path.relative(root, target))} (${rows.length} routes)`)
}

function reportStatus() {
  const rows = buildInventory()
  const missing = rows.filter(row => !row.hasHeader)
  const invalid = rows.filter(row => row.targetStatus && !statusValues.has(row.targetStatus))
  const p0Missing = missing.filter(row => row.priority === 'P0')
  const statusCounts = rows.reduce((acc, row) => {
    acc[row.targetStatus] = (acc[row.targetStatus] || 0) + 1
    return acc
  }, {})
  const temporaryFallbacks = rows.filter(row => [
    'proxy_to_fastapi_with_legacy_fallback',
    'proxy_to_fastapi_with_temporary_fallback',
    'keep_temporary_fallback',
  ].includes(row.targetStatus))
  const proxyOnlyViolations = rows.filter(row => row.targetStatus === 'proxy_to_fastapi' && (row.backendImport || row.directDb))
  const proxyWithoutHelper = rows.filter(row => row.targetStatus === 'proxy_to_fastapi' && !row.proxyHelper)
  console.log(`Route files: ${rows.length}`)
  console.log(`Explicit migration headers: ${rows.length - missing.length}`)
  console.log(`Missing migration headers: ${missing.length}`)
  console.log(`P0 missing headers: ${p0Missing.length}`)
  console.log(`Temporary fallback routes: ${temporaryFallbacks.length}`)
  console.log(`Proxy-only boundary violations: ${proxyOnlyViolations.length}`)
  console.log(`Proxy-only routes without proxy helper: ${proxyWithoutHelper.length}`)
  console.log('Status counts:')
  for (const [status, count] of Object.entries(statusCounts).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${status}: ${count}`)
  }
  if (p0Missing.length) {
    for (const row of p0Missing) console.log(`P0_MISSING ${row.file}`)
  }
  if (invalid.length) {
    for (const row of invalid) console.log(`INVALID_STATUS ${row.file}: ${row.targetStatus}`)
  }
  if (proxyOnlyViolations.length) {
    for (const row of proxyOnlyViolations) console.log(`PROXY_ONLY_VIOLATION ${row.file}`)
  }
  if (proxyWithoutHelper.length) {
    for (const row of proxyWithoutHelper) console.log(`PROXY_WITHOUT_HELPER ${row.file}`)
  }
  if (temporaryFallbacks.length) {
    for (const row of temporaryFallbacks.slice(0, 80)) console.log(`TEMP_FALLBACK ${row.file}`)
    if (temporaryFallbacks.length > 80) console.log(`TEMP_FALLBACK ... ${temporaryFallbacks.length - 80} more omitted`)
  }

  const clientFiles = walk(root, file => /\.(tsx|ts)$/.test(file) && !file.includes(`${path.sep}node_modules${path.sep}`))
    .filter(file => {
      const source = fs.readFileSync(file, 'utf8')
      if (!/['"]use client['"]/.test(source)) return false
      return /createServiceClient|SUPABASE_SERVICE_ROLE_KEY|@\/lib\/supabase\/server|supabase\/server|server-only|supabase\s*\.\s*from\s*\(/.test(source)
    })
  console.log(`Client direct backend-risk files: ${clientFiles.length}`)
  for (const file of clientFiles.slice(0, 50)) console.log(`CLIENT_RISK ${toPosix(path.relative(root, file))}`)

  if (invalid.length || p0Missing.length || proxyOnlyViolations.length) {
    process.exitCode = 1
  }
}

const command = process.argv[2] || 'report'
if (command === 'write-inventory') writeInventory()
else if (command === 'write-proxy-matrix') writeProxyMatrix()
else reportStatus()
