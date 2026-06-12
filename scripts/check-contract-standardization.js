const fs = require('fs')
const path = require('path')

const root = process.cwd()
const errors = []
const warnings = []

const requiredCoreFiles = [
  'contracts/core/entity.contract.ts',
  'contracts/core/page.contract.ts',
  'contracts/core/list.contract.ts',
  'contracts/core/form.contract.ts',
  'contracts/core/wizard.contract.ts',
  'contracts/core/api.contract.ts',
  'contracts/core/lifecycle.contract.ts',
  'contracts/core/release.contract.ts',
  'contracts/core/field.contract.ts',
  'contracts/core/validation.contract.ts',
  'contracts/pages/page-contract-registry.ts',
  'contracts/release/page-release-registry.contract.ts',
  'contracts/tests/contract-test-utils.ts',
  'contracts/allowlists/contract-exceptions.ts',
]

for (const file of requiredCoreFiles) {
  if (!exists(file)) errors.push(`Missing required contract file: ${file}`)
}

const releaseRoutes = parseReleaseRoutes(read('lib/release/routeReleaseRegistry.ts'))
const pageRoutes = walk(path.join(root, 'app'))
  .filter((file) => file.endsWith(`${path.sep}page.tsx`))
  .map((file) => ({ route: pageRoute(file), sourcePagePath: relative(file), source: fs.readFileSync(file, 'utf8') }))

const topLevelPortal = path.join(root, 'portal')
if (fs.existsSync(topLevelPortal)) {
  pageRoutes.push(
    ...walk(topLevelPortal)
      .filter((file) => file.endsWith(`${path.sep}page.tsx`))
      .map((file) => ({ route: pageRoute(file), sourcePagePath: relative(file), source: fs.readFileSync(file, 'utf8') }))
  )
}

const registry = parsePageContractRegistry(read('contracts/pages/page-contract-registry.ts'))
const registryByRoute = new Map(registry.map((entry) => [entry.route, entry]))
const releaseByRoute = new Map(releaseRoutes.map((entry) => [entry.route, entry]))
const pageByRoute = new Map(pageRoutes.map((entry) => [entry.route, entry]))
const routeUnion = new Set([...releaseByRoute.keys(), ...pageByRoute.keys()])

for (const route of routeUnion) {
  if (!registryByRoute.has(route)) errors.push(`Missing page contract registry item for route: ${route}`)
}

for (const entry of registry) {
  validateRegistryEntry(entry)
}

validateExceptions()
validateForbiddenPatterns()

const matrix = {
  totalPageRoutes: pageRoutes.length,
  totalReleaseRegistryRoutes: releaseRoutes.length,
  pageContractsFound: registry.length,
  missingPageContracts: Array.from(routeUnion).filter((route) => !registryByRoute.has(route)).length,
  implementedPagesWithoutListFormWizardContracts: registry.filter((entry) => {
    const page = pageByRoute.get(entry.route)
    if (!page) return false
    const signals = inferSignals(page.source)
    return (signals.hasList && !entry.listContractPath)
      || (signals.hasForm && !entry.formContractPath)
      || (signals.hasWizard && !entry.wizardContractPath && !entry.lifecycleContractPath)
  }).length,
  productionVisibleRoutesWithoutFullContracts: registry.filter((entry) => {
    const release = releaseByRoute.get(entry.route)
    if (!release || release.releaseStatus !== 'release') return false
    return !entry.pageContractPath || !exists(entry.pageContractPath)
  }).length,
  temporaryExceptions: parseExceptions(read('contracts/allowlists/contract-exceptions.ts')).length,
}

console.log('Contract Coverage Matrix')
console.log(`- total page routes: ${matrix.totalPageRoutes}`)
console.log(`- total release registry routes: ${matrix.totalReleaseRegistryRoutes}`)
console.log(`- page contracts found: ${matrix.pageContractsFound}`)
console.log(`- missing page contracts: ${matrix.missingPageContracts}`)
console.log(`- implemented pages without list/form/wizard contracts: ${matrix.implementedPagesWithoutListFormWizardContracts}`)
console.log(`- production-visible routes without full contracts: ${matrix.productionVisibleRoutesWithoutFullContracts}`)
console.log(`- temporary exceptions: ${matrix.temporaryExceptions}`)

for (const warning of warnings) console.warn(`WARNING ${warning}`)

if (errors.length) {
  console.error('Contract standardization check failed:')
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exit(1)
}

console.log('Contract standardization check passed.')

function validateRegistryEntry(entry) {
  const release = releaseByRoute.get(entry.route)
  const page = pageByRoute.get(entry.route)

  for (const field of ['route', 'contractId', 'moduleKey', 'pageKind', 'implementationStatus', 'releaseStatus', 'pageContractPath']) {
    if (!entry[field]) errors.push(`${entry.route || '<unknown>'}: missing registry field ${field}`)
  }

  if (!exists(entry.pageContractPath)) {
    errors.push(`${entry.route}: pageContractPath does not exist: ${entry.pageContractPath}`)
    return
  }
  const pageContractGenerated = /(^|[\\/])generated[\\/]/.test(entry.pageContractPath || '')
  if (entry.implementationStatus === 'contract_ready' && pageContractGenerated && entry.contractSource !== 'generated_from_existing_page') {
    errors.push(`${entry.route}: generated placeholder contracts cannot be marked contract_ready without contractSource generated_from_existing_page`)
  }
  if (entry.contractSource === 'generated_placeholder' && entry.implementationStatus === 'contract_ready') {
    errors.push(`${entry.route}: generated_placeholder cannot be contract_ready`)
  }
  if (release?.releaseStatus === 'release' && entry.apiContractPath && entry.contractDepth && !['page_list_form_api', 'full_lifecycle'].includes(entry.contractDepth)) {
    errors.push(`${entry.route}: release route with API contract must be at least page_list_form_api`)
  }

  const contractSource = read(entry.pageContractPath)
  if (!contractSource.includes('satisfies EdenPageContract')) {
    errors.push(`${entry.route}: page contract must satisfy EdenPageContract (${entry.pageContractPath})`)
  }
  const routeMatch = contractSource.match(/route:\s*['"]([^'"]+)['"]/)
  if (!routeMatch || routeMatch[1] !== entry.route) {
    errors.push(`${entry.route}: page contract route mismatch in ${entry.pageContractPath}`)
  }

  if (release) {
    const expectedReleaseStatus = mapReleaseStatus(release.releaseStatus)
    const contractRelease = contractSource.match(/releaseStatus:\s*['"]([^'"]+)['"]/)
    if (!contractRelease || contractRelease[1] !== expectedReleaseStatus) {
      errors.push(`${entry.route}: releaseStatus mismatch. Expected ${expectedReleaseStatus}, got ${contractRelease ? contractRelease[1] : '<missing>'}`)
    }
    if (release.releaseStatus === 'release' && /debugStatusBadgeAllowed:\s*true/.test(contractSource)) {
      errors.push(`${entry.route}: production-visible route cannot allow debug/status badge`)
    }
  }

  if (page) {
    if (entry.sourcePagePath !== page.sourcePagePath) {
      errors.push(`${entry.route}: sourcePagePath mismatch. Expected ${page.sourcePagePath}, got ${entry.sourcePagePath || '<missing>'}`)
    }
    if (!page.source.includes(entry.pageContractPath.replace(/\.ts$/, '')) && !page.source.includes(entry.contractId)) {
      errors.push(`${entry.route}: source page does not import its page contract (${entry.sourcePagePath})`)
    }
    const signals = inferSignals(page.source)
    if (signals.hasList && !entry.listContractPath) errors.push(`${entry.route}: list behavior requires listContractPath`)
    if (signals.hasForm && !entry.formContractPath) errors.push(`${entry.route}: form behavior requires formContractPath`)
    if (signals.hasWizard && !entry.wizardContractPath && !entry.lifecycleContractPath) {
      errors.push(`${entry.route}: wizard/lifecycle behavior requires wizardContractPath or lifecycleContractPath`)
    }
    if (entry.listContractPath && !exists(entry.listContractPath)) errors.push(`${entry.route}: listContractPath missing: ${entry.listContractPath}`)
    if (entry.formContractPath && !exists(entry.formContractPath)) errors.push(`${entry.route}: formContractPath missing: ${entry.formContractPath}`)
    if (entry.wizardContractPath && !exists(entry.wizardContractPath)) errors.push(`${entry.route}: wizardContractPath missing: ${entry.wizardContractPath}`)
    if (entry.lifecycleContractPath && !exists(entry.lifecycleContractPath)) errors.push(`${entry.route}: lifecycleContractPath missing: ${entry.lifecycleContractPath}`)

    if (signals.hasHardcodedColumns && entry.listContractPath && !page.source.includes(entry.listContractPath.replace(/\.ts$/, '')) && !page.source.includes('assertListColumnsMatchContract') && entry.implementationStatus === 'implemented') {
      errors.push(`${entry.route}: implemented list page has hardcoded columns without list contract assertion`)
    }
    if (signals.hasHardcodedFields && entry.formContractPath && !page.source.includes(entry.formContractPath.replace(/\.ts$/, '')) && entry.implementationStatus === 'implemented') {
      errors.push(`${entry.route}: implemented form page has hardcoded fields without form contract import`)
    }
    if (signals.hasLifecycleStrings && !entry.lifecycleContractPath && !entry.wizardContractPath) {
      errors.push(`${entry.route}: lifecycle action strings require lifecycle/wizard contract`)
    }
  }
}

function validateExceptions() {
  const exceptions = parseExceptions(read('contracts/allowlists/contract-exceptions.ts'))
  const now = new Date()
  for (const exception of exceptions) {
    for (const field of ['rule', 'route', 'file', 'reason', 'owner', 'expiresAt', 'removalPlan']) {
      if (!exception[field]) errors.push(`Contract exception missing ${field}: ${JSON.stringify(exception)}`)
    }
    if (exception.expiresAt && new Date(exception.expiresAt) < now) {
      errors.push(`Contract exception expired for ${exception.route} ${exception.rule}`)
    }
    const release = releaseByRoute.get(exception.route)
    if (release?.releaseStatus === 'release' && /standard|frontend|baseline/i.test(exception.rule || '')) {
      errors.push(`Production-visible route cannot use broad standardization exception: ${exception.route}`)
    }
  }
}

function validateForbiddenPatterns() {
  const enforcedFiles = [
    'contracts/pages/page-contract-registry.ts',
    'contracts/allowlists/contract-exceptions.ts',
    'scripts/check-frontend-standard-contracts.js',
  ].filter(exists)

  for (const file of enforcedFiles) {
    const source = read(file)
    if (file === 'scripts/check-frontend-standard-contracts.js' && /STANDARD_DEBT_BASELINE/.test(source)) {
      errors.push(`${file}: broad route debt baseline is not allowed`)
    }
    if (/@ts-ignore/.test(source)) errors.push(`${file}: @ts-ignore is not allowed`)
    if (/\bas\s+any\b/.test(source)) errors.push(`${file}: as any is not allowed`)
  }
}

function inferSignals(source) {
  return {
    hasList: /SmartDataTable|EdenSmartList|<table\b|ColumnDef|columns\s*[:=]/.test(source),
    hasForm: /EntityForm|EdenFormShell|<form\b|FormField|const\s+tabs|fields\s*[:=]/.test(source),
    hasWizard: /Wizard|wizard|currentStep|activeStep|stepper|lifecycle/i.test(source),
    hasHardcodedColumns: /const\s+\w*columns\w*\s*[:=]|ColumnDef\[\]|columns\s*=\s*\[/.test(source),
    hasHardcodedFields: /const\s+\w*fields\w*\s*[:=]|FormField\[\]|fields\s*=\s*\[/.test(source),
    hasLifecycleStrings: /Aktifle|Pasife Al|Onayla|Arsiv|Arşiv|Yeni Versiyon|Incelemeye|İncelemeye|lifecycle/i.test(source),
  }
}

function parsePageContractRegistry(source) {
  const bodyMatch = source.match(/export const pageContractRegistry = \[([\s\S]*?)\] as const/)
  if (!bodyMatch) return []
  return bodyMatch[1]
    .split(/\n\s*\},\n\s*\{/)
    .map((part) => part.replace(/^\s*\{/, '').replace(/\}\s*$/, ''))
    .filter((part) => part.includes('route:'))
    .map((part) => ({
      route: field(part, 'route'),
      contractId: field(part, 'contractId'),
      moduleKey: field(part, 'moduleKey'),
      pageKind: field(part, 'pageKind'),
      implementationStatus: field(part, 'implementationStatus'),
      releaseStatus: field(part, 'releaseStatus'),
      owningEntity: field(part, 'owningEntity'),
      pageContractPath: field(part, 'pageContractPath'),
      listContractPath: field(part, 'listContractPath'),
      formContractPath: field(part, 'formContractPath'),
      wizardContractPath: field(part, 'wizardContractPath'),
      apiContractPath: field(part, 'apiContractPath'),
      lifecycleContractPath: field(part, 'lifecycleContractPath'),
      sourcePagePath: field(part, 'sourcePagePath'),
      contractDepth: field(part, 'contractDepth'),
      contractSource: field(part, 'contractSource'),
      businessCriticality: field(part, 'businessCriticality'),
      notes: field(part, 'notes'),
    }))
}

function parseReleaseRoutes(source) {
  const routes = []
  const regex = /route\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g
  let match
  while ((match = regex.exec(source))) {
    routes.push({ route: match[1], moduleKey: match[2], releaseStatus: match[3] })
  }
  return routes
}

function parseExceptions(source) {
  const bodyMatch = source.match(/export const contractExceptions[^=]*=\s*\[([\s\S]*?)\]/)
  const body = bodyMatch ? bodyMatch[1] : ''
  const matches = body.match(/\{[\s\S]*?\}/g) || []
  return matches
    .filter((item) => item.includes('rule:'))
    .map((item) => ({
      rule: field(item, 'rule'),
      route: field(item, 'route'),
      file: field(item, 'file'),
      reason: field(item, 'reason'),
      owner: field(item, 'owner'),
      expiresAt: field(item, 'expiresAt'),
      removalPlan: field(item, 'removalPlan'),
    }))
}

function field(source, name) {
  const match = source.match(new RegExp(`${name}:\\s*['"]([^'"]*)['"]`))
  return match ? match[1] : undefined
}

function mapReleaseStatus(status) {
  if (status === 'release') return 'live'
  if (status === 'development_demo') return 'demo'
  if (status === 'development' || status === 'coming_soon') return 'preview'
  if (status === 'broken_do_not_show') return 'deprecated'
  return 'hidden'
}

function pageRoute(file) {
  const normalized = relative(file).split(path.sep).join('/')
  if (normalized.startsWith('app/')) {
    return normalized.replace(/^app/, '').replace(/\/page\.tsx$/, '') || '/'
  }
  if (normalized.startsWith('portal/')) {
    return `/${normalized.replace(/\/page\.tsx$/, '')}`
  }
  return normalized.replace(/\/page\.tsx$/, '')
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(full)
    return [full]
  })
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing file: ${relativePath}`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/')
}
