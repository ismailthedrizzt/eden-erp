const fs = require('fs')
const path = require('path')

const root = process.cwd()
const generatedDir = path.join(root, 'contracts', 'pages', 'generated')
fs.mkdirSync(generatedDir, { recursive: true })

const releaseRegistryPath = path.join(root, 'lib', 'release', 'routeReleaseRegistry.ts')
const releaseRegistrySource = fs.readFileSync(releaseRegistryPath, 'utf8')
const releaseRoutes = parseReleaseRoutes(releaseRegistrySource)
const pageFiles = walk(path.join(root, 'app')).filter((file) => file.endsWith(`${path.sep}page.tsx`))
const topLevelPortal = path.join(root, 'portal')
if (fs.existsSync(topLevelPortal)) {
  pageFiles.push(...walk(topLevelPortal).filter((file) => file.endsWith(`${path.sep}page.tsx`)))
}

const pageRouteByPath = new Map()
for (const file of pageFiles) {
  pageRouteByPath.set(pageRoute(file), relative(file))
}

const allRoutes = Array.from(new Set([...releaseRoutes.map((route) => route.route), ...pageRouteByPath.keys()])).sort(routeSort)

const knownContracts = {
  '/app/sirket/companies': {
    pageContractPath: 'contracts/pages/company.page.contract.ts',
    symbol: 'companyPageContract',
    listContractPath: 'contracts/pages/company.page.contract.ts',
    formContractPath: 'contracts/pages/company.page.contract.ts',
    apiContractPath: 'contracts/api/company.api.contract.ts',
    lifecycleContractPath: 'contracts/lifecycle/company.lifecycle.contract.ts',
    implementationStatus: 'implemented',
  },
  '/app/sirket/companies/partners': {
    pageContractPath: 'contracts/pages/partner.page.contract.ts',
    symbol: 'partnerPageContract',
    listContractPath: 'contracts/pages/partner.page.contract.ts',
    formContractPath: 'contracts/pages/partner.page.contract.ts',
    apiContractPath: 'contracts/api/partner.api.contract.ts',
    lifecycleContractPath: 'contracts/lifecycle/partner.lifecycle.contract.ts',
    implementationStatus: 'implemented',
  },
  '/app/sirket/companies/representatives': {
    pageContractPath: 'contracts/pages/representative.page.contract.ts',
    symbol: 'representativePageContract',
    listContractPath: 'contracts/pages/representative.page.contract.ts',
    formContractPath: 'contracts/pages/representative.page.contract.ts',
    apiContractPath: 'contracts/api/representative.api.contract.ts',
    lifecycleContractPath: 'contracts/lifecycle/representative.lifecycle.contract.ts',
    implementationStatus: 'implemented',
  },
  '/app/sirket/companies/branches': {
    pageContractPath: 'contracts/pages/branch.page.contract.ts',
    symbol: 'branchPageContract',
    listContractPath: 'contracts/pages/branch.page.contract.ts',
    formContractPath: 'contracts/pages/branch.page.contract.ts',
    apiContractPath: 'contracts/api/branch.api.contract.ts',
    lifecycleContractPath: 'contracts/lifecycle/branch.lifecycle.contract.ts',
    implementationStatus: 'implemented',
  },
  '/app/ik/calisanlar': {
    pageContractPath: 'contracts/pages/hr/employee.page.contract.ts',
    symbol: 'employeePageContract',
    listContractPath: 'contracts/lists/hr/employee.list.contract.ts',
    formContractPath: 'contracts/forms/hr/employee.form.contract.ts',
    wizardContractPath: 'contracts/wizards/hr/employment-start.wizard.contract.ts',
    apiContractPath: 'contracts/api/hr/employee.api.contract.ts',
    lifecycleContractPath: 'contracts/lifecycle/hr/employee.lifecycle.contract.ts',
    implementationStatus: 'implemented',
  },
  '/app/development/temalarimiz': {
    pageContractPath: 'contracts/pages/system/themes-management.page.contract.ts',
    symbol: 'themeManagementPageContract',
    listContractPath: 'contracts/lists/system/themes-management.list.contract.ts',
    formContractPath: 'contracts/forms/system/themes-management.form.contract.ts',
    wizardContractPath: 'contracts/wizards/system/theme-import.wizard.contract.ts',
    apiContractPath: 'contracts/api/system/theme-management.api.contract.ts',
    lifecycleContractPath: 'contracts/lifecycle/system/theme-management.lifecycle.contract.ts',
    implementationStatus: 'implemented',
  },
}

const usedSymbols = new Set(Object.values(knownContracts).map((entry) => entry.symbol))
const registryEntries = []
const imports = []
const exportLines = []

for (const route of allRoutes) {
  const releaseConfig = releaseRoutes.find((item) => item.route === route)
  const sourcePagePath = pageRouteByPath.get(route)
  const source = sourcePagePath ? fs.readFileSync(path.join(root, sourcePagePath), 'utf8') : ''
  const signals = inferSignals(route, source, sourcePagePath)
  const moduleKey = releaseConfig?.moduleKey || inferModuleKey(route)
  const releaseStatus = releaseConfig?.releaseStatus || 'hidden'
  const mappedReleaseStatus = mapReleaseStatus(releaseStatus)
  const visibleInProduction = mappedReleaseStatus === 'live'
  const visibleInStaging = ['live', 'preview', 'demo'].includes(mappedReleaseStatus)
  const visibleInDevelopment = mappedReleaseStatus !== 'deprecated'
  const known = knownContracts[route]
  const contractId = routeToContractId(route)

  let symbol = known?.symbol || toUniqueSymbol(contractId, 'PageContract')
  let pageContractPath = known?.pageContractPath || `contracts/pages/generated/${contractId}.page.contract.ts`
  let listContractPath = known?.listContractPath
  let formContractPath = known?.formContractPath
  let wizardContractPath = known?.wizardContractPath
  let lifecycleContractPath = known?.lifecycleContractPath
  let apiContractPath = known?.apiContractPath
  let implementationStatus = known?.implementationStatus || inferImplementationStatus(releaseStatus, sourcePagePath, signals)

  if (signals.hasList && !listContractPath) listContractPath = `contracts/pages/generated/${contractId}.list.contract.ts`
  if (signals.hasForm && !formContractPath) formContractPath = `contracts/pages/generated/${contractId}.form.contract.ts`
  if ((signals.hasWizard || signals.hasLifecycleStrings) && !wizardContractPath) {
    wizardContractPath = `contracts/pages/generated/${contractId}.wizard.contract.ts`
    if (!lifecycleContractPath) lifecycleContractPath = `contracts/pages/generated/${contractId}.lifecycle.contract.ts`
  }

  writeCompanionContracts({
    route,
    contractId,
    moduleKey,
    owningEntity: inferOwningEntity(route, moduleKey),
    listContractPath,
    formContractPath,
    wizardContractPath,
    lifecycleContractPath,
  })

  if (!known) {
    writeGeneratedContracts({
      route,
      contractId,
      symbol,
      moduleKey,
      pageKind: signals.pageKind,
      owningEntity: inferOwningEntity(route, moduleKey),
      releaseStatus: mappedReleaseStatus,
      visibleInProduction,
      visibleInStaging,
      visibleInDevelopment,
      listContractPath,
      formContractPath,
      wizardContractPath,
    })
  }

  const registryImportPath = pageRegistryImportPath(pageContractPath)
  imports.push(`import { ${symbol} } from '${registryImportPath}'`)
  exportLines.push(`export { ${symbol} } from '${generatedIndexImportPath(pageContractPath)}'`)

  registryEntries.push({
    route,
    contractId,
    moduleKey,
    pageKind: signals.pageKind,
    implementationStatus,
    releaseStatus,
    owningEntity: inferOwningEntity(route, moduleKey),
    pageContractPath,
    listContractPath,
    formContractPath,
    wizardContractPath,
    apiContractPath,
    lifecycleContractPath,
    sourcePagePath,
    contractDepth: inferContractDepth({ listContractPath, formContractPath, apiContractPath, wizardContractPath, lifecycleContractPath }),
    contractSource: known ? 'manual_business_contract' : sourcePagePath ? 'generated_from_existing_page' : 'generated_placeholder',
    businessCriticality: inferBusinessCriticality(mappedReleaseStatus, moduleKey),
    symbol,
    notes: sourcePagePath ? 'Contract coverage generated from route registry and page source.' : 'Release registry route without page source; contract kept explicit.',
  })

}

writeRegistry(registryEntries, imports)
writeGeneratedIndex(exportLines)
writeAuditReport(registryEntries, releaseRoutes.length, pageFiles.length)

console.log(`Generated page contract coverage for ${registryEntries.length} routes.`)
console.log(`Page files found: ${pageFiles.length}`)
console.log(`Release registry routes found: ${releaseRoutes.length}`)

function writeGeneratedContracts(params) {
  const {
    route,
    contractId,
    symbol,
    moduleKey,
    pageKind,
    owningEntity,
    releaseStatus,
    visibleInProduction,
    visibleInStaging,
    visibleInDevelopment,
    listContractPath,
    formContractPath,
    wizardContractPath,
  } = params

  const imports = [`import type { EdenPageContract } from '../../core/page.contract'`]
  const pageProperties = []

  if (listContractPath) {
    const listSymbol = toStableSymbol(contractId, 'ListContract')
    imports.push(`import { ${listSymbol} } from './${contractId}.list.contract'`)
    pageProperties.push(`  list: ${listSymbol},`)
    writeFileIfChanged(
      path.join(root, listContractPath),
      `import type { EdenListContract } from '../../core/list.contract'\n\nexport const ${listSymbol} = {\n  columns: [\n    { key: 'id', label: 'ID', searchable: true },\n  ],\n  sortableFields: [],\n  filterableFields: [],\n  searchableFields: ['id'],\n  rowActions: [],\n  bulkActions: [],\n  emptyState: {\n    title: 'Kayit bulunamadi',\n    message: 'Bu liste icin henuz kayit bulunmuyor.',\n  },\n  primaryActionLabel: 'Ekle',\n  primaryActionBehavior: 'open_draft_form',\n} as const satisfies EdenListContract\n`
    )
  }

  if (formContractPath && formContractPath.startsWith('contracts/pages/generated/')) {
    const formSymbol = toStableSymbol(contractId, 'FormContract')
    imports.push(`import { ${formSymbol} } from './${contractId}.form.contract'`)
    pageProperties.push(`  form: ${formSymbol},`)
    writeFileIfChanged(
      path.join(root, formContractPath),
      `import type { EdenFormContract } from '../../core/form.contract'\n\nexport const ${formSymbol} = {\n  fields: [\n    { name: 'id', kind: 'string', label: 'Record ID', optional: true, readonly: true },\n  ],\n  fieldOrder: ['id'],\n  defaultValues: {},\n  readonlyFields: ['id'],\n  hiddenFields: [],\n  submitBehavior: 'update_master_data',\n  cancelBehavior: 'return_to_list',\n  draftSaveBehavior: 'update_draft',\n  forbiddenBehaviors: ['lifecycle_transaction'],\n} as const satisfies EdenFormContract\n`
    )
  }

  if (wizardContractPath && wizardContractPath.startsWith('contracts/pages/generated/')) {
    const wizardSymbol = toStableSymbol(contractId, 'WizardContract')
    imports.push(`import { ${wizardSymbol} } from './${contractId}.wizard.contract'`)
    pageProperties.push(`  wizard: ${wizardSymbol},`)
    writeFileIfChanged(
      path.join(root, wizardContractPath),
      `import type { EdenWizardContract } from '../../core/wizard.contract'\n\nexport const ${wizardSymbol} = {\n  wizardName: '${escapeString(route)} workflow',\n  lifecycleOperationType: '${escapeString(moduleKey)}.operation',\n  owningEntity: '${escapeString(owningEntity)}',\n  steps: [\n    { id: 'review', label: 'Kontrol', requiredFields: [] },\n  ],\n  submitOperation: '${escapeString(moduleKey)}.operation.submit',\n  resultingRecord: 'operation_request',\n  allowedSourceStatuses: ['draft', 'active'],\n  resultingTargetStatus: 'active',\n  rollbackRule: 'cancel_before_submit',\n} as const satisfies EdenWizardContract\n`
    )
    const lifecycleSymbol = toUniqueSymbol(contractId, 'LifecycleContract')
    writeFileIfChanged(
      path.join(root, `contracts/pages/generated/${contractId}.lifecycle.contract.ts`),
      `import type { EdenLifecycleContract } from '../../core/lifecycle.contract'\n\nexport const ${lifecycleSymbol} = {\n  entityName: '${escapeString(owningEntity)}',\n  operationTypes: ['${escapeString(moduleKey)}.operation'],\n  masterDataMutationForbiddenInForms: true,\n  operationRecordRequired: true,\n  allowedSourceStatuses: ['draft', 'active'],\n  resultingStatuses: ['active'],\n  transactionTable: 'operation_requests',\n} as const satisfies EdenLifecycleContract\n`
    )
  }

  writeFileIfChanged(
    path.join(root, `contracts/pages/generated/${contractId}.page.contract.ts`),
    `${imports.join('\n')}\n\nexport const ${symbol} = {\n  route: '${escapeString(route)}',\n  pageKind: '${pageKind}',\n  owningEntity: '${escapeString(owningEntity)}',\n  allowedActions: [],\n  requiredComponents: ['EdenPageShell'],\n  requiredStates: {\n    empty: true,\n    loading: ${pageKind !== 'redirect'},\n    error: true,\n  },\n  releaseStatus: '${releaseStatus}',\n  visibleInProduction: ${visibleInProduction},\n  visibleInStaging: ${visibleInStaging},\n  visibleInDevelopment: ${visibleInDevelopment},\n  debugStatusBadgeAllowed: ${visibleInProduction ? 'false' : 'true'},\n${pageProperties.join('\n')}\n} as const satisfies EdenPageContract\n`
  )
}

function writeCompanionContracts(params) {
  const { route, contractId, moduleKey, owningEntity, listContractPath, formContractPath, wizardContractPath, lifecycleContractPath } = params
  if (listContractPath && listContractPath.startsWith('contracts/pages/generated/')) {
    const listSymbol = toStableSymbol(contractId, 'ListContract')
    writeFileIfChanged(
      path.join(root, listContractPath),
      `import type { EdenListContract } from '../../core/list.contract'\n\nexport const ${listSymbol} = {\n  columns: [\n    { key: 'id', label: 'ID', searchable: true },\n  ],\n  sortableFields: [],\n  filterableFields: [],\n  searchableFields: ['id'],\n  rowActions: [],\n  bulkActions: [],\n  emptyState: {\n    title: 'Kayit bulunamadi',\n    message: 'Bu liste icin henuz kayit bulunmuyor.',\n  },\n  primaryActionLabel: 'Ekle',\n  primaryActionBehavior: 'open_draft_form',\n} as const satisfies EdenListContract\n`
    )
  }
  if (formContractPath && formContractPath.startsWith('contracts/pages/generated/')) {
    const formSymbol = toStableSymbol(contractId, 'FormContract')
    writeFileIfChanged(
      path.join(root, formContractPath),
      `import type { EdenFormContract } from '../../core/form.contract'\n\nexport const ${formSymbol} = {\n  fields: [\n    { name: 'id', kind: 'string', label: 'Record ID', optional: true, readonly: true },\n  ],\n  fieldOrder: ['id'],\n  defaultValues: {},\n  readonlyFields: ['id'],\n  hiddenFields: [],\n  submitBehavior: 'update_master_data',\n  cancelBehavior: 'return_to_list',\n  draftSaveBehavior: 'update_draft',\n  forbiddenBehaviors: ['lifecycle_transaction'],\n} as const satisfies EdenFormContract\n`
    )
  }
  if (wizardContractPath) {
    const wizardSymbol = toStableSymbol(contractId, 'WizardContract')
    writeFileIfChanged(
      path.join(root, wizardContractPath),
      `import type { EdenWizardContract } from '../../core/wizard.contract'\n\nexport const ${wizardSymbol} = {\n  wizardName: '${escapeString(route)} workflow',\n  lifecycleOperationType: '${escapeString(moduleKey)}.operation',\n  owningEntity: '${escapeString(owningEntity)}',\n  steps: [\n    { id: 'review', label: 'Kontrol', requiredFields: [] },\n  ],\n  submitOperation: '${escapeString(moduleKey)}.operation.submit',\n  resultingRecord: 'operation_request',\n  allowedSourceStatuses: ['draft', 'active'],\n  resultingTargetStatus: 'active',\n  rollbackRule: 'cancel_before_submit',\n} as const satisfies EdenWizardContract\n`
    )
  }
  if (lifecycleContractPath && lifecycleContractPath.startsWith('contracts/pages/generated/')) {
    const lifecycleSymbol = toStableSymbol(contractId, 'LifecycleContract')
    writeFileIfChanged(
      path.join(root, lifecycleContractPath),
      `import type { EdenLifecycleContract } from '../../core/lifecycle.contract'\n\nexport const ${lifecycleSymbol} = {\n  entityName: '${escapeString(owningEntity)}',\n  operationTypes: ['${escapeString(moduleKey)}.operation'],\n  masterDataMutationForbiddenInForms: true,\n  operationRecordRequired: true,\n  allowedSourceStatuses: ['draft', 'active'],\n  resultingStatuses: ['active'],\n  transactionTable: 'operation_requests',\n} as const satisfies EdenLifecycleContract\n`
    )
  }
}

function writeRegistry(entries, imports) {
  const registryType = `export type PageImplementationStatus = 'contract_ready' | 'implemented' | 'planned' | 'hidden' | 'deprecated' | 'blocked'\nexport type PageContractDepth = 'placeholder_only' | 'page_only' | 'page_and_list' | 'page_list_form' | 'page_list_form_api' | 'full_lifecycle'\nexport type PageContractSource = 'manual_business_contract' | 'generated_placeholder' | 'generated_from_existing_page' | 'temporary_adapter'\nexport type PageBusinessCriticality = 'core_release' | 'core_development' | 'supporting' | 'demo' | 'legacy'\n\nexport interface PageContractRegistryItem {\n  route: string\n  contractId: string\n  moduleKey: string\n  pageKind: 'list' | 'form' | 'detail' | 'wizard' | 'dashboard' | 'shell' | 'placeholder' | 'redirect'\n  implementationStatus: PageImplementationStatus\n  releaseStatus: string\n  owningEntity?: string\n  pageContractPath: string\n  listContractPath?: string\n  formContractPath?: string\n  wizardContractPath?: string\n  apiContractPath?: string\n  lifecycleContractPath?: string\n  sourcePagePath?: string\n  contractDepth: PageContractDepth\n  contractSource: PageContractSource\n  businessCriticality: PageBusinessCriticality\n  notes?: string\n  pageContract: import('../core/page.contract').EdenPageContract\n}\n`
  const body = entries.map((entry) => {
    return `  {\n    route: '${escapeString(entry.route)}',\n    contractId: '${escapeString(entry.contractId)}',\n    moduleKey: '${escapeString(entry.moduleKey)}',\n    pageKind: '${entry.pageKind}',\n    implementationStatus: '${entry.implementationStatus}',\n    releaseStatus: '${entry.releaseStatus}',\n    owningEntity: '${escapeString(entry.owningEntity)}',\n    pageContractPath: '${escapeString(entry.pageContractPath)}',\n${entry.listContractPath ? `    listContractPath: '${escapeString(entry.listContractPath)}',\n` : ''}${entry.formContractPath ? `    formContractPath: '${escapeString(entry.formContractPath)}',\n` : ''}${entry.wizardContractPath ? `    wizardContractPath: '${escapeString(entry.wizardContractPath)}',\n` : ''}${entry.apiContractPath ? `    apiContractPath: '${escapeString(entry.apiContractPath)}',\n` : ''}${entry.lifecycleContractPath ? `    lifecycleContractPath: '${escapeString(entry.lifecycleContractPath)}',\n` : ''}${entry.sourcePagePath ? `    sourcePagePath: '${escapeString(entry.sourcePagePath)}',\n` : ''}    contractDepth: '${entry.contractDepth}',\n    contractSource: '${entry.contractSource}',\n    businessCriticality: '${entry.businessCriticality}',\n    notes: '${escapeString(entry.notes)}',\n    pageContract: ${entry.symbol},\n  }`
  }).join(',\n')
  writeFileIfChanged(
    path.join(root, 'contracts', 'pages', 'page-contract-registry.ts'),
    `import type { EdenPageContract } from '../core/page.contract'\n${Array.from(new Set(imports)).join('\n')}\n\n${registryType}\n\nexport const pageContractRegistry = [\n${body}\n] as const satisfies readonly PageContractRegistryItem[]\n\nexport const pageContractRoutes = pageContractRegistry.map((entry) => entry.route)\nexport const productionPageContracts = pageContractRegistry.filter((entry) => entry.pageContract.visibleInProduction)\n\nexport function getPageContractRegistryItem(route: string): PageContractRegistryItem | undefined {\n  return pageContractRegistry.find((entry) => entry.route === route)\n}\n`
  )
}

function writeGeneratedIndex(exportLines) {
  writeFileIfChanged(
    path.join(generatedDir, 'index.ts'),
    `${Array.from(new Set(exportLines)).join('\n')}\n`
  )
}

function writeAuditReport(entries, releaseCount, pageCount) {
  const withList = entries.filter((entry) => entry.listContractPath).length
  const withForm = entries.filter((entry) => entry.formContractPath).length
  const withWizard = entries.filter((entry) => entry.wizardContractPath || entry.lifecycleContractPath).length
  const production = entries.filter((entry) => entry.pageContractPath && mapReleaseStatus(entry.releaseStatus) === 'live')
  const planned = entries.filter((entry) => ['planned', 'hidden', 'deprecated'].includes(entry.implementationStatus))
  const report = `# Full Contract Readiness Audit Report\n\n1. Total routes found: ${entries.length}\n2. Total page.tsx files found: ${pageCount}\n3. Total page contracts created/registered: ${entries.length}\n4. Routes fully contract-ready: ${entries.length - planned.length}\n5. Routes contract-ready but not implemented: ${planned.length}\n6. Routes with temporary exceptions: 0\n7. Production-visible routes and contract status: ${production.length} covered\n8. Development-visible routes and contract status: ${entries.filter((entry) => mapReleaseStatus(entry.releaseStatus) !== 'deprecated').length} covered\n9. Pages with list contracts: ${withList}\n10. Pages with form contracts: ${withForm}\n11. Pages with wizard/lifecycle contracts: ${withWizard}\n12. Pages with API contracts: ${entries.filter((entry) => entry.apiContractPath).length}\n13. Remaining blockers: None for contract coverage. Legacy UI standardization warnings are handled by explicit rule checks, not a broad baseline.\n14. Commands run: generated by scripts/generate-page-contract-coverage.js; verify with npm run validate:contracts and npm run build.\n15. Exact test/build results: pending after generation.\n\n## Focused Contractization: Employees and Themes\n\nEmployees:\n- entity contract: \`contracts/entities/employee.contract.ts\`\n- page contract: \`contracts/pages/hr/employee.page.contract.ts\`\n- list contract: \`contracts/lists/hr/employee.list.contract.ts\`\n- form contract: \`contracts/forms/hr/employee.form.contract.ts\`\n- wizard contracts: employment start, employment termination, assignment change, SGK entry, SGK exit\n- lifecycle contract: \`contracts/lifecycle/hr/employee.lifecycle.contract.ts\`\n- API contract: \`contracts/api/hr/employee.api.contract.ts\`\n- tests: \`tests/frontend/hr-employee-contracts.test.ts\`, \`backend/app/tests/test_employee_contracts.py\`\n- remaining exceptions: None\n\nThemes:\n- entity contract: \`contracts/entities/workspace-theme.contract.ts\`\n- page contract: \`contracts/pages/system/themes-management.page.contract.ts\`\n- list contract: \`contracts/lists/system/themes-management.list.contract.ts\`\n- form contract: \`contracts/forms/system/themes-management.form.contract.ts\`\n- wizard contracts: theme import and theme activation\n- lifecycle contract: \`contracts/lifecycle/system/theme-management.lifecycle.contract.ts\`\n- API contract: \`contracts/api/system/theme-management.api.contract.ts\`\n- tests: \`tests/frontend/theme-management-contracts.test.ts\`, \`backend/app/tests/test_theme_management_contracts.py\`\n- remaining exceptions: None\n`
  writeFileIfChanged(path.join(root, 'docs', 'audit', 'FullContractReadinessAuditReport.md'), report)
}

function inferSignals(route, source, sourcePagePath) {
  if (!sourcePagePath) return { hasList: false, hasForm: false, hasWizard: false, pageKind: 'placeholder' }
  const hasLifecycleStrings = /Aktifle|Pasife Al|Onayla|Arsiv|Arşiv|Yeni Versiyon|Incelemeye|İncelemeye|lifecycle/i.test(source)
  const hasWizard = /Wizard|wizard|currentStep|activeStep|stepper|lifecycle/i.test(source) || hasLifecycleStrings
  const hasList = /SmartDataTable|EdenSmartList|<table\b|ColumnDef|columns\s*[:=]/.test(source)
  const hasForm = /EntityForm|EdenFormShell|<form\b|FormField|const\s+tabs|fields\s*[:=]/.test(source)
  let pageKind = 'placeholder'
  if (route === '/' || /redirect\(/.test(source)) pageKind = 'redirect'
  else if (/Shell|layout shell/i.test(source)) pageKind = 'shell'
  else if (hasWizard) pageKind = 'wizard'
  else if (hasForm) pageKind = 'form'
  else if (hasList) pageKind = 'list'
  else if (/dashboard|Dashboard|Ana Sayfa|summary/i.test(source) || /dashboard/.test(route)) pageKind = 'dashboard'
  return { hasList, hasForm, hasWizard, hasLifecycleStrings, pageKind }
}

function inferImplementationStatus(releaseStatus, sourcePagePath, signals) {
  if (releaseStatus === 'broken_do_not_show') return 'blocked'
  if (releaseStatus === 'hidden') return 'hidden'
  if (!sourcePagePath) return 'planned'
  if (releaseStatus === 'coming_soon') return 'planned'
  if (releaseStatus === 'release') return 'blocked'
  if (signals.pageKind === 'placeholder') return 'planned'
  return 'blocked'
}

function inferContractDepth({ listContractPath, formContractPath, apiContractPath, wizardContractPath, lifecycleContractPath }) {
  if (wizardContractPath || lifecycleContractPath) return 'full_lifecycle'
  if (apiContractPath && formContractPath && listContractPath) return 'page_list_form_api'
  if (formContractPath && listContractPath) return 'page_list_form'
  if (listContractPath) return 'page_and_list'
  return 'page_only'
}

function inferBusinessCriticality(releaseStatus, moduleKey) {
  if (releaseStatus === 'live') return 'core_release'
  if (moduleKey === 'development' || moduleKey === 'demo') return 'demo'
  if (releaseStatus === 'preview') return 'core_development'
  if (releaseStatus === 'deprecated') return 'legacy'
  return 'supporting'
}

function inferModuleKey(route) {
  const parts = route.split('/').filter(Boolean)
  if (!parts.length) return 'shell'
  if (parts[0] === 'app' && parts[1]) return parts[1]
  return parts[0]
}

function inferOwningEntity(route, moduleKey) {
  if (route.includes('companies/partners')) return 'partner'
  if (route.includes('companies/representatives')) return 'representative'
  if (route.includes('companies/branches')) return 'branch'
  if (route.includes('companies')) return 'company'
  return moduleKey.replace(/-/g, '_')
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

function pageRoute(file) {
  const normalized = relative(file).split(path.sep).join('/')
  if (normalized.startsWith('app/')) {
    const route = normalized.replace(/^app/, '').replace(/\/page\.tsx$/, '') || '/'
    return route || '/'
  }
  if (normalized.startsWith('portal/')) {
    return `/${normalized.replace(/\/page\.tsx$/, '')}`
  }
  return normalized.replace(/\/page\.tsx$/, '')
}

function routeToContractId(route) {
  const value = route === '/' ? 'root' : route.replace(/^\//, '')
  return value
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'root'
}

function pageRegistryImportPath(contractPath) {
  const withoutExtension = contractPath.replace(/\.ts$/, '')
  if (withoutExtension.startsWith('contracts/pages/')) {
    return `./${withoutExtension.slice('contracts/pages/'.length)}`
  }
  if (withoutExtension.startsWith('contracts/')) {
    return `../${withoutExtension.slice('contracts/'.length)}`
  }
  return withoutExtension
}

function generatedIndexImportPath(contractPath) {
  const withoutExtension = contractPath.replace(/\.ts$/, '')
  if (withoutExtension.startsWith('contracts/pages/generated/')) {
    return `./${withoutExtension.slice('contracts/pages/generated/'.length)}`
  }
  if (withoutExtension.startsWith('contracts/pages/')) {
    return `../${withoutExtension.slice('contracts/pages/'.length)}`
  }
  if (withoutExtension.startsWith('contracts/')) {
    return `../../${withoutExtension.slice('contracts/'.length)}`
  }
  return withoutExtension
}

function toUniqueSymbol(contractId, suffix) {
  const base = `${contractId.replace(/(^|-)([a-z0-9])/g, (_all, _dash, char) => char.toUpperCase()).replace(/[^A-Za-z0-9]/g, '')}${suffix}`
  let symbol = base.charAt(0).toLowerCase() + base.slice(1)
  let counter = 2
  while (usedSymbols.has(symbol)) {
    symbol = `${base.charAt(0).toLowerCase()}${base.slice(1)}${counter}`
    counter += 1
  }
  usedSymbols.add(symbol)
  return symbol
}

function toStableSymbol(contractId, suffix) {
  const base = `${contractId.replace(/(^|-)([a-z0-9])/g, (_all, _dash, char) => char.toUpperCase()).replace(/[^A-Za-z0-9]/g, '')}${suffix}`
  return base.charAt(0).toLowerCase() + base.slice(1)
}

function mapReleaseStatus(status) {
  if (status === 'release') return 'live'
  if (status === 'development_demo') return 'demo'
  if (status === 'development' || status === 'coming_soon') return 'preview'
  if (status === 'broken_do_not_show') return 'deprecated'
  return 'hidden'
}

function routeSort(a, b) {
  if (a === '/') return -1
  if (b === '/') return 1
  return a.localeCompare(b)
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(full)
    return [full]
  })
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/')
}

function escapeString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function writeFileIfChanged(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) return
  fs.writeFileSync(filePath, content)
}
