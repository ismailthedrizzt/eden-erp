const fs = require('fs')
const path = require('path')

const root = process.cwd()
const statusValues = new Set([
  'keep_frontend',
  'keep_bff_proxy',
  'keep_bff_proxy_with_legacy_fallback',
  'keep_ui_adapter',
  'migrate_to_fastapi',
  'migrate_to_fastapi_then_proxy',
  'delete_obsolete',
  'deprecated_wrapper',
  'contract_shared',
  'generated_do_not_edit',
])

function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, predicate, acc)
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
    status = 'keep_ui_adapter'
    priority = 'P2'
    responsibility = 'UI/auth/upload adapter'
  }
  if (/^\/api\/ai\/action-guide/.test(route)) {
    status = 'keep_bff_proxy'
    priority = 'P2'
    responsibility = 'AI guide UI adapter; backend resolver migrates later'
  }
  if (/^\/api\/(companies|ownership-transactions)/.test(route)) {
    status = 'migrate_to_fastapi_then_proxy'
    priority = /official-changes|capital|branches|representatives|ownership-transactions/.test(route) ? 'P0' : 'P1'
    responsibility = 'ERP domain route'
  }
  if (/^\/api\/(processes|tasks|approvals|audit|action-center|setup|cron\/outbox-dispatch)/.test(route)) {
    status = 'migrate_to_fastapi'
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
  const first = source.split(/\r?\n/).slice(0, 8).join('\n')
  const status = first.match(/BACKEND_MIGRATION_STATUS:\s*([a-z_]+)/)?.[1] || null
  const endpoint = first.match(/TARGET_FASTAPI_ENDPOINT:\s*(.+)$/m)?.[1] || first.match(/TARGET_ENDPOINT:\s*(.+)$/m)?.[1] || null
  return { status, endpoint }
}

function buildInventory() {
  return walk(path.join(root, 'app', 'api'), file => file.endsWith(`${path.sep}route.ts`))
    .sort()
    .map(file => {
      const source = fs.readFileSync(file, 'utf8')
      const route = routePath(file)
      const inferred = classify(route, source)
      const header = readHeader(source)
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
      }
    })
}

function cleanupAction(status) {
  switch (status) {
    case 'keep_bff_proxy':
      return 'keep thin proxy; move resolver to FastAPI'
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

function writeInventory() {
  const rows = buildInventory()
  const target = path.join(root, 'docs', 'architecture', 'NextApiRouteMigrationInventory.md')
  fs.writeFileSync(target, markdownInventory(rows))
  console.log(`Wrote ${toPosix(path.relative(root, target))} (${rows.length} routes)`)
}

function reportStatus() {
  const rows = buildInventory()
  const missing = rows.filter(row => !row.hasHeader)
  const invalid = rows.filter(row => row.targetStatus && !statusValues.has(row.targetStatus))
  const p0Missing = missing.filter(row => row.priority === 'P0')
  console.log(`Route files: ${rows.length}`)
  console.log(`Explicit migration headers: ${rows.length - missing.length}`)
  console.log(`Missing migration headers: ${missing.length}`)
  console.log(`P0 missing headers: ${p0Missing.length}`)
  if (p0Missing.length) {
    for (const row of p0Missing) console.log(`P0_MISSING ${row.file}`)
  }
  if (invalid.length) {
    for (const row of invalid) console.log(`INVALID_STATUS ${row.file}: ${row.targetStatus}`)
  }

  const clientFiles = walk(root, file => /\.(tsx|ts)$/.test(file) && !file.includes(`${path.sep}node_modules${path.sep}`))
    .filter(file => {
      const source = fs.readFileSync(file, 'utf8')
      if (!/['"]use client['"]/.test(source)) return false
      return /createServiceClient|SUPABASE_SERVICE_ROLE_KEY|@\/lib\/supabase\/server|supabase\/server|server-only|supabase\s*\.\s*from\s*\(/.test(source)
    })
  console.log(`Client direct backend-risk files: ${clientFiles.length}`)
  for (const file of clientFiles.slice(0, 50)) console.log(`CLIENT_RISK ${toPosix(path.relative(root, file))}`)
}

const command = process.argv[2] || 'report'
if (command === 'write-inventory') writeInventory()
else reportStatus()
