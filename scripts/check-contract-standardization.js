const fs = require('fs')
const path = require('path')

const root = process.cwd()

const requiredFiles = [
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
  'contracts/entities/company.contract.ts',
  'contracts/entities/partner.contract.ts',
  'contracts/entities/representative.contract.ts',
  'contracts/entities/branch.contract.ts',
  'contracts/entities/shareholder.contract.ts',
  'contracts/pages/company.page.contract.ts',
  'contracts/pages/partner.page.contract.ts',
  'contracts/pages/representative.page.contract.ts',
  'contracts/pages/branch.page.contract.ts',
  'contracts/api/company.api.contract.ts',
  'contracts/api/partner.api.contract.ts',
  'contracts/api/representative.api.contract.ts',
  'contracts/api/branch.api.contract.ts',
  'contracts/lifecycle/company.lifecycle.contract.ts',
  'contracts/lifecycle/partner.lifecycle.contract.ts',
  'contracts/lifecycle/representative.lifecycle.contract.ts',
  'contracts/lifecycle/branch.lifecycle.contract.ts',
  'contracts/release/page-release-registry.contract.ts',
  'contracts/tests/contract-test-utils.ts',
  'contracts/allowlists/contract-exceptions.ts',
]

const integratedPages = [
  {
    name: 'companies',
    file: 'app/app/sirket/companies/page.tsx',
    contractImport: '@/contracts/pages/company.page.contract',
    contractSymbol: 'companyPageContract',
  },
  {
    name: 'partners',
    file: 'app/app/sirket/companies/partners/page.tsx',
    contractImport: '@/contracts/pages/partner.page.contract',
    contractSymbol: 'partnerPageContract',
  },
  {
    name: 'representatives',
    file: 'app/app/sirket/companies/representatives/page.tsx',
    contractImport: '@/contracts/pages/representative.page.contract',
    contractSymbol: 'representativePageContract',
  },
  {
    name: 'branches',
    file: 'app/app/sirket/companies/branches/page.tsx',
    contractImport: '@/contracts/pages/branch.page.contract',
    contractSymbol: 'branchPageContract',
  },
]

const apiContractFiles = [
  'contracts/api/company.api.contract.ts',
  'contracts/api/partner.api.contract.ts',
  'contracts/api/representative.api.contract.ts',
  'contracts/api/branch.api.contract.ts',
]

const lifecycleContractFiles = [
  'contracts/lifecycle/company.lifecycle.contract.ts',
  'contracts/lifecycle/partner.lifecycle.contract.ts',
  'contracts/lifecycle/representative.lifecycle.contract.ts',
  'contracts/lifecycle/branch.lifecycle.contract.ts',
]

const entityContractFiles = [
  'contracts/entities/company.contract.ts',
  'contracts/entities/partner.contract.ts',
  'contracts/entities/representative.contract.ts',
  'contracts/entities/branch.contract.ts',
  'contracts/entities/shareholder.contract.ts',
]

const errors = []
const warnings = []

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing required contract file: ${file}`)
}

for (const file of entityContractFiles) {
  const source = read(file)
  if (!source) continue
  requireText(file, source, 'satisfies EdenEntityContract')
  for (const token of [
    'entityName',
    'tableName',
    'primaryKey',
    'draftStatusField',
    'allowedStatuses',
    'uniqueKeys',
    'requiredFields',
    'auditFields',
    'ownershipFields',
    'allowedOperations',
    'forbiddenOperations',
    'deletePolicy',
    'lifecycleBoundary',
  ]) {
    requireText(file, source, token)
  }
}

for (const page of integratedPages) {
  const source = read(page.file)
  if (!source) continue
  requireText(page.file, source, page.contractImport)
  requireText(page.file, source, page.contractSymbol)
  requireText(page.file, source, 'assertListColumnsMatchContract')
  requireText(page.file, source, `${page.contractSymbol}.route`)
  requireText(page.file, source, `${page.contractSymbol}.list.columns`)
  requireText(page.file, source, `pagePrimaryActionLabel(${page.contractSymbol})`)
}

for (const file of [
  'contracts/pages/company.page.contract.ts',
  'contracts/pages/partner.page.contract.ts',
  'contracts/pages/representative.page.contract.ts',
  'contracts/pages/branch.page.contract.ts',
]) {
  const source = read(file)
  if (!source) continue
  requireText(file, source, 'satisfies EdenPageContract')
  for (const token of [
    'route',
    'pageKind',
    'owningEntity',
    'allowedActions',
    'requiredComponents',
    'requiredStates',
    'releaseStatus',
    'visibleInProduction',
    'visibleInStaging',
    'visibleInDevelopment',
    'debugStatusBadgeAllowed',
    'primaryActionLabel',
    'primaryActionBehavior',
    'columns',
    'sortableFields',
    'filterableFields',
    'searchableFields',
    'rowActions',
  ]) {
    requireText(file, source, token)
  }
}

for (const file of apiContractFiles) {
  const source = read(file)
  if (!source) continue
  requireText(file, source, 'satisfies readonly EdenApiContract[]')
  for (const token of [
    'requestSchema',
    'responseSchema',
    'errorSchema',
    'authorization',
    'tenantScope',
    'normalization',
    'uuidFields',
    'dateFields',
    'datetimeFields',
    'enumFields',
    'serviceFunction',
  ]) {
    requireText(file, source, token)
  }
}

for (const file of lifecycleContractFiles) {
  const source = read(file)
  if (!source) continue
  requireText(file, source, 'satisfies EdenLifecycleContract')
  requireText(file, source, 'operationRecordRequired: true')
  for (const token of [
    'entityName',
    'operationTypes',
    'masterDataMutationForbiddenInForms',
    'allowedSourceStatuses',
    'resultingStatuses',
    'transactionTable',
  ]) {
    requireText(file, source, token)
  }
}

const releaseBridge = read('contracts/release/page-release-registry.contract.ts')
if (releaseBridge) {
  requireText('contracts/release/page-release-registry.contract.ts', releaseBridge, '../../lib/release/routeReleaseRegistry')
  requireText('contracts/release/page-release-registry.contract.ts', releaseBridge, 'listRouteReleaseConfigs')
  requireText('contracts/release/page-release-registry.contract.ts', releaseBridge, 'productionVisibleRouteContracts')
}

const releaseRegistry = read('lib/release/routeReleaseRegistry.ts')
if (releaseRegistry) {
  for (const page of integratedPages) {
    const route = pageContractRoute(page.contractSymbol)
    if (route && !releaseRegistry.includes(route)) {
      errors.push(`Release registry does not include ${route} for ${page.name}`)
    }
  }
}

const navigationRegistry = read('lib/navigation/navigationRegistry.ts')
if (navigationRegistry && releaseRegistry) {
  const navRoutes = Array.from(navigationRegistry.matchAll(/href:\s*['"]([^'"]+)['"]/g)).map((match) => match[1])
  const missing = navRoutes.filter((route) => route.startsWith('/app') && !releaseRegistry.includes(route))
  if (missing.length) {
    errors.push(`Navigation routes missing release registry entries: ${missing.slice(0, 20).join(', ')}`)
  }
}

validateForbiddenPatterns()

if (warnings.length) {
  console.log('Contract standardization warnings:')
  for (const warning of warnings) console.warn(`WARNING ${warning}`)
}

if (errors.length) {
  console.error('Contract standardization check failed:')
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exit(1)
}

console.log('Contract standardization check passed.')
console.log(`Contract files checked: ${requiredFiles.length}`)
console.log(`Integrated pages checked: ${integratedPages.length}`)

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing file: ${relativePath}`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireText(file, source, token) {
  if (!source.includes(token)) errors.push(`${file} is missing required contract token: ${token}`)
}

function pageContractRoute(contractSymbol) {
  const pageFile = integratedPages.find((page) => page.contractSymbol === contractSymbol)
  if (!pageFile) return null
  const contractFile = pageFile.contractImport.replace('@/contracts/', 'contracts/') + '.ts'
  const source = read(contractFile)
  const match = source.match(/route:\s*['"]([^'"]+)['"]/)
  return match ? match[1] : null
}

function validateForbiddenPatterns() {
  const enforcedFiles = [
    ...requiredFiles,
  ].filter((file) => exists(file) && file !== 'contracts/allowlists/contract-exceptions.ts')

  const forbiddenPatterns = [
    { rule: 'ts-ignore', pattern: /@ts-ignore/ },
    { rule: 'as-any', pattern: /\bas\s+any\b/ },
    { rule: 'eslint-disable', pattern: /eslint-disable/ },
    { rule: 'direct-lifecycle-mutation', pattern: /record_status\s*=\s*['"](active|closed|approved)['"]/ },
    { rule: 'hardcoded-release-visibility', pattern: /showInNavigation:\s*(true|false)/ },
    { rule: 'production-placeholder', pattern: /\bplaceholder\b|\bmock\b|\bTODO\b/i },
  ]

  const allowlist = read('contracts/allowlists/contract-exceptions.ts')
  for (const file of enforcedFiles) {
    const source = read(file)
    for (const { rule, pattern } of forbiddenPatterns) {
      if (!pattern.test(source)) continue
      if (allowlist.includes(`rule: '${rule}'`) && allowlist.includes(`file: '${file}'`)) continue
      errors.push(`${file} violates contract guardrail: ${rule}`)
    }
  }
}
