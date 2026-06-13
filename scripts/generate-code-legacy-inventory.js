const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = process.cwd()
const ARCHIVE_DIR = 'docs/archive/code-legacy-cleanup-2026-06-13'
const AI_INVENTORY = 'docs/ai-context/code-legacy-inventory.md'
const RAW_INVENTORY = `${ARCHIVE_DIR}/raw-code-legacy-inventory.md`
const CLEANUP_REPORT = `${ARCHIVE_DIR}/cleanup-report.md`
const RISK_REGISTER = `${ARCHIVE_DIR}/risk-register.md`
const CONTRACT_OVERRIDES = '<!-- source-of-truth-standard: contract overrides markdown -->'

const SCAN_ROOTS = ['app', 'components', 'lib', 'backend/app', 'contracts', 'scripts']
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.json', '.md', '.css'])
const APPROVED_SUPABASE_RUNTIME_PREFIXES = [
  'backend/app/core/',
  'backend/app/api/',
  'backend/app/auth/',
  'backend/app/security/',
  'lib/auth/',
  'lib/security/',
  'lib/supabase',
]
const DIRECT_DB_WRITE_ALLOWLIST = new Set([])

function main() {
  const result = analyze()
  writeReports(result)
  printSummary(result)
}

function analyze() {
  const files = listFiles(SCAN_ROOTS).filter(isTextFile)
  const sourceByFile = new Map(files.map((file) => [file, read(file)]))
  const allSource = [...sourceByFile.entries()].map(([file, source]) => `\n// FILE: ${file}\n${source}`).join('\n')

  const releaseRoutes = parseReleaseRegistry(readIfExists('lib/release/routeReleaseRegistry.ts'))
  const pageRegistry = parsePageContractRegistry(readIfExists('contracts/pages/page-contract-registry.ts'))
  const pageFiles = listFiles(['app']).filter((file) => file.endsWith('/page.tsx'))
  const pageRoutes = pageFiles.map((file) => ({ route: routeFromPageFile(file), file, source: read(file) }))
  const apiContracts = parseApiContracts(sourceByFile)

  const routeInventory = buildRouteInventory({ releaseRoutes, pageRegistry, pageRoutes })
  const serviceInventory = buildServiceInventory({ sourceByFile, allSource, apiContracts, pageRegistry })
  const bffInventory = buildBffInventory({ sourceByFile, apiContracts })
  const residueInventory = buildResidueInventory({ sourceByFile })
  const generatedContractInventory = buildGeneratedContractInventory({ pageRegistry, pageRoutes, releaseRoutes })
  const orphanInventory = buildOrphanInventory({ sourceByFile, allSource })
  const p0Findings = buildP0Findings({ routeInventory, serviceInventory, bffInventory, residueInventory, generatedContractInventory })
  const p1Findings = buildP1Findings({ routeInventory, serviceInventory, bffInventory, residueInventory, generatedContractInventory })
  const p2Findings = buildP2Findings({ orphanInventory, serviceInventory, residueInventory })

  const counts = {
    scannedFiles: files.length,
    routes: routeInventory.length,
    services: serviceInventory.length,
    bffRoutes: bffInventory.length,
    residueHits: residueInventory.length,
    generatedContractItems: generatedContractInventory.length,
    orphanCandidates: orphanInventory.length,
    p0: p0Findings.length,
    p1: p1Findings.length,
    p2: p2Findings.length,
    safeDeleteCandidates: countClassification([routeInventory, serviceInventory, bffInventory, residueInventory, generatedContractInventory, orphanInventory], 'safe_delete_candidate'),
    needsManualReview: countClassification([routeInventory, serviceInventory, bffInventory, residueInventory, generatedContractInventory, orphanInventory], 'needs_manual_review'),
    activeRuntimeDependency: countClassification([routeInventory, serviceInventory, bffInventory, residueInventory, generatedContractInventory, orphanInventory], 'active_runtime_dependency'),
  }

  return {
    generatedAt: new Date().toISOString(),
    counts,
    routeInventory,
    serviceInventory,
    bffInventory,
    residueInventory,
    generatedContractInventory,
    orphanInventory,
    apiContracts,
    p0Findings,
    p1Findings,
    p2Findings,
  }
}

function buildRouteInventory({ releaseRoutes, pageRegistry, pageRoutes }) {
  const releaseByRoute = new Map(releaseRoutes.map((entry) => [entry.route, entry]))
  const registryByRoute = new Map(pageRegistry.map((entry) => [entry.route, entry]))
  const pageByRoute = new Map(pageRoutes.map((entry) => [entry.route, entry]))
  const routeSet = new Set([...releaseByRoute.keys(), ...registryByRoute.keys(), ...pageByRoute.keys()])
  return [...routeSet].sort().map((route) => {
    const release = releaseByRoute.get(route) || null
    const registry = registryByRoute.get(route) || null
    const page = pageByRoute.get(route) || null
    const source = page?.source || ''
    const realUi = hasRealUi(source)
    const redirectOnly = isRedirectOnly(source)
    const legacySignal = hasLegacySignal(route, release, registry, source)
    const visible = isReleaseVisible(release)
    let routeClass = 'orphan_route'
    let classification = 'needs_manual_review'
    let decision = 'manual_review'
    let severity = 'P2'

    if (release?.releaseStatus === 'release') routeClass = 'canonical_release'
    else if (release?.releaseStatus && release.releaseStatus.startsWith('development')) routeClass = legacySignal ? 'development_alias' : 'canonical_development'
    else if (release?.releaseStatus === 'hidden' && redirectOnly) routeClass = 'redirect_only'
    else if (release?.releaseStatus === 'hidden' && legacySignal) routeClass = 'hidden_legacy_alias'
    else if (registry?.implementationStatus === 'blocked' && realUi) routeClass = 'blocked_real_ui'
    else if (registry?.pageKind === 'placeholder' || !realUi) routeClass = 'placeholder_only'
    else if (!release && page) routeClass = 'orphan_route'

    if (routeClass === 'canonical_release' || routeClass === 'canonical_development') {
      classification = 'active_runtime_dependency'
      decision = 'retain'
    } else if (routeClass === 'hidden_legacy_alias') {
      classification = 'keep_compatibility_adapter'
      decision = redirectOnly ? 'keep_redirect' : 'keep_hidden_wrapper'
      severity = visible ? 'P0' : 'P2'
    } else if (routeClass === 'redirect_only') {
      classification = 'keep_redirect'
      decision = 'keep_redirect'
    } else if (routeClass === 'blocked_real_ui') {
      classification = visible ? 'needs_contractization' : 'needs_manual_review'
      decision = visible ? 'fix_contract_metadata' : 'manual_review_before_promotion'
      severity = visible ? 'P0' : 'P1'
    } else if (routeClass === 'placeholder_only') {
      classification = visible ? 'needs_contractization' : 'needs_manual_review'
      decision = visible ? 'fix_or_block_release_visibility' : 'keep_development_placeholder'
      severity = visible ? 'P0' : 'P2'
    }

    return {
      kind: 'route',
      route,
      file: page?.file || registry?.sourcePagePath || '<no page file>',
      routeClass,
      classification,
      decision,
      severity,
      releaseStatus: release?.releaseStatus || registry?.releaseStatus || '<missing>',
      showInNavigation: Boolean(release?.showInNavigation),
      showInSearch: Boolean(release?.showInSearch),
      showInCommandPalette: Boolean(release?.showInCommandPalette),
      implementationStatus: registry?.implementationStatus || '<missing>',
      contractSource: registry?.contractSource || '<missing>',
      pageKind: registry?.pageKind || '<missing>',
      evidence: summarizeEvidence([
        release ? `release=${release.releaseStatus}` : 'release registry missing',
        registry ? `implementation=${registry.implementationStatus}` : 'page contract registry missing',
        redirectOnly ? 'redirect-only page' : null,
        realUi ? 'real UI signals present' : 'no real UI signals',
        legacySignal ? 'legacy/deprecated signal' : null,
      ]),
    }
  })
}

function buildServiceInventory({ sourceByFile, allSource, apiContracts, pageRegistry }) {
  const contractFunctions = new Set(apiContracts.map((entry) => entry.serviceFunction).filter(Boolean))
  const apiContractPaths = new Set(apiContracts.flatMap((entry) => [entry.frontendPath, entry.bffPath].filter(Boolean)))
  const contractReadyPageSources = pageRegistry
    .filter((entry) => entry.implementationStatus === 'contract_ready' && entry.sourcePagePath)
    .map((entry) => readIfExists(entry.sourcePagePath))
    .join('\n')

  const serviceFiles = [...sourceByFile.keys()].filter((file) => (file.startsWith('lib/services/') || file.startsWith('lib/api/')) && /\.(ts|tsx|js|jsx)$/.test(file))
  const results = []
  for (const file of serviceFiles) {
    const source = sourceByFile.get(file) || ''
    const exportedFunctions = parseServiceExports(source)
    const apiCalls = parseApiCalls(source)
    const hasSupabase = /supabase|@supabase|createClient\(/i.test(source)
    const hasLegacyFallback = /legacy|fallback|compat/i.test(source)

    if (exportedFunctions.length === 0 && apiCalls.length === 0 && !hasSupabase) continue

    for (const exported of exportedFunctions.length ? exportedFunctions : [{ serviceFunction: path.basename(file).replace(/\.[^.]+$/, ''), serviceObject: null, method: null }]) {
      const directRefs = exported.serviceFunction ? countLiteral(allSource, exported.serviceFunction) - countLiteral(source, exported.serviceFunction) : 0
      const objectRefs = exported.serviceObject ? countLiteral(allSource, exported.serviceObject) - countLiteral(source, exported.serviceObject) : 0
      const usedByContractReadyPage = exported.serviceFunction ? contractReadyPageSources.includes(exported.serviceFunction) || (exported.serviceObject && contractReadyPageSources.includes(exported.serviceObject)) : false
      const covered = exported.serviceFunction ? contractFunctions.has(exported.serviceFunction) : false
      const oldPathCalls = apiCalls.filter((call) => call.path && call.path.startsWith('/api/') && !apiContractPaths.has(normalizeTemplatePath(call.path)) && !isKnownNonContractApiPath(call.path))
      let classification = 'needs_manual_review'
      let severity = 'P2'
      let decision = 'manual_review'
      if (apiCalls.length > 0 && covered) {
        classification = 'active_runtime_dependency'
        decision = 'retain_contract_covered_service'
      } else if (apiCalls.length > 0 && usedByContractReadyPage && !covered) {
        classification = 'needs_contractization'
        severity = 'P0'
        decision = 'add_api_contract_or_stop_using_from_contract_ready_page'
      } else if (apiCalls.length > 0 && !covered) {
        classification = 'needs_contractization'
        severity = 'P1'
        decision = 'contractize_before_promotion'
      } else if (directRefs <= 0 && objectRefs <= 0 && !isPublicIndex(file)) {
        classification = 'safe_delete_candidate'
        decision = 'delete_later_after_reference_scan'
      } else if (hasSupabase || hasLegacyFallback || oldPathCalls.length > 0) {
        classification = 'needs_manual_review'
        severity = oldPathCalls.length > 0 ? 'P1' : 'P2'
      } else {
        classification = 'active_runtime_dependency'
        decision = 'retain_used_service_or_helper'
      }

      results.push({
        kind: 'frontend_service',
        file,
        serviceFunction: exported.serviceFunction,
        classification,
        severity,
        decision,
        apiCalls: apiCalls.map((call) => `${call.method} ${call.path}`).slice(0, 8),
        coveredByApiContract: covered,
        usedByContractReadyPage,
        referenceCountOutsideFile: Math.max(directRefs, objectRefs),
        hasSupabase,
        hasLegacyFallback,
        oldPathCalls: oldPathCalls.map((call) => call.path),
        evidence: summarizeEvidence([
          covered ? 'serviceFunction appears in contracts/api' : 'missing API contract coverage',
          apiCalls.length ? `${apiCalls.length} API call(s)` : null,
          usedByContractReadyPage ? 'used by contract_ready page' : null,
          hasSupabase ? 'Supabase reference' : null,
          oldPathCalls.length ? 'API path not covered by contracts/api' : null,
        ]),
      })
    }
  }
  return dedupeBy(results, (item) => `${item.file}:${item.serviceFunction}`)
}

function buildBffInventory({ sourceByFile, apiContracts }) {
  const contractBffPaths = new Set(apiContracts.map((entry) => entry.bffPath).filter(Boolean))
  const routeFiles = [...sourceByFile.keys()].filter((file) => file.startsWith('app/api/') && file.endsWith('/route.ts'))
  return routeFiles.map((file) => {
    const source = sourceByFile.get(file) || ''
    const routePath = apiRouteFromFile(file)
    const status = headerValue(source, 'BACKEND_MIGRATION_STATUS')
    const canonicalBackend = headerValue(source, 'CANONICAL_BACKEND')
    const target = headerValue(source, 'TARGET_FASTAPI_ENDPOINT')
    const executableSource = stripComments(source)
    const directDbWrite = hasDirectDbWrite(executableSource)
    const directDbRead = hasDirectDbRead(executableSource)
    const lifecycleMutation = /(record_status|employment_status|lifecycle_status|workflow_status|authority_record_status|ownership_status|company_status)/.test(executableSource)
    const legacyFallback = /proxy_to_fastapi_with_legacy_fallback|fallbackTo|legacyFallback\s*\(|runLegacyFallback\s*\(/i.test(executableSource)
    const hasMigrationHeader = Boolean(status || canonicalBackend || target)
    let classification = 'needs_manual_review'
    let severity = 'P2'
    let decision = 'manual_review'
    if (status === 'proxy_to_fastapi' && legacyFallback) {
      severity = 'P0'
      decision = 'remove_or_reclassify_legacy_fallback'
    } else if (directDbWrite && !DIRECT_DB_WRITE_ALLOWLIST.has(file)) {
      classification = 'needs_contractization'
      severity = 'P0'
      decision = 'move_business_write_to_fastapi_or_add_explicit_contract_allowlist'
    } else if (status === 'proxy_to_fastapi') {
      classification = 'active_runtime_dependency'
      decision = 'retain_fastapi_proxy'
    } else if (/keep_session_bootstrap|keep_upload_adapter|keep_ui_adapter|local_only/.test(status || source)) {
      classification = 'keep_compatibility_adapter'
      decision = 'retain_explicit_adapter'
    } else if (!hasMigrationHeader) {
      classification = 'needs_contractization'
      severity = 'P1'
      decision = 'add_migration_header_or_contractize'
    }
    return {
      kind: 'bff_route',
      file,
      routePath,
      classification,
      severity,
      decision,
      migrationStatus: status || '<missing>',
      canonicalBackend: canonicalBackend || '<missing>',
      targetFastApiEndpoint: target || '<missing>',
      coveredByApiContract: contractBffPaths.has(routePath),
      directDbWrite,
      directDbRead,
      lifecycleMutation,
      legacyFallback,
      evidence: summarizeEvidence([
        status ? `migration=${status}` : 'missing migration header',
        target ? `target=${target}` : null,
        directDbWrite ? 'direct DB write signal' : null,
        directDbRead ? 'direct DB read signal' : null,
        legacyFallback ? 'legacy fallback signal' : null,
      ]),
    }
  })
}

function buildResidueInventory({ sourceByFile }) {
  const terms = ['Supabase', 'NEXT_PUBLIC_SUPABASE', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET', '@supabase/supabase-js', '@supabase/ssr', 'Vercel', 'VERCEL_ENV', 'lib/supabase', 'check-supabase-target', 'supabase:migrate']
  const results = []
  for (const [file, source] of sourceByFile.entries()) {
    const hits = terms.filter((term) => source.includes(term))
    if (!hits.length) continue
    let classification = 'needs_manual_review'
    let severity = 'P2'
    let decision = 'manual_review_runtime_residue'
    if (file.startsWith('docs/archive/')) {
      classification = 'archive_only'
      decision = 'historical_doc'
    } else if (file === 'package.json' || file.endsWith('package-lock.json')) {
      classification = 'active_runtime_dependency'
      decision = 'package_dependency_do_not_delete_without_import_audit'
    } else if (APPROVED_SUPABASE_RUNTIME_PREFIXES.some((prefix) => file.startsWith(prefix))) {
      classification = 'active_runtime_dependency'
      decision = 'approved_backend_security_or_auth_layer'
    } else if (file.startsWith('docs/')) {
      classification = 'archive_only'
      decision = 'documentation_reference'
    }
    const isNewUntracked = !isTracked(file)
    if (isNewUntracked && classification === 'needs_manual_review') severity = 'P0'
    results.push({ kind: 'runtime_residue', file, classification, severity, decision, hits, evidence: `${hits.join(', ')} in ${file}` })
  }
  return results
}

function buildGeneratedContractInventory({ pageRegistry, pageRoutes, releaseRoutes }) {
  const pageByRoute = new Map(pageRoutes.map((entry) => [entry.route, entry]))
  const releaseByRoute = new Map(releaseRoutes.map((entry) => [entry.route, entry]))
  return pageRegistry
    .filter((entry) => ['blocked', 'planned', 'contract_ready'].includes(entry.implementationStatus) || /^generated_/.test(entry.contractSource || ''))
    .map((entry) => {
      const page = pageByRoute.get(entry.route)
      const release = releaseByRoute.get(entry.route)
      const source = page?.source || ''
      const realUi = hasRealUi(source)
      let classification = 'needs_manual_review'
      let severity = 'P2'
      let decision = 'manual_review'
      if (entry.contractSource === 'generated_from_existing_page' && entry.implementationStatus === 'contract_ready') {
        classification = 'needs_contractization'
        severity = 'P0'
        decision = 'replace_with_manual_business_contract_or_downgrade_status'
      } else if (entry.releaseStatus === 'release' && entry.implementationStatus === 'blocked') {
        classification = 'needs_contractization'
        severity = 'P0'
        decision = 'fix_release_blocked_metadata'
      } else if (entry.contractSource === 'generated_placeholder' && entry.releaseStatus === 'release') {
        classification = 'needs_contractization'
        severity = 'P0'
        decision = 'replace_placeholder_before_release'
      } else if (entry.implementationStatus === 'blocked' && realUi) {
        classification = 'needs_contractization'
        severity = 'P1'
        decision = 'contractize_real_ui_before_promotion'
      } else if (entry.implementationStatus === 'planned' && realUi) {
        classification = 'needs_manual_review'
        severity = 'P1'
        decision = 'planned_page_has_real_ui_signals'
      }
      return {
        kind: 'generated_contract_debt',
        route: entry.route,
        file: entry.sourcePagePath || '<missing>',
        classification,
        severity,
        decision,
        implementationStatus: entry.implementationStatus,
        contractSource: entry.contractSource,
        releaseStatus: entry.releaseStatus || release?.releaseStatus || '<missing>',
        pageKind: entry.pageKind,
        realUi,
        evidence: summarizeEvidence([`implementation=${entry.implementationStatus}`, `contractSource=${entry.contractSource}`, `release=${entry.releaseStatus || release?.releaseStatus || '<missing>'}`, realUi ? 'real UI signals present' : 'placeholder/minimal page signals']),
      }
    })
}

function buildOrphanInventory({ sourceByFile, allSource }) {
  const candidates = []
  for (const [file, source] of sourceByFile.entries()) {
    if (!/\.(ts|tsx|js|jsx|py)$/.test(file)) continue
    if (file.startsWith('contracts/pages/generated/')) continue
    const base = path.basename(file).replace(/\.[^.]+$/, '')
    if (['index', 'route', 'page', 'layout', 'loading', 'error', 'not-found'].includes(base)) continue
    const outsideRefs = countLiteral(allSource, base) - countLiteral(source, base)
    if (outsideRefs === 0 && /export\s+/.test(source) && !file.startsWith('backend/app/api/')) {
      candidates.push({ kind: 'orphan_code', file, symbol: base, classification: file.startsWith('scripts/') ? 'needs_manual_review' : 'safe_delete_candidate', severity: 'P2', decision: 'delete_later_after_owner_review', referenceCountOutsideFile: outsideRefs, evidence: `exporting file basename '${base}' has zero literal references outside file` })
    }
  }
  return candidates.slice(0, 250)
}

function buildP0Findings({ routeInventory, serviceInventory, bffInventory, residueInventory, generatedContractInventory }) {
  const findings = []
  for (const item of routeInventory) {
    const releaseVisible = item.releaseStatus === 'release' || (item.releaseStatus === 'hidden' && (item.showInNavigation || item.showInSearch || item.showInCommandPalette))
    if (releaseVisible && item.routeClass === 'hidden_legacy_alias') findings.push(finding('P0', 'release-visible legacy alias route', item))
    if (releaseVisible && item.implementationStatus === 'blocked') findings.push(finding('P0', 'release-visible route with implementationStatus blocked', item))
  }
  for (const item of generatedContractInventory) if (item.severity === 'P0') findings.push(finding('P0', item.decision, item))
  for (const item of bffInventory) {
    if (item.directDbWrite && !DIRECT_DB_WRITE_ALLOWLIST.has(item.file)) findings.push(finding('P0', 'BFF route has direct DB write without explicit allowlist', item))
    if (item.migrationStatus === 'proxy_to_fastapi' && item.legacyFallback) findings.push(finding('P0', 'proxy_to_fastapi route contains legacy fallback execution', item))
  }
  for (const item of serviceInventory) if (item.severity === 'P0') findings.push(finding('P0', 'implemented page uses API service missing API contract', item))
  for (const item of residueInventory) if (item.severity === 'P0') findings.push(finding('P0', 'new Supabase/Vercel runtime dependency outside approved layer', item))
  return dedupeBy(findings, (item) => `${item.title}:${item.file || item.route}:${item.evidence}`)
}

function buildP1Findings(groups) {
  return collectFindings(groups, 'P1')
}

function buildP2Findings(groups) {
  return collectFindings(groups, 'P2')
}

function collectFindings(groups, severity) {
  const findings = []
  for (const list of Object.values(groups)) {
    for (const item of list) if (item.severity === severity) findings.push(finding(severity, item.decision || item.classification, item))
  }
  return dedupeBy(findings, (item) => `${item.severity}:${item.title}:${item.file || item.route}:${item.evidence}`).slice(0, 300)
}

function finding(severity, title, item) {
  return { severity, title, route: item.route || item.routePath || '', file: item.file || '', classification: item.classification || '', decision: item.decision || '', evidence: item.evidence || '' }
}

function writeReports(result) {
  ensureDir(path.dirname(AI_INVENTORY))
  ensureDir(ARCHIVE_DIR)
  fs.writeFileSync(AI_INVENTORY, renderAiInventory(result), 'utf8')
  fs.writeFileSync(RAW_INVENTORY, renderRawInventory(result), 'utf8')
  fs.writeFileSync(CLEANUP_REPORT, renderCleanupReport(result), 'utf8')
  fs.writeFileSync(RISK_REGISTER, renderRiskRegister(result), 'utf8')
}

function renderAiInventory(result) {
  const { counts } = result
  return [
    '# Code Legacy Inventory',
    '',
    'Status: controlled cleanup sprint inventory',
    `Generated: ${result.generatedAt}`,
    '',
    'This file is the concise AI-facing inventory for code legacy cleanup. Contracts and guards remain the executable source of truth; Markdown cannot override contracts.',
    '',
    '## Related Contracts',
    '',
    '- `contracts/**`',
    '- `contracts/page-flow-contracts.json`',
    '- `contracts/pages/page-contract-registry.ts`',
    '- `contracts/api/**/*.contract.ts`',
    '- `contracts/lifecycle/**`',
    '',
    '## Related Guards',
    '',
    '- `scripts/generate-code-legacy-inventory.js`',
    '- `scripts/check-code-legacy-inventory.js`',
    '- `scripts/check-contract-standardization.js`',
    '- `scripts/check-backend-contract-drift.js`',
    '- `scripts/check-lifecycle-operation-guard.js`',
    '- `scripts/check-doc-source-of-truth.js`',
    '- `npm run legacy:inventory`',
    '- `npm run legacy:check`',
    '- `npm run validate:contracts`',
    '',
    '## Rules',
    '',
    '- Contract is source of truth; Markdown cannot override executable contracts.',
    '- Legacy code is not removed without inventory, reference scan, risk note, and rollback plan.',
    '- Hidden alias routes are compatibility wrappers unless telemetry/caller audit proves safe removal.',
    '- `generated_from_existing_page` is technical debt until replaced by a manual business contract or explicitly reviewed.',
    '- BFF routes must not own ERP business logic; permanent mutation belongs in FastAPI/domain services.',
    '- Frontend services that call APIs must be covered by API contracts.',
    '- Lifecycle/status mutation must be operation-recorded and pass lifecycle guard.',
    '',
    '## Counts',
    '',
    `- Scanned files: ${counts.scannedFiles}`,
    `- Legacy route inventory items: ${counts.routes}`,
    `- Legacy service inventory items: ${counts.services}`,
    `- BFF/API route inventory items: ${counts.bffRoutes}`,
    `- Supabase/Vercel/old runtime residue hits: ${counts.residueHits}`,
    `- Generated/blocked contract debt items: ${counts.generatedContractItems}`,
    `- Orphan candidates: ${counts.orphanCandidates}`,
    `- P0 legacy issues: ${counts.p0}`,
    `- P1 findings: ${counts.p1}`,
    `- P2 findings: ${counts.p2}`,
    '',
    '## P0 Findings',
    '',
    renderFindingList(result.p0Findings, 'No P0 legacy issues detected.'),
    '',
    '## P1 Summary',
    '',
    renderFindingList(result.p1Findings.slice(0, 25), 'No P1 findings detected.'),
    '',
    '## Retained Intentionally',
    '',
    `- Hidden/compatibility wrappers retained: ${result.routeInventory.filter((item) => ['hidden_legacy_alias', 'redirect_only'].includes(item.routeClass)).length}`,
    `- Active runtime dependencies retained: ${counts.activeRuntimeDependency}`,
    '- No route, BFF route, service, contract, backend domain service, DB migration, auth/security code, hidden alias, or demo/dev route is deleted by this sprint.',
    '',
    '## Detailed Reports',
    '',
    `- Raw inventory: \`${RAW_INVENTORY}\``,
    `- Cleanup report: \`${CLEANUP_REPORT}\``,
    `- Risk register: \`${RISK_REGISTER}\``,
    '',
  ].join('\n')
}

function renderRawInventory(result) {
  return [
    '# Raw Code Legacy Inventory',
    '',
    CONTRACT_OVERRIDES,
    '',
    `Generated: ${result.generatedAt}`,
    '',
    '## Related Contracts',
    '',
    '- `contracts/**`',
    '- `contracts/page-flow-contracts.json`',
    '',
    '## Related Guards',
    '',
    '- `scripts/generate-code-legacy-inventory.js`',
    '- `scripts/check-code-legacy-inventory.js`',
    '',
    '## Counts',
    '',
    codeBlock(JSON.stringify(result.counts, null, 2), 'json'),
    '',
    renderTableSection('Legacy Route Inventory', result.routeInventory),
    renderTableSection('Legacy Service Inventory', result.serviceInventory),
    renderTableSection('Legacy BFF/API Route Inventory', result.bffInventory),
    renderTableSection('Supabase/Vercel/Old Runtime Residue Inventory', result.residueInventory),
    renderTableSection('Generated/Blocked Contract Debt', result.generatedContractInventory),
    renderTableSection('Orphan Code Candidates', result.orphanInventory),
    '',
  ].join('\n')
}

function renderCleanupReport(result) {
  const retained = result.routeInventory.filter((item) => ['hidden_legacy_alias', 'redirect_only'].includes(item.routeClass))
  return [
    '# Code Legacy Cleanup Sprint Report',
    '',
    CONTRACT_OVERRIDES,
    '',
    `Generated: ${result.generatedAt}`,
    '',
    '## Related Contracts',
    '',
    '- `contracts/**`',
    '- `contracts/pages/page-contract-registry.ts`',
    '- `contracts/api/**/*.contract.ts`',
    '',
    '## Related Guards',
    '',
    '- `scripts/generate-code-legacy-inventory.js`',
    '- `scripts/check-code-legacy-inventory.js`',
    '- `npm run legacy:inventory`',
    '- `npm run legacy:check`',
    '- `npm run validate:contracts`',
    '',
    '## 1. Inventory Counts',
    '',
    bulletCounts(result.counts),
    '',
    '## 2. P0 Findings',
    '',
    renderFindingList(result.p0Findings, 'No P0 findings remain.'),
    '',
    '## 3. P1 Findings',
    '',
    renderFindingList(result.p1Findings.slice(0, 50), 'No P1 findings detected.'),
    '',
    '## 4. P2 Findings',
    '',
    renderFindingList(result.p2Findings.slice(0, 50), 'No P2 findings detected.'),
    '',
    '## 5. Safe Cleanup Performed',
    '',
    '- Added legacy inventory generation and P0-only legacy guard scripts.',
    '- Added concise AI context inventory and detailed archive reports.',
    '- Corrected release-visible blocked metadata only where validated as real active pages; no route or service deletion performed.',
    '',
    '## 6. Files Changed',
    '',
    '- `scripts/generate-code-legacy-inventory.js`',
    '- `scripts/check-code-legacy-inventory.js`',
    '- `package.json`',
    '- `docs/ai-context/code-legacy-inventory.md`',
    '- `docs/ai-context/collaboration-guide.md`',
    '- `docs/ai-context/contracts-and-guards.md`',
    '- `docs/archive/code-legacy-cleanup-2026-06-13/**`',
    '- `contracts/pages/page-contract-registry.ts` when release-visible blocked metadata is corrected.',
    '',
    '## 7. Files Intentionally Not Deleted',
    '',
    '- Route files: retained.',
    '- API/BFF route files: retained.',
    '- Service files: retained.',
    '- Generated contracts: retained.',
    '- Backend domain services: retained.',
    '- DB migrations: retained.',
    '- Auth/security code: retained.',
    '- Hidden aliases and demo/dev routes: retained.',
    '',
    '## 8. Legacy Aliases Retained',
    '',
    retained.length ? retained.map((item) => `- ${item.route}: ${item.decision} (${item.evidence})`).join('\n') : '- No hidden alias routes detected.',
    '',
    '## 9. Supabase/Vercel Residue Classification',
    '',
    summarizeResidue(result.residueInventory),
    '',
    '## 10. Generated/Blocked Contract Debt',
    '',
    renderFindingList(result.generatedContractInventory.filter((item) => item.severity !== 'P2').slice(0, 50), 'No P0/P1 generated/blocked contract debt remains.'),
    '',
    '## 11. Commands Run',
    '',
    '- `npm run legacy:inventory`',
    '- `npm run legacy:check`',
    '- `npm run docs:source-check`',
    '- `npm run validate:contracts`',
    '- `npm run build`',
    '- `npm run typecheck`',
    '',
    '## 12. Exact Results',
    '',
    '- Results are filled by final sprint execution output.',
    '',
    '## 13. Remaining Backlog',
    '',
    '- Review P1 findings before promoting development/hidden routes.',
    '- Contractize API-calling services that are used by implemented pages but not yet in `contracts/api`.',
    '- Review Supabase/Vercel runtime residue by approved layer before dependency removal.',
    '',
  ].join('\n')
}

function renderRiskRegister(result) {
  const risks = [...result.p0Findings.map((item) => ({ ...item, risk: 'P0 guard failure' })), ...result.p1Findings.slice(0, 100).map((item) => ({ ...item, risk: 'P1 cleanup backlog' }))]
  return [
    '# Code Legacy Cleanup Risk Register',
    '',
    CONTRACT_OVERRIDES,
    '',
    `Generated: ${result.generatedAt}`,
    '',
    '## Related Contracts',
    '',
    '- `contracts/**`',
    '- `contracts/page-flow-contracts.json`',
    '',
    '## Related Guards',
    '',
    '- `scripts/check-code-legacy-inventory.js`',
    '- `npm run legacy:check`',
    '',
    '| Severity | Risk | File/Route | Classification | Mitigation |',
    '| --- | --- | --- | --- | --- |',
    ...(risks.length ? risks.map((item) => `| ${item.severity} | ${escapeCell(item.title || item.risk)} | ${escapeCell(item.file || item.route || '')} | ${escapeCell(item.classification || '')} | ${escapeCell(item.decision || 'manual review')} |`) : ['| P0 | No P0 legacy issues remain | - | - | Continue enforcing `legacy:check` |']),
    '',
  ].join('\n')
}

function printSummary(result) {
  console.log('Code legacy inventory')
  console.log(`- scanned files: ${result.counts.scannedFiles}`)
  console.log(`- routes: ${result.counts.routes}`)
  console.log(`- services: ${result.counts.services}`)
  console.log(`- bff routes: ${result.counts.bffRoutes}`)
  console.log(`- residue hits: ${result.counts.residueHits}`)
  console.log(`- generated contract items: ${result.counts.generatedContractItems}`)
  console.log(`- orphan candidates: ${result.counts.orphanCandidates}`)
  console.log(`- P0 findings: ${result.counts.p0}`)
  console.log(`- P1 findings: ${result.counts.p1}`)
  console.log(`- P2 findings: ${result.counts.p2}`)
  console.log(`Wrote ${AI_INVENTORY}`)
  console.log(`Wrote ${RAW_INVENTORY}`)
  console.log(`Wrote ${CLEANUP_REPORT}`)
  console.log(`Wrote ${RISK_REGISTER}`)
}

function parseApiContracts(sourceByFile) {
  const contracts = []
  for (const [file, source] of sourceByFile.entries()) {
    if (!file.startsWith('contracts/api/') || !file.endsWith('.ts')) continue
    for (const object of splitObjectLiterals(source)) {
      const serviceFunction = field(object, 'serviceFunction')
      const frontendPath = field(object, 'frontendPath')
      const bffPath = field(object, 'bffPath')
      const fastApiPath = field(object, 'fastApiPath')
      const method = field(object, 'method')
      if (serviceFunction || frontendPath || bffPath || fastApiPath) contracts.push({ file, serviceFunction, frontendPath, bffPath, fastApiPath, method })
    }
  }
  return contracts
}

function parseReleaseRegistry(source) {
  const results = []
  const regex = /route\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*(true|false)\s*,\s*(true|false)\s*,\s*(true|false)([\s\S]*?)\),?/g
  let match
  while ((match = regex.exec(source))) {
    results.push({ route: match[1], moduleKey: match[2], label: match[3], releaseStatus: match[4], showInNavigation: match[5] === 'true', showInSearch: match[6] === 'true', showInCommandPalette: match[7] === 'true', rawOptions: match[8] || '' })
  }
  return results
}

function parsePageContractRegistry(source) {
  const match = source.match(/export const pageContractRegistry = \[([\s\S]*?)\] as const/)
  if (!match) return []
  return splitObjectLiterals(match[1]).filter((part) => part.includes('route:')).map((part) => ({ route: field(part, 'route'), contractId: field(part, 'contractId'), moduleKey: field(part, 'moduleKey'), pageKind: field(part, 'pageKind'), implementationStatus: field(part, 'implementationStatus'), releaseStatus: field(part, 'releaseStatus'), pageContractPath: field(part, 'pageContractPath'), sourcePagePath: field(part, 'sourcePagePath'), contractDepth: field(part, 'contractDepth'), contractSource: field(part, 'contractSource'), businessCriticality: field(part, 'businessCriticality') }))
}

function parseServiceExports(source) {
  const astResults = parseServiceExportsWithTypescript(source)
  if (astResults.length > 0) return dedupeBy(astResults, (item) => item.serviceFunction)

  const results = []
  const objectRegex = /export\s+const\s+(\w+)\s*=\s*\{([\s\S]*?)\n\}/g
  let match
  while ((match = objectRegex.exec(source))) {
    const objectName = match[1]
    const body = match[2]
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g
    let method
    while ((method = methodRegex.exec(body))) {
      if (!['if', 'for', 'while', 'switch', 'catch'].includes(method[1])) results.push({ serviceObject: objectName, method: method[1], serviceFunction: `${objectName}.${method[1]}` })
    }
  }
  const fnRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\(/g
  while ((match = fnRegex.exec(source))) results.push({ serviceObject: null, method: match[1], serviceFunction: match[1] })
  return dedupeBy(results, (item) => item.serviceFunction)
}

function parseServiceExportsWithTypescript(source) {
  let ts
  try {
    ts = require('typescript')
  } catch {
    return []
  }

  const results = []
  const sourceFile = ts.createSourceFile('service.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

  const visit = (node) => {
    if (ts.isVariableStatement(node) && hasExportModifier(ts, node)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) continue
        const objectName = declaration.name.text
        for (const property of declaration.initializer.properties) {
          const method = servicePropertyName(ts, property)
          if (method) results.push({ serviceObject: objectName, method, serviceFunction: `${objectName}.${method}` })
        }
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(ts, node)) {
      results.push({ serviceObject: null, method: node.name.text, serviceFunction: node.name.text })
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return results
}

function hasExportModifier(ts, node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
}

function servicePropertyName(ts, property) {
  if (!ts.isMethodDeclaration(property) && !ts.isPropertyAssignment(property)) return null
  if (ts.isPropertyAssignment(property) && !ts.isArrowFunction(property.initializer) && !ts.isFunctionExpression(property.initializer)) return null
  const name = property.name
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
  return null
}

function parseApiCalls(source) {
  const calls = []
  const regex = /apiClient\.(get|post|patch|delete|put)\s*(?:<[^>]+>)?\s*\(\s*([`'"])([^`'"]+)\2/g
  let match
  while ((match = regex.exec(source))) calls.push({ method: match[1].toUpperCase(), path: match[3] })
  return calls
}

function hasDirectDbWrite(source) {
  return /\.from\([^)]*\)\s*\.(insert|update|upsert|delete)\s*\(/s.test(source) || /\bINSERT\s+INTO\b/i.test(source) || /\bUPDATE\s+[\w".]+\s+SET\b/i.test(source) || /\bDELETE\s+FROM\b/i.test(source) || /\bdb\.(insert|update|delete|execute)\s*\(/i.test(source)
}

function hasDirectDbRead(source) {
  return /\.from\([^)]*\)\s*\.select\s*\(/s.test(source) || /\bSELECT\s+/i.test(source)
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function hasLegacySignal(route, release, registry, source) {
  return /legacy|deprecated|compat|alias/i.test([route, release?.moduleKey, release?.label, release?.rawOptions, registry?.notes, source.slice(0, 500)].filter(Boolean).join(' '))
}

function hasRealUi(source) {
  if (!source) return false
  if (isRedirectOnly(source)) return false
  const signals = [/SmartDataTable|EntityForm|PageBanner|EdenPageShell|EdenListPageShell|DashboardGrid/.test(source), /useState\(|useEffect\(|useMemo\(|useCallback\(/.test(source), /apiClient|Service|service\.|fetch\(/.test(source), /<section|<form|<table|<button|<PageBanner|<SmartDataTable/.test(source)]
  return signals.filter(Boolean).length >= 2
}

function isRedirectOnly(source) {
  if (!source) return false
  return /\bredirect\(|\bpermanentRedirect\(|<Redirect/.test(source) && source.length < 2200 && !/useState\(|SmartDataTable|EntityForm|DashboardGrid/.test(source)
}

function isReleaseVisible(release) {
  if (!release) return false
  if (release.releaseStatus === 'release') return true
  return release.releaseStatus === 'hidden' && (release.showInNavigation || release.showInSearch || release.showInCommandPalette)
}

function isKnownNonContractApiPath(value) {
  return /^\/api\/(auth|health|theme|contracts|modules|reference|release|dev|demo|upload|download|session|notifications)/.test(value)
}

function normalizeTemplatePath(value) {
  return value.replace(/\$\{[^}]+\}/g, '{id}').replace(/\/\[([^\]]+)\]/g, '/{$1}')
}

function headerValue(source, name) {
  const regex = new RegExp(`${name}:\\s*([^\\n]+)`)
  const match = source.match(regex)
  return match ? match[1].trim() : ''
}

function apiRouteFromFile(file) {
  let route = file.replace(/^app\/api/, '/api').replace(/\/route\.ts$/, '')
  route = route.replace(/\/\[\.\.\.([^\]]+)\]/g, '/{$1...}').replace(/\/\[([^\]]+)\]/g, '/{$1}')
  return route || '/api'
}

function routeFromPageFile(file) {
  let route = file.replace(/^app/, '').replace(/\/page\.tsx$/, '')
  route = route.replace(/\/\([^)]*\)/g, '')
  route = route.replace(/\/\[\.\.\.([^\]]+)\]/g, '/[$1...]')
  return route || '/'
}

function splitObjectLiterals(source) {
  const entries = []
  let depth = 0
  let start = -1
  let quote = null
  let escaped = false
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === '\'' || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '{') {
      if (depth === 0) start = index
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        entries.push(source.slice(start, index + 1))
        start = -1
      }
    }
  }
  return entries
}

function field(source, key) {
  const match = source.match(new RegExp(`${key}:\\s*['"]([^'"]+)['"]`))
  return match ? match[1] : ''
}

function listFiles(paths) {
  const output = execFileSync('git', ['ls-files', ...paths], { encoding: 'utf8' }).trim()
  return output ? output.split(/\n/).filter(Boolean).sort() : []
}

function isTracked(file) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', file], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function isTextFile(file) {
  return TEXT_EXTENSIONS.has(path.extname(file))
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

function readIfExists(file) {
  const full = path.join(ROOT, file)
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : ''
}

function ensureDir(dir) {
  fs.mkdirSync(path.join(ROOT, dir), { recursive: true })
}

function countLiteral(source, needle) {
  if (!needle) return 0
  return source.split(needle).length - 1
}

function isPublicIndex(file) {
  return /\/index\.(ts|tsx|js|jsx)$/.test(file)
}

function dedupeBy(items, keyFn) {
  const map = new Map()
  for (const item of items) if (!map.has(keyFn(item))) map.set(keyFn(item), item)
  return [...map.values()]
}

function countClassification(groups, classification) {
  return groups.flat().filter((item) => item.classification === classification).length
}

function summarizeEvidence(parts) {
  return parts.filter(Boolean).join('; ')
}

function renderFindingList(findings, emptyText) {
  if (!findings.length) return `- ${emptyText}`
  return findings.map((item) => `- ${item.severity}: ${item.title || item.decision || item.classification || item.kind} (${item.file || item.route || 'n/a'}) - ${item.evidence}`).join('\n')
}

function renderTableSection(title, rows) {
  const limited = rows.slice(0, 300)
  return [`## ${title}`, '', `Total: ${rows.length}`, '', '| Severity | Classification | File/Route | Decision | Evidence |', '| --- | --- | --- | --- | --- |', ...(limited.length ? limited.map((item) => `| ${escapeCell(item.severity || '')} | ${escapeCell(item.classification || '')} | ${escapeCell(item.file || item.route || item.routePath || '')} | ${escapeCell(item.decision || '')} | ${escapeCell(item.evidence || '')} |`) : ['| - | - | - | - | - |']), rows.length > limited.length ? `\n_Only first ${limited.length} rows shown._` : '', ''].join('\n')
}

function summarizeResidue(rows) {
  const byClassification = rows.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1
    return acc
  }, {})
  return Object.entries(byClassification).map(([key, value]) => `- ${key}: ${value}`).join('\n') || '- No residue hits.'
}

function bulletCounts(counts) {
  return Object.entries(counts).map(([key, value]) => `- ${key}: ${value}`).join('\n')
}

function codeBlock(value, language = '') {
  return '```' + language + '\n' + value + '\n```'
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

module.exports = { analyze, writeReports }

if (require.main === module) main()
