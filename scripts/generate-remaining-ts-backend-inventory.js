const fs = require('fs')
const path = require('path')

const root = process.cwd()
const output = path.join(root, 'docs', 'architecture', 'RemainingTsBackendInventory.md')

const scanRoots = [
  'app/api',
  'lib/operations',
  'lib/process',
  'lib/outbox',
  'lib/audit',
  'lib/integrity',
  'lib/setup',
  'lib/read-models',
  'lib/domains',
  'lib/security',
  'lib/action-center',
  'lib/action-guide',
  'lib/field-controls',
]

const skippedDirs = new Set(['.git', '.next', 'node_modules', '.mypy_cache', '.pytest_cache', '.ruff_cache', '__pycache__'])

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && !skippedDirs.has(entry.name)) walk(full, acc)
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

function toPosix(file) {
  return file.split(path.sep).join('/')
}

function rel(file) {
  return toPosix(path.relative(root, file))
}

function source(file) {
  return fs.readFileSync(file, 'utf8')
}

function headerStatus(text) {
  return text.split(/\r?\n/).slice(0, 16).join('\n').match(/BACKEND_MIGRATION_STATUS:\s*([a-z_]+)/)?.[1] || ''
}

function hasFastApiEquivalent(relative) {
  if (/app\/api\/(companies|ownership-transactions|processes|tasks|approvals|audit|action-center|setup|policy|integrity|cron\/outbox-dispatch)/.test(relative)) return 'yes'
  if (/lib\/(operations|process|outbox|audit|integrity|setup|read-models|domains|security)/.test(relative)) return 'yes'
  if (/app\/api\/(accounting|employees|organization|settings|reference|tenants|auth|uploads|media|identity)/.test(relative)) return 'partial/no'
  return 'unknown'
}

function classify(relative, text) {
  const status = headerStatus(text)
  const db = /createServiceClient|createServerClient|supabase\s*\.\s*from\s*\(|\.(insert|update|upsert|delete|rpc)\s*\(/.test(text)
  const orchestrator = /orchestrator|OperationRequestService|OutboxEventService|ProcessEngine|AuditLogService|TransactionBoundary/.test(text)
  const generated = relative.startsWith('lib/generated/')
  const route = relative.startsWith('app/api/')

  if (generated || status === 'generated_do_not_edit') {
    return { role: 'generated OpenAPI/client contract', status: 'keep_generated', canDelete: 'no', proxy: 'no', shared: 'yes', priority: 'P0', action: 'Do not edit manually.' }
  }
  if (/\.types\.ts$|registry\.ts$|permissions\.ts$|constants?\.ts$/.test(relative) || ['contract_shared', 'keep_shared_contract'].includes(status)) {
    return { role: 'shared contract or frontend-readable registry', status: status || 'keep_shared_contract', canDelete: 'no', proxy: 'no', shared: 'yes', priority: 'P2', action: 'Keep type/enum surface only; move runtime DB logic to Python.' }
  }
  if (status === 'proxy_to_fastapi') {
    return { role: 'thin BFF proxy', status, canDelete: 'no', proxy: 'yes', shared: 'no', priority: 'P1', action: 'Keep as compatibility proxy until frontend calls generated client directly.' }
  }
  if (['proxy_to_fastapi_with_legacy_fallback', 'proxy_to_fastapi_with_temporary_fallback'].includes(status)) {
    return { role: 'FastAPI proxy with temporary TS fallback', status, canDelete: 'no', proxy: 'yes', shared: 'no', priority: 'P1', action: 'Remove fallback after FastAPI staging verification and E2E smoke tests.' }
  }
  if (['keep_ui_adapter', 'keep_session_bootstrap', 'keep_upload_adapter', 'keep_bff_proxy'].includes(status)) {
    return { role: 'frontend-adjacent BFF adapter', status, canDelete: 'no', proxy: status.includes('proxy') ? 'yes' : 'no', shared: 'no', priority: 'P2', action: 'Keep adapter thin; do not add ERP domain mutation logic.' }
  }
  if (status === 'deprecated_wrapper') {
    return { role: 'deprecated compatibility wrapper', status, canDelete: 'not yet', proxy: route ? 'should become proxy' : 'no', shared: 'no', priority: 'P1', action: 'Replace with FastAPI proxy or generated client wrapper, then delete.' }
  }
  if (status === 'delete_obsolete') {
    return { role: 'obsolete marked for deletion', status, canDelete: 'yes after import check', proxy: 'no', shared: 'no', priority: 'P1', action: 'Delete after reference check passes.' }
  }
  if (status === 'migrate_to_fastapi' || db || orchestrator) {
    const priority = /official-changes|capital|ownership|operations|process|outbox|audit|integrity|setup|security/.test(relative) ? 'P1' : 'P2'
    return { role: 'TS backend runtime logic', status: status || `migrate_later_${priority.toLowerCase()}`, canDelete: 'not safely', proxy: route ? 'should become proxy' : 'no', shared: 'no', priority, action: 'Do not expand; migrate or verify Python equivalent, then remove.' }
  }
  return { role: route ? 'unclassified Next API route' : 'frontend/shared helper candidate', status: status || 'obsolete_unknown_owner', canDelete: 'review', proxy: route ? 'review' : 'no', shared: 'review', priority: 'P2', action: 'Classify owner before adding behavior.' }
}

const files = [...new Set(scanRoots.flatMap(item => walk(path.join(root, item))))].sort()
const rows = files.map(file => {
  const relative = rel(file)
  const text = source(file)
  return {
    path: relative,
    fastapi: hasFastApiEquivalent(relative),
    ...classify(relative, text),
  }
})

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1
  return acc
}, {})

const lines = [
  '# Remaining TS Backend Inventory',
  '',
  'Generated by `npm run ts-backend:inventory`. It classifies TypeScript backend surfaces after the FastAPI core migration pass. The inventory is conservative: anything with DB mutation, orchestration, policy, audit, outbox, process, readiness, integrity or projection runtime behavior is treated as non-permanent TypeScript backend logic.',
  '',
  '## Summary',
  '',
  `- Files scanned: ${rows.length}`,
  ...Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => `- ${status}: ${count}`),
  '',
  '## Inventory',
  '',
  '| path | current role | migration status comment | FastAPI equivalent exists? | can delete now? | should become proxy? | should remain frontend/shared? | priority | action |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
]

for (const row of rows) {
  lines.push(`| \`${row.path}\` | ${row.role} | \`${row.status}\` | ${row.fastapi} | ${row.canDelete} | ${row.proxy} | ${row.shared} | ${row.priority} | ${row.action} |`)
}

lines.push('', '## Reading Rules', '')
lines.push('- `keep_generated` files are generated or generated-adjacent contracts and must not be edited by hand.')
lines.push('- `proxy_to_fastapi*` routes may remain as BFF compatibility layers, but domain logic must not grow there.')
lines.push('- `migrate_to_fastapi`, `migrate_later_p1` and `deprecated_wrapper` are not permanent homes for backend behavior.')
lines.push('- `obsolete_unknown_owner` must be classified before new behavior is added.')

fs.writeFileSync(output, `${lines.join('\n')}\n`)
console.log(`Wrote ${rel(output)} (${rows.length} files)`)
