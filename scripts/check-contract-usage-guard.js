const fs = require('fs')
const path = require('path')

const root = process.cwd()
const errors = []
const warnings = []

const registry = parsePageContractRegistry(read('contracts/pages/page-contract-registry.ts'))
const registryByRoute = new Map(registry.map(entry => [entry.route, entry]))
const pageFiles = walk(path.join(root, 'app'))
  .filter(file => file.endsWith(`${path.sep}page.tsx`))
  .map(file => ({ file, route: pageRoute(file), source: fs.readFileSync(file, 'utf8') }))

for (const page of pageFiles) {
  const entry = registryByRoute.get(page.route)
  if (!entry) {
    errors.push(`${page.route}: page has no page-contract-registry entry (${relative(page.file)})`)
    continue
  }
  validateNoVoidContract(page)
  validateNoHiddenContractMarker(entry, page)
  validateRegistrySemantics(entry, page)
  if (!requiresRuntimeContractUsage(entry)) continue
  validateContractImportUsage(entry, page)
  validateListUsage(entry, page)
  validateFormUsage(entry, page)
  validateLifecycleUsage(entry, page)
  validateApiServiceUsage(entry, page)
}

console.log('Contract usage guard')
console.log(`- pages scanned: ${pageFiles.length}`)
console.log(`- registry entries: ${registry.length}`)
console.log(`- warnings: ${warnings.length}`)
console.log(`- errors: ${errors.length}`)

for (const warning of warnings.slice(0, 40)) console.warn(`WARNING ${warning}`)
if (warnings.length > 40) console.warn(`WARNING ... ${warnings.length - 40} additional warnings omitted`)
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exit(1)
}

function validateNoVoidContract(page) {
  const matches = page.source.match(/^\s*void\s+[A-Za-z0-9_$]*(?:Contract|ContractReady)\b/gm) || []
  for (const match of matches) {
    errors.push(`${page.route}: fake contract usage is forbidden: ${match.trim()} (${relative(page.file)})`)
  }
}

function validateRegistrySemantics(entry, page) {
  const hasRealUi = hasListSignal(page.source) || hasFormSignal(page.source) || hasLifecycleSignal(page.source)
  const generatedPage = String(entry.pageContractPath || '').includes('/generated/') || String(entry.pageContractPath || '').includes('\\generated\\')
  if (entry.implementationStatus === 'contract_ready' && generatedPage && entry.contractSource === 'generated_placeholder') {
    errors.push(`${entry.route}: generated placeholder page contract cannot be marked contract_ready (${entry.pageContractPath})`)
  }
  if (entry.contractSource === 'generated_placeholder' && entry.implementationStatus === 'contract_ready') {
    errors.push(`${entry.route}: generated_placeholder cannot be contract_ready`)
  }
  if (hasRealUi && entry.implementationStatus === 'planned') {
    errors.push(`${entry.route}: planned page contains real list/form/lifecycle UI (${relative(page.file)})`)
  }
  if (requiresRuntimeContractUsage(entry) && hasLifecycleSignal(page.source) && entry.contractDepth && entry.contractDepth !== 'full_lifecycle') {
    errors.push(`${entry.route}: lifecycle UI requires contractDepth full_lifecycle`)
  }
}

function requiresRuntimeContractUsage(entry) {
  return entry.implementationStatus === 'implemented'
    || entry.implementationStatus === 'contract_ready'
    || entry.contractSource === 'manual_business_contract'
}

function validateContractImportUsage(entry, page) {
  const imported = parseContractImports(page.source)
  for (const item of imported) {
    const usageCount = countIdentifierUsage(page.source, item.symbol)
    const voidOnly = new RegExp(`^\\s*void\\s+${escapeRegExp(item.symbol)}\\b`, 'm').test(page.source) && usageCount <= 2
    if (voidOnly) errors.push(`${page.route}: ${item.symbol} is only used through void (${relative(page.file)})`)
  }

  if (entry.pageContractPath && !page.source.includes(importPathFor(entry.pageContractPath)) && !page.source.includes(entry.contractId)) {
    errors.push(`${page.route}: page contract is not imported (${entry.pageContractPath})`)
  }
  if (entry.contractSource === 'manual_business_contract') validateMeaningfulPageContractUsage(entry, page)
}

function validateNoHiddenContractMarker(entry, page) {
  if (!requiresRuntimeContractUsage(entry)) return
  if (/<span\s+hidden[\s\S]{0,300}?data-contract-route/.test(page.source)) {
    errors.push(`${page.route}: hidden data-contract-route marker is forbidden as contract usage proof (${relative(page.file)})`)
  }
}

function validateMeaningfulPageContractUsage(entry, page) {
  if (!entry.pageContractPath) return
  const contractName = contractExportName(entry.pageContractPath)
  if (!contractName || !page.source.includes(contractName)) return
  const routeAliases = Array.from(page.source.matchAll(new RegExp(`const\\s+([A-Za-z0-9_$]+)\\s*=\\s*${escapeRegExp(contractName)}\\.route\\b`, 'g'))).map(match => match[1])
  let meaningfulSource = page.source.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]*contracts\/[^'"]*['"]\s*$/gm, '')
  meaningfulSource = meaningfulSource.replace(new RegExp(`const\\s+(?:${routeAliases.map(escapeRegExp).join('|') || '__NO_ROUTE_ALIAS__'})\\s*=\\s*${escapeRegExp(contractName)}\\.route\\s*`, 'g'), '')
  meaningfulSource = meaningfulSource.replace(new RegExp(`data-contract-[A-Za-z0-9_-]+=\\{[^}]*${escapeRegExp(contractName)}[^}]*\\}`, 'g'), '')
  for (const alias of routeAliases) {
    meaningfulSource = meaningfulSource.replace(new RegExp(`data-contract-[A-Za-z0-9_-]+=\\{[^}]*${escapeRegExp(alias)}[^}]*\\}`, 'g'), '')
  }
  meaningfulSource = meaningfulSource.replace(/<span\s+hidden[\s\S]*?<\/span>/g, '')
  if (!new RegExp(`\\b${escapeRegExp(contractName)}\\b`).test(meaningfulSource)) {
    errors.push(`${page.route}: manual business contract must affect render/action behavior; data-contract markers or route constants alone are not enough (${relative(page.file)})`)
  }
}

function validateListUsage(entry, page) {
  if (!entry.listContractPath || !hasListSignal(page.source)) return
  const contractName = contractExportName(entry.listContractPath)
  const listContractSource = readOptional(entry.listContractPath)
  if (!listContractSource) {
    errors.push(`${entry.route}: list contract file missing (${entry.listContractPath})`)
    return
  }
  if (isIdOnlyListContract(listContractSource)) {
    errors.push(`${entry.route}: real list page cannot use ID-only list contract (${entry.listContractPath})`)
  }
  if (!page.source.includes(importPathFor(entry.listContractPath)) && !page.source.includes(contractName)) {
    errors.push(`${entry.route}: list UI does not import list contract (${entry.listContractPath})`)
  }
  if (/const\s+\w*columns\w*\s*(?::[^=]+)?=\s*\[/.test(page.source)) {
    const derivesFromContract = new RegExp(`columns\\s*=\\s*${escapeRegExp(contractName)}\\.columns|${escapeRegExp(contractName)}\\.columns\\.map|assertListColumnsMatchContract`).test(page.source)
    if (!derivesFromContract) {
      errors.push(`${entry.route}: local columns array is forbidden unless derived from/asserted against list contract (${relative(page.file)})`)
    }
  }
  const tableColumnProps = Array.from(page.source.matchAll(/<SmartDataTable[\s\S]{0,500}?columns=\{([^}]+)\}/g)).map(match => match[1].trim())
  for (const prop of tableColumnProps) {
    if (!prop.includes(contractName) && !new RegExp(`${escapeRegExp(contractName)}\\.columns|tableColumns|contractColumns|columns`).test(prop)) {
      errors.push(`${entry.route}: SmartDataTable columns prop is not visibly contract-derived (${relative(page.file)})`)
    }
  }
}

function validateFormUsage(entry, page) {
  if (!entry.formContractPath || !hasFormSignal(page.source)) return
  const contractName = contractExportName(entry.formContractPath)
  const formContractSource = readOptional(entry.formContractPath)
  if (!formContractSource) {
    errors.push(`${entry.route}: form contract file missing (${entry.formContractPath})`)
    return
  }
  if (isMinimalFormContract(formContractSource)) {
    errors.push(`${entry.route}: real form page cannot use minimal/empty form contract (${entry.formContractPath})`)
  }
  if (!page.source.includes(importPathFor(entry.formContractPath)) && !page.source.includes(contractName)) {
    errors.push(`${entry.route}: form UI does not import form contract (${entry.formContractPath})`)
  }
  const hasLocalFieldArrays = /const\s+\w*(fields|Fields|tabs|Tabs)\w*\s*(?::[^=]+)?=\s*\[/.test(page.source)
  const derivesFromContract = new RegExp(`${escapeRegExp(contractName)}\\.(fields|fieldOrder|tabs)|assertForm|create.*From.*Contract`).test(page.source)
  if (hasLocalFieldArrays && !derivesFromContract) {
    errors.push(`${entry.route}: local form fields/tabs are forbidden unless derived from form contract (${relative(page.file)})`)
  }
}

function validateLifecycleUsage(entry, page) {
  if (!hasLifecycleSignal(page.source)) return
  if (!entry.lifecycleContractPath && !entry.wizardContractPath) {
    errors.push(`${entry.route}: lifecycle/wizard signals require lifecycleContractPath or wizardContractPath`)
    return
  }
  const lifecycleSource = readOptional(entry.lifecycleContractPath || '')
  if (entry.lifecycleContractPath && /operationRecordRequired:\s*true/.test(lifecycleSource) && !page.source.includes(importPathFor(entry.lifecycleContractPath))) {
    errors.push(`${entry.route}: lifecycle UI must import lifecycle contract (${entry.lifecycleContractPath})`)
  }
  if (/record_status\s*[:=]\s*['"]|company_status\s*[:=]\s*['"]|employment_status\s*[:=]\s*['"]/.test(page.source) && /save|submit|patch/i.test(page.source)) {
    warnings.push(`${entry.route}: page writes lifecycle-like status fields; backend lifecycle guard must cover this path`)
  }
}

function validateApiServiceUsage(entry, page) {
  const serviceCalls = unique(Array.from(page.source.matchAll(/\b([A-Za-z][A-Za-z0-9_]*(?:Service|service))\.([A-Za-z0-9_]+)/g)).map(match => `${match[1]}.${match[2]}`))
    .filter(call => !call.startsWith('console.'))
  if (!serviceCalls.length) return
  if (!entry.apiContractPath) {
    errors.push(`${entry.route}: service calls require apiContractPath (${serviceCalls.join(', ')})`)
    return
  }
  const apiSource = readOptional(entry.apiContractPath)
  if (!apiSource) {
    errors.push(`${entry.route}: api contract file missing (${entry.apiContractPath})`)
    return
  }
  for (const call of serviceCalls) {
    if (!apiSource.includes(`serviceFunction: '${call}'`) && !apiSource.includes(`serviceFunction: "${call}"`)) {
      errors.push(`${entry.route}: service call is not listed in API contract: ${call} (${entry.apiContractPath})`)
    }
  }
}

function hasListSignal(source) {
  return /SmartDataTable|EdenSmartList|<table\b|ColumnDef|columns\s*=/.test(source)
}

function hasFormSignal(source) {
  return /EntityForm|EdenFormShell|<form\b|FormField|fields\s*=|tabs\s*=/.test(source)
}

function hasLifecycleSignal(source) {
  const lifecycleUiSignal = /Wizard|wizard|currentStep|activeStep|lifecycle|Aktifle|Pasife Al|Onayla|İşe Giriş|İşten Çıkış|Yetki Ver|Yetki Kaldır|Sermaye Artırımı|Pay Devri/i.test(source)
  const sgkDisplaySignal = /\bSGK\b/.test(source)
  return lifecycleUiSignal || sgkDisplaySignal
}

function isIdOnlyListContract(source) {
  const columns = source.match(/columns:\s*\[([\s\S]*?)\]/)
  return !!columns && /key:\s*['"]id['"]/.test(columns[1]) && !/key:\s*['"](?!id['"])[^'"]+['"]/.test(columns[1])
}

function isMinimalFormContract(source) {
  return /fields:\s*\[\s*\]/.test(source) || /tabs:\s*\[\s*\]/.test(source) || !/(fields|tabs):\s*\[[\s\S]*?name:\s*['"]/.test(source)
}

function parseContractImports(source) {
  const imports = []
  const regex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]*contracts\/[^'"]*\.contract)['"]/g
  let match
  while ((match = regex.exec(source))) {
    for (const raw of match[1].split(',')) {
      const symbol = raw.trim().split(/\s+as\s+/).pop()?.trim()
      if (symbol) imports.push({ symbol, path: match[2] })
    }
  }
  return imports
}

function parsePageContractRegistry(source) {
  const bodyMatch = source.match(/export const pageContractRegistry = \[([\s\S]*?)\] as const/)
  if (!bodyMatch) return []
  return bodyMatch[1]
    .split(/\n\s*\},\n\s*\{/)
    .map(part => part.replace(/^\s*\{/, '').replace(/\}\s*$/, ''))
    .filter(part => part.includes('route:'))
    .map(part => ({
      route: field(part, 'route'),
      contractId: field(part, 'contractId'),
      implementationStatus: field(part, 'implementationStatus'),
      contractDepth: field(part, 'contractDepth'),
      contractSource: field(part, 'contractSource'),
      businessCriticality: field(part, 'businessCriticality'),
      pageContractPath: field(part, 'pageContractPath'),
      listContractPath: field(part, 'listContractPath'),
      formContractPath: field(part, 'formContractPath'),
      wizardContractPath: field(part, 'wizardContractPath'),
      apiContractPath: field(part, 'apiContractPath'),
      lifecycleContractPath: field(part, 'lifecycleContractPath'),
    }))
}

function contractExportName(contractPath) {
  const source = readOptional(contractPath)
  const expectedSuffix = contractPath.includes('.list.contract')
    ? 'ListContract'
    : contractPath.includes('.form.contract')
      ? 'FormContract'
      : contractPath.includes('.wizard.contract')
        ? 'WizardContract'
        : contractPath.includes('.lifecycle.contract')
          ? 'LifecycleContract'
          : contractPath.includes('.page.contract')
            ? 'PageContract'
            : 'Contract'
  const preferred = Array.from(source.matchAll(/export const\s+([A-Za-z0-9_]+)/g))
    .map(match => match[1])
    .find(name => name.endsWith(expectedSuffix))
  if (preferred) return preferred
  const match = source.match(/export const\s+([A-Za-z0-9_]+)/)
  return match ? match[1] : path.basename(contractPath).replace(/[^A-Za-z0-9]+(.)/g, (_, chr) => chr.toUpperCase()).replace(/^[A-Z]/, chr => chr.toLowerCase())
}

function importPathFor(contractPath) {
  return contractPath.replace(/\\/g, '/').replace(/^contracts\//, '@/contracts/').replace(/\.ts$/, '')
}

function countIdentifierUsage(source, identifier) {
  return (source.match(new RegExp(`\\b${escapeRegExp(identifier)}\\b`, 'g')) || []).length
}

function field(source, name) {
  const match = source.match(new RegExp(`${name}:\\s*['"]([^'"]*)['"]`))
  return match ? match[1] : undefined
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function readOptional(relativePath) {
  if (!relativePath) return ''
  const fullPath = path.join(root, relativePath)
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : ''
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return [fullPath]
  })
}

function pageRoute(file) {
  const normalized = relative(file)
  return normalized.replace(/^app/, '').replace(/\/page\.tsx$/, '') || '/'
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/')
}

function unique(items) {
  return items.filter((item, index) => items.indexOf(item) === index)
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
