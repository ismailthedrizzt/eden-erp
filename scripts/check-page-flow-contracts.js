const fs = require('fs')
const path = require('path')

const root = process.cwd()
const registryPath = path.join(root, 'contracts', 'page-flow-contracts.json')

const allowedOperationTypes = new Set(['CRUD', 'lifecycle', 'wizard', 'operation_request', 'report'])
const allowedStatuses = new Set(['development', 'preview', 'live', 'hidden'])
const placeholderPattern = /\b(required|todo|tbd|placeholder|future|should|still|manual|not yet|p[0-2]:)\b/i
const requiredFlowFields = [
  'id',
  'pageName',
  'route',
  'module',
  'entity',
  'operationType',
  'backendEndpoints',
  'bffRoutes',
  'tables',
  'frontendSchemas',
  'backendSchemas',
  'responseSchemas',
  'generatedClient',
  'serviceCommands',
  'repositoryMethods',
  'fieldContracts',
  'risks',
  'tests',
  'status',
  'requiredFixes',
]

const requiredRiskFields = ['dateTime', 'uuid', 'enum', 'rawDict']
const requiredTestFields = ['backend', 'frontend', 'e2e']
const sourceIndexes = buildSourceIndexes()

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot read JSON ${filePath}: ${error.message}`)
  }
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0
}

function assertDocumentExists(errors, relativePath) {
  if (!relativePath) return
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath)) errors.push(`Missing document: ${relativePath}`)
}

function splitReference(reference) {
  const [filePath, symbol] = String(reference).split('#')
  return { filePath, symbol }
}

function isFileReference(reference) {
  return /[/.\\]/.test(String(reference))
}

function assertNoPlaceholder(errors, label, field, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (placeholderPattern.test(text)) errors.push(`${label}: ${field} contains placeholder text: ${text}`)
}

function assertFileSymbolReference(errors, label, field, reference) {
  assertNoPlaceholder(errors, label, field, reference)
  if (!isFileReference(reference)) {
    errors.push(`${label}: ${field} must reference a real file path, optionally with #symbol: ${reference}`)
    return
  }
  const { filePath, symbol } = splitReference(reference)
  const absolute = path.join(root, filePath)
  if (!fs.existsSync(absolute)) {
    errors.push(`${label}: ${field} file does not exist: ${filePath}`)
    return
  }
  if (symbol) {
    const content = fs.readFileSync(absolute, 'utf8')
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(`\\b${escaped}\\b`).test(content)) {
      errors.push(`${label}: ${field} symbol ${symbol} not found in ${filePath}`)
    }
  }
}

function assertPythonClassReference(errors, label, field, className) {
  assertNoPlaceholder(errors, label, field, className)
  if (!/^[A-Z][A-Za-z0-9_]*(\[[A-Za-z0-9_, .[\]]+\])?$/.test(className)) {
    errors.push(`${label}: ${field} must be a Pydantic/response class name, got: ${className}`)
    return
  }
  const baseName = className.replace(/\[.*$/, '')
  if (!sourceIndexes.pythonClasses.has(baseName)) {
    errors.push(`${label}: ${field} class not found in backend/app: ${className}`)
  }
}

function assertTestReference(errors, label, field, reference) {
  assertNoPlaceholder(errors, label, field, reference)
  if (isFileReference(reference)) {
    assertFileSymbolReference(errors, label, field, reference)
    return
  }
  if (!/^test_[A-Za-z0-9_]+$/.test(reference)) {
    errors.push(`${label}: ${field} must be a test file#symbol or test function name, got: ${reference}`)
    return
  }
  if (!sourceIndexes.testSymbols.has(reference)) {
    errors.push(`${label}: ${field} test function not found: ${reference}`)
  }
}

function assertGeneratedClientReference(errors, label, value) {
  const field = 'generatedClient'
  assertNoPlaceholder(errors, label, field, value)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label}: generatedClient must be an object with openApiPath and operationId/type`)
    return
  }
  if (!value.openApiPath || !String(value.openApiPath).startsWith('/api/v1/')) {
    errors.push(`${label}: generatedClient.openApiPath must reference a FastAPI path`)
  }
  if (!value.operationId && !value.type) {
    errors.push(`${label}: generatedClient must include operationId or type`)
  }
  const generatedClientPath = path.join(root, 'lib/generated/backend-client/types.ts')
  if (!fs.existsSync(generatedClientPath)) {
    errors.push(`${label}: generated backend client file is missing`)
    return
  }
  const client = fs.readFileSync(generatedClientPath, 'utf8')
  if (value.openApiPath && !client.includes(`"${value.openApiPath}"`)) {
    errors.push(`${label}: generatedClient.openApiPath not found in generated types: ${value.openApiPath}`)
  }
  if (value.operationId && !client.includes(String(value.operationId))) {
    errors.push(`${label}: generatedClient.operationId not found in generated types: ${value.operationId}`)
  }
  if (value.type && !client.includes(String(value.type))) {
    errors.push(`${label}: generatedClient.type not found in generated types: ${value.type}`)
  }
}

function validateFlow(flow, index, seenIds, errors, warnings) {
  const label = flow && flow.id ? flow.id : `flow[${index}]`
  for (const field of requiredFlowFields) {
    if (!(field in flow)) errors.push(`${label}: missing ${field}`)
  }
  if (!flow.id || typeof flow.id !== 'string') errors.push(`${label}: id must be a string`)
  if (seenIds.has(flow.id)) errors.push(`${label}: duplicate id`)
  seenIds.add(flow.id)

  if (!allowedOperationTypes.has(flow.operationType)) {
    errors.push(`${label}: invalid operationType ${flow.operationType}`)
  }
  if (!allowedStatuses.has(flow.status)) {
    errors.push(`${label}: invalid status ${flow.status}`)
  }

  for (const field of [
    'backendEndpoints',
    'bffRoutes',
    'tables',
    'frontendSchemas',
    'backendSchemas',
    'responseSchemas',
    'serviceCommands',
    'repositoryMethods',
    'requiredFixes',
  ]) {
    if (!isNonEmptyArray(flow[field])) errors.push(`${label}: ${field} must be a non-empty array`)
  }

  for (const field of ['frontendSchemas']) {
    for (const reference of flow[field] || []) {
      assertFileSymbolReference(errors, label, field, reference)
    }
  }

  for (const field of ['backendSchemas', 'responseSchemas']) {
    for (const reference of flow[field] || []) {
      assertPythonClassReference(errors, label, field, reference)
    }
  }

  assertGeneratedClientReference(errors, label, flow.generatedClient)

  for (const field of requiredRiskFields) {
    if (!flow.risks || typeof flow.risks[field] !== 'string' || !flow.risks[field].trim()) {
      errors.push(`${label}: risks.${field} is required`)
    }
  }

  for (const field of requiredTestFields) {
    if (!flow.tests || !Array.isArray(flow.tests[field])) {
      errors.push(`${label}: tests.${field} must be an array`)
    } else if (flow.status === 'live' && flow.tests[field].length === 0) {
      warnings.push(`${label}: live flow has no ${field} tests listed`)
    } else {
      for (const reference of flow.tests[field]) assertTestReference(errors, label, `tests.${field}`, reference)
    }
  }

  const fieldContracts = flow.fieldContracts || {}
  const hasTypedFields = Object.values(fieldContracts).some(isNonEmptyArray)
  if (!hasTypedFields) errors.push(`${label}: fieldContracts must define at least one typed field list`)

  if (flow.operationType === 'operation_request') {
    const jsonbFields = fieldContracts.jsonb || []
    if (!jsonbFields.includes('payload_json')) {
      warnings.push(`${label}: operation_request should list payload_json in fieldContracts.jsonb`)
    }
  }
}

function buildSourceIndexes() {
  const pythonClasses = new Set()
  const testSymbols = new Set()

  for (const file of collectFiles(path.join(root, 'backend', 'app'), ['.py'])) {
    const content = fs.readFileSync(file, 'utf8')
    for (const match of content.matchAll(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/gm)) {
      pythonClasses.add(match[1])
    }
    if (file.includes(`${path.sep}tests${path.sep}`)) {
      for (const match of content.matchAll(/^def\s+(test_[A-Za-z0-9_]+)/gm)) {
        testSymbols.add(match[1])
      }
      for (const match of content.matchAll(/^async\s+def\s+(test_[A-Za-z0-9_]+)/gm)) {
        testSymbols.add(match[1])
      }
    }
  }

  return { pythonClasses, testSymbols }
}

function collectFiles(current, extensions, files = []) {
  if (!fs.existsSync(current)) return files
  const stat = fs.statSync(current)
  if (stat.isDirectory()) {
    if (['node_modules', '.next', '__pycache__', '.venv'].includes(path.basename(current))) return files
    for (const child of fs.readdirSync(current)) collectFiles(path.join(current, child), extensions, files)
    return files
  }
  if (extensions.includes(path.extname(current))) files.push(current)
  return files
}

function main() {
  const errors = []
  const warnings = []
  const registry = readJson(registryPath)

  if (registry.schemaVersion !== '1.0.0') {
    errors.push(`Unsupported schemaVersion: ${registry.schemaVersion}`)
  }
  if (!registry.documents) {
    errors.push('Missing documents map')
  } else {
    for (const relativePath of Object.values(registry.documents)) {
      assertDocumentExists(errors, relativePath)
    }
  }
  if (!registry.fieldNormalization) {
    errors.push('Missing fieldNormalization')
  }
  if (!Array.isArray(registry.flows) || registry.flows.length === 0) {
    errors.push('Registry must contain at least one flow')
  } else {
    const seenIds = new Set()
    registry.flows.forEach((flow, index) => validateFlow(flow, index, seenIds, errors, warnings))
  }

  for (const warning of warnings) console.warn(`Page flow contract warning: ${warning}`)

  if (errors.length > 0) {
    for (const error of errors) console.error(`Page flow contract error: ${error}`)
    process.exit(1)
  }

  console.log(`Page flow contract check passed (${registry.flows.length} flows).`)
}

main()
