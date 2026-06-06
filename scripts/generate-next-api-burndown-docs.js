const fs = require('fs')
const path = require('path')

const root = process.cwd()
const date = '2026-06-06'
const apiRoot = path.join(root, 'app', 'api')
const openApiPath = path.join(root, 'backend', 'openapi.json')

const skippedDirs = new Set(['.git', '.next', 'node_modules', '__pycache__'])

const statusValues = [
  'proxy_to_fastapi',
  'keep_session_bootstrap',
  'keep_upload_adapter',
  'keep_ui_adapter',
  'migrate_to_fastapi',
  'proxy_to_fastapi_with_temporary_fallback',
  'deprecated_wrapper',
  'delete_obsolete',
]

function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) walk(full, predicate, acc)
    } else if (predicate(full)) {
      acc.push(full)
    }
  }
  return acc
}

function posix(value) {
  return value.split(path.sep).join('/')
}

function rel(file) {
  return posix(path.relative(root, file))
}

function routePath(file) {
  const route = posix(path.relative(apiRoot, file)).replace(/\/route\.ts$/, '')
  return `/api/${route}`.replace(/\/index$/, '')
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function readOpenApiPaths() {
  if (!fs.existsSync(openApiPath)) return new Set()
  try {
    const parsed = JSON.parse(read(openApiPath))
    return new Set(Object.keys(parsed.paths || {}))
  } catch {
    return new Set()
  }
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
    .replace(/^\/api\/accounting/, '/api/v1/accounting')
    .replace(/^\/api\/documents/, '/api/v1/documents')
    .replace(/^\/api\/media\/open/, '/api/v1/documents/media/open')
    .replace(/^\/api\/employees/, '/api/v1/employees')
    .replace(/^\/api\/hr/, '/api/v1/hr')
    .replace(/^\/api\/crm/, '/api/v1/crm')
    .replace(/^\/api\/portal/, '/api/v1/portal')
    .replace(/^\/api\/security/, '/api/v1/security')
    .replace(/^\/api\/reporting/, '/api/v1/reporting')
    .replace(/^\/api\/automation/, '/api/v1/automation')
    .replace(/^\/api\/integrations/, '/api/v1/integrations')
    .replace(/^\/api\/cron\/outbox-dispatch/, 'python-worker:outbox-dispatch')
  const endpoint = mapped.startsWith('/api/v1/') || mapped.startsWith('python-worker:')
    ? mapped
    : mapped.replace(/^\/api\//, '/api/v1/')
  return endpoint.replace(/\[([^\]]+)\]/g, '{$1}')
}

function header(source) {
  const first = source.split(/\r?\n/).slice(0, 18).join('\n')
  return {
    status: first.match(/BACKEND_MIGRATION_STATUS:\s*([a-z_]+)/)?.[1] || null,
    canonical: first.match(/CANONICAL_BACKEND:\s*(.+)$/m)?.[1] || null,
    target: first.match(/TARGET_FASTAPI_ENDPOINT:\s*(.+)$/m)?.[1] || null,
    notes: first.match(/NOTES:\s*(.+)$/m)?.[1] || null,
  }
}

function inferDesired(route, source) {
  if (route.startsWith('/api/session') || route.startsWith('/api/auth')) return 'keep_session_bootstrap'
  if (route.startsWith('/api/uploads') || route.includes('/upload')) return 'keep_upload_adapter'
  if (route.startsWith('/api/media') || route.startsWith('/api/identity') || route.startsWith('/api/onboarding')) return 'keep_ui_adapter'
  if (/proxyToFastApi|proxyJsonToFastApi|createFastApiProxyHandler|proxyDocumentUpload/.test(source)) {
    if (/fallback|legacy|temporary|from ['"]@\/lib\/(operations|process|outbox|audit|integrity|setup|domains|read-models|action-center|field-controls)/.test(source)) {
      return 'proxy_to_fastapi_with_temporary_fallback'
    }
    return 'proxy_to_fastapi'
  }
  return 'migrate_to_fastapi'
}

function priority(route, row) {
  if (/\/official-changes|\/opening-wizard|\/liquidation-wizard|\/deregistration-wizard|\/capital-|\/branches/.test(route)) return 'P0'
  if (/ownership|partners|representatives|documents|media|audit|admin|security|portal|export/.test(route)) return 'P0'
  if (row.fallbackReference && row.desiredStatus === 'proxy_to_fastapi') return 'P1'
  if (row.desiredStatus.includes('temporary_fallback') || row.desiredStatus === 'migrate_to_fastapi') return 'P1'
  if (!row.hasHeader) return 'P1'
  return 'P2'
}

function family(route) {
  if (route.startsWith('/api/auth') || route.startsWith('/api/session')) return 'auth/session'
  if (route.startsWith('/api/companies')) return 'company/lifecycle'
  if (route.startsWith('/api/ownership') || route.includes('/partners')) return 'ownership/partners'
  if (route.includes('/representatives')) return 'representatives'
  if (route.includes('/branches')) return 'branches'
  if (route.startsWith('/api/documents') || route.startsWith('/api/media') || route.startsWith('/api/uploads')) return 'documents/media'
  if (route.startsWith('/api/accounting') || route.startsWith('/api/muhasebe')) return 'accounting'
  if (route.startsWith('/api/admin') || route.startsWith('/api/security') || route.startsWith('/api/audit') || route.startsWith('/api/export')) return 'admin/security/audit/export'
  if (route.startsWith('/api/portal')) return 'portal'
  if (route.startsWith('/api/crm') || route.startsWith('/api/projects') || route.startsWith('/api/after-sales')) return 'crm/project/after-sales'
  if (route.startsWith('/api/hr') || route.startsWith('/api/employees')) return 'hr'
  return 'platform/other'
}

function action(row) {
  if (row.fallbackReference && row.desiredStatus === 'proxy_to_fastapi') return 'Verify fallback reference is non-executable; remove or reclassify after smoke.'
  if (row.desiredStatus === 'proxy_to_fastapi') return 'Keep as thin BFF proxy; remove any new fallback attempt.'
  if (row.desiredStatus === 'proxy_to_fastapi_with_temporary_fallback') return 'Smoke FastAPI endpoint, then remove TS fallback and mark proxy_to_fastapi.'
  if (row.desiredStatus === 'migrate_to_fastapi') return 'Create FastAPI endpoint/schema/tests, then convert Next route to proxy.'
  if (row.desiredStatus.startsWith('keep_')) return 'Keep only as bounded adapter; no ERP domain mutation.'
  if (row.desiredStatus === 'deprecated_wrapper') return 'Remove after caller/reference check.'
  if (row.desiredStatus === 'delete_obsolete') return 'Delete after import/reference check.'
  return 'Review and classify.'
}

function inventory() {
  const openApiPaths = readOpenApiPaths()
  return walk(apiRoot, file => file.endsWith(`${path.sep}route.ts`))
    .sort()
    .map(file => {
      const source = read(file)
      const route = routePath(file)
      const h = header(source)
      const target = h.target || targetEndpoint(route)
      const row = {
        route,
        file: rel(file),
        hasHeader: !!h.status,
        headerStatus: h.status || '',
        canonicalBackend: h.canonical || (target.startsWith('/api/v1/') ? 'FastAPI' : ''),
        target,
        createFastApiProxyHandler: /createFastApiProxyHandler/.test(source),
        proxyToFastApi: /proxyToFastApi|proxyJsonToFastApi|proxyDocumentUpload/.test(source),
        supabaseClient: /@supabase|@\/lib\/supabase|createServerClient|supabase\.auth|supabase\.storage/.test(source),
        directDb: /createServiceClient|createServerClient|supabase\s*\.\s*from\s*\(|\.(insert|update|upsert|delete|rpc)\s*\(/.test(source),
        domainServiceImport: /@\/lib\/(operations|process|outbox|audit|integrity|setup|domains|read-models|action-center|field-controls|modules|services|workflow)/.test(source),
        mutatingMethod: /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(source),
        unsafeMethodGuard: /assertUnsafeMethodAllowed|requireUnsafeMethod|validateUnsafe|methodGuard/.test(source),
        authBehavior: /getAppSession|requireAppSession|eden_app_session|withAppSession/.test(source) ? 'app_session' : (/proxy/.test(source) ? 'trusted_proxy_context' : 'route_local_or_unknown'),
        fallbackReference: /fallback|legacy|temporary|LOCAL_REFERENCE_FALLBACK|localReferenceFallback/i.test(source),
      }
      row.desiredStatus = normalizeStatus(h.status || inferDesired(route, source))
      row.currentStatus = h.status ? normalizeStatus(h.status) : 'missing_header'
      if (row.currentStatus === 'proxy_to_fastapi' && row.fallbackReference) {
        row.currentStatus = 'proxy_to_fastapi_with_fallback_reference'
      }
      row.fastApiExists = openApiPaths.has(target) ? 'yes' : (target.startsWith('python-worker:') ? 'worker' : 'unknown_or_missing')
      row.businessLogic = row.domainServiceImport || row.directDb || /policy|permission|audit|outbox|workflow|process|operation|wizard|lifecycle/i.test(source)
      row.dbMutation = row.directDb && row.mutatingMethod
      row.family = family(route)
      row.priority = priority(route, row)
      row.recommendedAction = action(row)
      return row
    })
}

function normalizeStatus(status) {
  if (status === 'proxy_to_fastapi_with_legacy_fallback' || status === 'keep_temporary_fallback') {
    return 'proxy_to_fastapi_with_temporary_fallback'
  }
  if (status === 'keep_bff_proxy' || status === 'keep_frontend') return 'keep_ui_adapter'
  if (status === 'migrate_to_fastapi_then_proxy') return 'migrate_to_fastapi'
  if (status === 'contract_shared' || status === 'keep_shared_contract' || status === 'keep_generated' || status === 'generated_do_not_edit') return 'keep_ui_adapter'
  return statusValues.includes(status) ? status : 'migrate_to_fastapi'
}

function table(rows, columns) {
  const lines = []
  lines.push(`| ${columns.map(c => c.title).join(' | ')} |`)
  lines.push(`| ${columns.map(() => '---').join(' | ')} |`)
  for (const row of rows) {
    lines.push(`| ${columns.map(c => cell(c.value(row))).join(' | ')} |`)
  }
  return lines.join('\n')
}

function cell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '/')
  if (text.startsWith('/api') || text.startsWith('app/') || text.startsWith('python-worker:')) return `\`${text}\``
  return text
}

function counts(rows, key) {
  const result = new Map()
  for (const row of rows) result.set(row[key], (result.get(row[key]) || 0) + 1)
  return [...result.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)))
}

function writeDoc(relative, content) {
  const target = path.join(root, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, `${content.trim()}\n`)
  console.log(`Wrote ${relative}`)
}

function generate() {
  const rows = inventory()
  const p0p1 = rows.filter(row => row.priority !== 'P2')
  const businessRows = rows.filter(row => row.businessLogic || row.dbMutation || row.domainServiceImport || row.mutatingMethod)
  const gapRows = rows.filter(row => row.desiredStatus === 'migrate_to_fastapi' || row.fastApiExists === 'unknown_or_missing')
  const temporaryRows = rows.filter(row => row.desiredStatus === 'proxy_to_fastapi_with_temporary_fallback' || row.fallbackReference)
  const proxyRows = rows.filter(row => row.desiredStatus === 'proxy_to_fastapi')
  const p0Rows = rows.filter(row => row.priority === 'P0')

  const matrixColumns = [
    { title: 'route path', value: r => r.route },
    { title: 'file path', value: r => r.file },
    { title: 'current status', value: r => r.currentStatus },
    { title: 'desired status', value: r => r.desiredStatus },
    { title: 'FastAPI target', value: r => r.target },
    { title: 'business logic present?', value: r => r.businessLogic ? 'yes' : 'no' },
    { title: 'DB mutation present?', value: r => r.dbMutation ? 'yes' : 'no' },
    { title: 'auth/tenant/scope behavior', value: r => r.authBehavior },
    { title: 'priority', value: r => r.priority },
    { title: 'recommended action', value: r => r.recommendedAction },
  ]

  writeDoc('docs/audit/NextApiRouteClassificationMatrix.md', `
# Next API Route Classification Matrix

Date: ${date}

## Summary

- Route files scanned: ${rows.length}
- P0 routes: ${rows.filter(r => r.priority === 'P0').length}
- P1 routes: ${rows.filter(r => r.priority === 'P1').length}
- P2 routes: ${rows.filter(r => r.priority === 'P2').length}
- Explicit migration headers: ${rows.filter(r => r.hasHeader).length}
- Missing migration headers: ${rows.filter(r => !r.hasHeader).length}

## Status Counts

${counts(rows, 'desiredStatus').map(([key, count]) => `- ${key}: ${count}`).join('\n')}

## Matrix

${table(rows, matrixColumns)}
`)

  writeDoc('docs/audit/NextApiBusinessLogicInventory.md', `
# Next API Business Logic Inventory

Date: ${date}

## Purpose

Inventory routes where Next.js still appears to own business, platform, mutation, lifecycle, audit, policy, process, outbox or backend helper behavior.

## Inventory

${table(businessRows, matrixColumns)}
`)

  writeDoc('docs/audit/FastApiCoverageGapReport.md', `
# FastAPI Coverage Gap Report

Date: ${date}

## Purpose

Routes listed here either need migration to FastAPI or do not have a confirmed OpenAPI target in the current backend schema.

## Coverage Gaps

${table(gapRows, [
    { title: 'route', value: r => r.route },
    { title: 'current behavior', value: r => r.currentStatus },
    { title: 'business operation', value: r => r.family },
    { title: 'required FastAPI endpoint', value: r => r.target },
    { title: 'required schemas', value: r => `${r.family} request/response schema` },
    { title: 'required permissions', value: r => 'FastAPI tenant/scope permission context' },
    { title: 'required tests', value: r => 'backend endpoint test plus BFF proxy smoke' },
    { title: 'priority', value: r => r.priority },
    { title: 'blocking release?', value: r => r.priority === 'P0' ? 'yes until accepted/mitigated' : 'no, cleanup debt' },
  ])}
`)

  writeDoc('docs/audit/NextApiP0P1P2RiskRegister.md', `
# Next API P0/P1/P2 Risk Register

Date: ${date}

## P0/P1 Inventory

${table(p0p1, [
    { title: 'priority', value: r => r.priority },
    { title: 'route path', value: r => r.route },
    { title: 'file path', value: r => r.file },
    { title: 'current status', value: r => r.currentStatus },
    { title: 'desired status', value: r => r.desiredStatus },
    { title: 'risk', value: r => riskText(r) },
    { title: 'recommended action', value: r => r.recommendedAction },
  ])}

## Release Impact

P0 routes are not automatically changed in this phase. They must be smoke-tested before fallback removal because lifecycle, document/media, admin/security and portal routes can affect user data or scope boundaries.
`)

  writeDoc('docs/audit/NextApiFallbackBurndownReport.md', `
# Next API Fallback Burn-down Report

Date: ${date}
Branch: main
Working environment: remote server, local PostgreSQL/local DB

## Purpose

Freeze the current Next API fallback state and start the burn-down plan that enforces FastAPI as the canonical backend.

## Current Baseline

- Next API route files: ${rows.length}
- Proxy-only candidates: ${proxyRows.length}
- Temporary fallback or fallback-reference routes: ${temporaryRows.length}
- Migrate-to-FastAPI routes/gaps: ${gapRows.length}
- P0 routes: ${p0Rows.length}
- Direct DB/Supabase app/api access: tracked by \`npm run backend:boundary:audit\`; current guard should remain zero.

## Burn-down Order

1. Company lifecycle operation routes.
2. Ownership / partner operations.
3. Representative authority operations.
4. Branch lifecycle operations.
5. Document/media/download routes.
6. Accounting risky mutations.
7. Admin/security/audit/export.
8. Portal external routes.
9. CRM/project/after-sales MVP routes.
10. Legacy aliases such as \`/api/muhasebe/**\`.

## Low-risk Conversion Decision

No critical lifecycle fallback was removed in this phase. The audit found enough P0/P1 surface that fallback removal should happen route-family by route-family with FastAPI smoke coverage.

## Temporary Fallback / Fallback Reference Sample

${table(temporaryRows.slice(0, 80), matrixColumns)}

## Next Action

Pick one route family from the burn-down order, confirm FastAPI endpoint coverage and response contract, then convert those routes to \`proxy_to_fastapi\` only.
`)

  writeDoc('docs/architecture/FastApiEndpointCoverageMatrix.md', `
# FastAPI Endpoint Coverage Matrix

Date: ${date}

## Purpose

Map Next API routes to intended FastAPI targets and the current OpenAPI coverage signal.

${table(rows, [
    { title: 'Next route', value: r => r.route },
    { title: 'FastAPI target', value: r => r.target },
    { title: 'OpenAPI coverage', value: r => r.fastApiExists },
    { title: 'desired status', value: r => r.desiredStatus },
    { title: 'priority', value: r => r.priority },
    { title: 'next action', value: r => r.recommendedAction },
  ])}
`)

  writeDoc('docs/architecture/NextBffRoutePolicy.md', `
# Next BFF Route Policy

Date: ${date}

## Purpose

Define what a Next.js API route may own in the remote server + local DB architecture.

## Allowed Route Classes

1. \`proxy_to_fastapi\`: thin FastAPI proxy only.
2. \`keep_session_bootstrap\`: login, OTP, setup intent and session cookie bootstrap.
3. \`keep_upload_adapter\`: browser upload/form-data adapter; storage/domain write remains FastAPI.
4. \`keep_ui_adapter\`: UI convenience adapter with no ERP domain mutation.
5. \`deprecated_wrapper\`: old wrapper awaiting caller cleanup.

## Not Permanent

- \`migrate_to_fastapi\`
- \`proxy_to_fastapi_with_temporary_fallback\`
- \`delete_obsolete\`

## Hard Rules

- Next API routes must not own ERP business mutation.
- Next API routes must not own lifecycle operation orchestration.
- Next API routes must not own permission, scope, audit, outbox or DB transaction boundaries.
- Operation-controlled fields cannot be changed through a Next fallback.
- New \`app/api/**/route.ts\` files must carry migration headers.
- New business behavior must be implemented in FastAPI first, then exposed through a proxy route if a BFF endpoint is needed.
`)
}

function riskText(row) {
  if (row.priority === 'P0' && row.family === 'documents/media') return 'Document/media scope or download access can bypass tenant/entity controls.'
  if (row.priority === 'P0' && row.family === 'company/lifecycle') return 'Lifecycle fallback can diverge from FastAPI policy/audit/transaction behavior.'
  if (row.priority === 'P0' && row.family === 'admin/security/audit/export') return 'Admin/security/audit/export route can bypass permission or scope checks.'
  if (row.priority === 'P0' && row.family === 'portal') return 'External portal route can bypass customer/product/document scope.'
  if (row.fallbackReference && row.desiredStatus === 'proxy_to_fastapi') return 'Proxy route still references fallback/legacy behavior; verify it is not executable TS fallback.'
  if (row.desiredStatus === 'proxy_to_fastapi_with_temporary_fallback') return 'Temporary TS fallback remains and must be burned down after FastAPI smoke.'
  if (row.desiredStatus === 'migrate_to_fastapi') return 'Next still appears to be the backend home for this route.'
  return 'Classification/header cleanup risk.'
}

generate()
