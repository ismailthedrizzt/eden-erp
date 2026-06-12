const fs = require('fs')
const path = require('path')

const root = process.cwd()
const errors = []
const warnings = []

const REQUIRED_STANDARD_COMPONENTS = [
  'EdenPageShell',
  'EdenListPageShell',
  'EdenSmartList',
  'EdenFormShell',
  'EdenFormHeader',
  'EdenFormHero',
  'EdenHeroImageUploader',
  'EdenHeroDocumentUploader',
  'EdenFormTabs',
  'EdenFormActionBar',
  'EdenStatusActionButton',
  'EdenCompactFieldGrid',
  'EdenTokenTable',
  'EdenWizardShell',
]

const componentSourcePath = path.join('components', 'ui', 'eden-standard.tsx')
const componentSource = fs.existsSync(componentSourcePath) ? fs.readFileSync(componentSourcePath, 'utf8') : ''
for (const component of REQUIRED_STANDARD_COMPONENTS) {
  if (!componentSource.includes(`function ${component}`)) {
    errors.push(`${componentSourcePath} missing ${component}`)
  }
}

const registry = parsePageContractRegistry(readOptional('contracts/pages/page-contract-registry.ts'))
const exceptions = parseExceptions(readOptional('contracts/allowlists/contract-exceptions.ts'))
const pages = walk('app').filter((file) => file.endsWith(`${path.sep}page.tsx`) || file === path.join('app', 'page.tsx'))
const strictRoutes = new Set(
  registry
    .filter((entry) => entry.route === '/app/ik/calisanlar' || entry.route === '/app/development/temalarimiz')
    .map((entry) => entry.route)
)

for (const exception of exceptions) {
  for (const field of ['rule', 'route', 'file', 'reason', 'owner', 'expiresAt', 'removalPlan']) {
    if (!exception[field]) errors.push(`Frontend standard exception missing ${field}: ${JSON.stringify(exception)}`)
  }
  if (exception.expiresAt && new Date(exception.expiresAt) < new Date()) {
    errors.push(`Frontend standard exception expired for ${exception.route} ${exception.rule}`)
  }
}

for (const file of pages) {
  const source = fs.readFileSync(file, 'utf8')
  const route = pageRoute(file)
  const strict = strictRoutes.has(route)

  const hasListSignal = /PageBanner|SmartDataTable|<table\b|EdenSmartList/.test(source)
  const hasFormSignal = /<form\b|Kaydet|Save|FormHeader|EdenFormShell|activeTab|TextField|TextArea/.test(source)
  const hasWizardSignal = /<Wizard|WizardSteps|stepper|currentStep|activeStep|EdenWizardShell/.test(source)

  const violations = []
  if (strict && hasListSignal && !(/EdenListPageShell/.test(source) && /EdenSmartList/.test(source))) {
    violations.push(['frontend-list-shell', 'must use EdenListPageShell + EdenSmartList'])
  }
  if (strict && hasListSignal && !/SmartDataTable/.test(source)) {
    violations.push(['frontend-smart-data-table', 'list pages must render the standard SmartDataTable inside EdenSmartList'])
  }
  if (strict && hasFormSignal && !(/EdenFormShell/.test(source) && /EdenFormHeader/.test(source) && (/EdenFormHero/.test(source) || /data-eden-standard=["']form-hero["']/.test(source)))) {
    violations.push(['frontend-form-shell', 'must use EdenFormShell + EdenFormHeader + EdenFormHero'])
  }
  if (strict && /activeTab|setActiveTab|const \[tab/.test(source) && !/EdenFormTabs/.test(source)) {
    violations.push(['frontend-tabs', 'tabbed form content must use EdenFormTabs'])
  }
  if (strict && hasWizardSignal && !/EdenWizardShell/.test(source)) {
    violations.push(['frontend-wizard-shell', 'wizard content must use EdenWizardShell'])
  }
  if (strict && /<ImageSlotUploader|<DocumentSlotUploader/.test(source)) {
    violations.push(['frontend-hero-uploader', 'must use EdenHeroImageUploader/EdenHeroDocumentUploader'])
  }

  for (const [rule, message] of violations) {
    if (!hasException(rule, route, file)) errors.push(`${route} ${message} (${file})`)
  }

  if (route === '/app/ik/calisanlar') {
    validateStrictEmployeePage(file, source)
  }
  if (route === '/app/development/temalarimiz') {
    validateStrictThemeManagementPage(file, source)
  }

  if (!strict && (hasListSignal || hasFormSignal || hasWizardSignal) && process.env.EDEN_FRONTEND_STANDARD_REPORT_DEBT === '1') {
    warnings.push(`${route} is contract-covered but not strict frontend-standard enforced yet (${file})`)
  }
}

console.log('Frontend standard contract check')
console.log(`Pages scanned: ${pages.length}`)
console.log(`Strict routes: ${strictRoutes.size}`)
console.log(`Explicit exceptions: ${exceptions.length}`)
console.log(`Warnings: ${warnings.length}`)
console.log(`Errors: ${errors.length}`)

for (const warning of warnings.slice(0, 20)) console.warn(`WARNING ${warning}`)
if (warnings.length > 20) console.warn(`WARNING ... ${warnings.length - 20} additional standardization debt warnings omitted`)

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exit(1)
}

function validateStrictEmployeePage(file, source) {
  const route = '/app/ik/calisanlar'
  const requiredImports = [
    '@/contracts/entities/employee.contract',
    '@/contracts/pages/hr/employee.page.contract',
    '@/contracts/lists/hr/employee.list.contract',
    '@/contracts/forms/hr/employee.form.contract',
    '@/contracts/wizards/hr/employment-start.wizard.contract',
    '@/contracts/wizards/hr/employment-termination.wizard.contract',
    '@/contracts/wizards/hr/assignment-change.wizard.contract',
    '@/contracts/wizards/hr/sgk-entry.wizard.contract',
    '@/contracts/wizards/hr/sgk-exit.wizard.contract',
    '@/contracts/lifecycle/hr/employee.lifecycle.contract',
    '@/contracts/api/hr/employee.api.contract',
  ]
  for (const importPath of requiredImports) requireSourceImport(route, file, source, importPath)

  forbidSourcePattern(route, file, source, /const\s+columns\s*[:=]\s*\[/, 'employee-hardcoded-columns', 'employee columns must come from employeeListContract')
  forbidSourcePattern(route, file, source, /const\s+(RECORD|EMPLOYMENT|SGK|GENDER|DOCUMENT)_.*LABELS\s*[:=]/, 'employee-hardcoded-labels', 'employee labels/status maps must come from employee entity contract')

  const apiContract = readOptional('contracts/api/hr/employee.api.contract.ts')
  const serviceCalls = Array.from(source.matchAll(/\b(employeesService|employmentService)\.([A-Za-z0-9_]+)/g))
    .map((match) => `${match[1]}.${match[2]}`)
    .filter((value, index, items) => items.indexOf(value) === index)
  for (const serviceCall of serviceCalls) {
    if (!apiContract.includes(`serviceFunction: '${serviceCall}'`) && !apiContract.includes(`serviceFunction: "${serviceCall}"`)) {
      errors.push(`${route} service call is not listed in employee API contract: ${serviceCall} (${file})`)
    }
  }
}

function validateStrictThemeManagementPage(file, source) {
  const route = '/app/development/temalarimiz'
  const requiredImports = [
    '@/contracts/entities/workspace-theme.contract',
    '@/contracts/pages/system/themes-management.page.contract',
    '@/contracts/lists/system/themes-management.list.contract',
    '@/contracts/forms/system/themes-management.form.contract',
    '@/contracts/wizards/system/theme-import.wizard.contract',
    '@/contracts/wizards/system/theme-activation.wizard.contract',
    '@/contracts/lifecycle/system/theme-management.lifecycle.contract',
    '@/contracts/api/system/theme-management.api.contract',
  ]
  for (const importPath of requiredImports) requireSourceImport(route, file, source, importPath)

  forbidSourcePattern(route, file, source, /const\s+STATUS_LABELS\s*[:=]/, 'theme-hardcoded-status-labels', 'theme status labels must come from workspace theme contract')
  forbidSourcePattern(route, file, source, /const\s+STATUS_CLASS\s*[:=]/, 'theme-hardcoded-status-classes', 'theme status classes must come from workspace theme contract')
  forbidSourcePattern(route, file, source, /const\s+FILTERS\s*[:=]/, 'theme-hardcoded-filters', 'theme filters must come from list contract')
  forbidSourcePattern(route, file, source, /const\s+TABS\s*[:=]/, 'theme-hardcoded-tabs', 'theme tabs must come from form contract')
  forbidSourcePattern(route, file, source, /const\s+IMAGE_SLOTS\s*[:=]/, 'theme-hardcoded-image-slots', 'theme image slots must come from form contract')
  forbidSourcePattern(route, file, source, /const\s+DOCUMENT_SLOTS\s*[:=]/, 'theme-hardcoded-document-slots', 'theme document slots must come from form contract')
  forbidSourcePattern(route, file, source, /const\s+COLOR_FIELDS\s*[:=]/, 'theme-hardcoded-color-fields', 'theme color fields must come from form contract')
  forbidSourcePattern(route, file, source, /<th[^>]*>\s*(Tema adi|Tema kodu|Durum|Versiyon|Aktif tema|Son guncelleme)/, 'theme-hardcoded-list-columns', 'theme list headers must render from themeManagementListContract.columns')
  forbidSourcePattern(route, file, source, /documents=\{selected\.documents\s+as\s+SlotDocument\[\]\}/, 'theme-document-uploader-raw-documents', 'theme document uploader must receive generated contract documents, not raw record documents')
  forbidSourcePattern(route, file, source, /documents=\{selected\.documents\}/, 'theme-document-uploader-raw-documents', 'theme document uploader must receive generated contract documents, not raw record documents')
  if (!/SmartDataTable<ThemeTableRow>|SmartDataTable/.test(source)) {
    errors.push(`${route} must use SmartDataTable for the theme list (${file})`)
  }
  if (!/themeManagementFormContract\.reactiveFields/.test(source)) {
    errors.push(`${route} reactive document behavior must be driven by themeManagementFormContract.reactiveFields (${file})`)
  }
  const formContract = readOptional('contracts/forms/system/themes-management.form.contract.ts')
  if (!/reactiveFields:\s*themeReactiveFieldContracts/.test(formContract)) {
    errors.push(`${route} theme form contract must expose reactiveFields for document-driven hydration`)
  }
  if (!/generatedFrom:/.test(formContract) || !/hydratesFields:/.test(formContract)) {
    errors.push(`${route} theme document slots must declare generatedFrom and hydratesFields behavior in the form contract`)
  }
}

function requireSourceImport(route, file, source, importPath) {
  if (!source.includes(importPath)) {
    errors.push(`${route} missing contract import ${importPath} (${file})`)
  }
}

function forbidSourcePattern(route, file, source, pattern, rule, message) {
  if (pattern.test(source) && !hasException(rule, route, file)) {
    errors.push(`${route} ${message} (${file})`)
  }
}

function hasException(rule, route, file) {
  const normalized = file.split(path.sep).join('/')
  return exceptions.some((exception) => exception.rule === rule && exception.route === route && exception.file === normalized)
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
      implementationStatus: field(part, 'implementationStatus'),
    }))
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

function readOptional(relativePath) {
  const full = path.join(root, relativePath)
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : ''
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return [fullPath]
  })
}

function pageRoute(file) {
  const normalized = file.split(path.sep).join('/')
  const withoutApp = normalized.replace(/^app/, '')
  return withoutApp.replace(/\/page\.tsx$/, '') || '/'
}
