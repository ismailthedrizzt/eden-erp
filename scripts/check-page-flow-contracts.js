const fs = require('fs')
const path = require('path')

const root = process.cwd()
const registryPath = path.join(root, 'contracts', 'page-flow-contracts.json')
const allowedOperationTypes = new Set(['CRUD', 'lifecycle', 'wizard', 'operation_request', 'report'])
const allowedStatuses = new Set(['development', 'preview', 'live', 'hidden'])
const requiredFlowFields = ['id', 'pageName', 'route', 'module', 'entity', 'operationType', 'backendEndpoints', 'bffRoutes', 'tables', 'frontendSchemas', 'backendSchemas', 'responseSchemas', 'generatedClient', 'serviceCommands', 'repositoryMethods', 'fieldContracts', 'risks', 'tests', 'status', 'requiredFixes']
const requiredRiskFields = ['dateTime', 'uuid', 'enum', 'rawDict']
const requiredTestFields = ['backend', 'frontend', 'e2e']
const placeholderPattern = /\b(required|todo|tbd|placeholder|future|should|still|manual|not yet|p0:|p1:|p2:)\b/i

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch (error) { throw new Error('Cannot read JSON ' + filePath + ': ' + error.message) }
}
function isNonEmptyArray(value) { return Array.isArray(value) && value.length > 0 }
function normalizeSlashes(value) { return String(value || '').replace(/\\/g, '/') }
function escapeRegex(text) {
  const specials = new Set(['\\', '^', String.fromCharCode(36), '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|'])
  return String(text || '').split('').map(ch => specials.has(ch) ? '\\' + ch : ch).join('')
}
function collectFiles(base, extensions, files = []) {
  if (!fs.existsSync(base)) return files
  const stat = fs.statSync(base)
  if (stat.isDirectory()) {
    if (['node_modules', '.next', '__pycache__', '.git'].includes(path.basename(base))) return files
    for (const child of fs.readdirSync(base)) collectFiles(path.join(base, child), extensions, files)
    return files
  }
  if (extensions.includes(path.extname(base))) files.push(base)
  return files
}
function buildSourceIndexes() {
  const backendClasses = new Map()
  for (const file of collectFiles(path.join(root, 'backend', 'app'), ['.py'])) {
    const relative = normalizeSlashes(path.relative(root, file))
    const content = fs.readFileSync(file, 'utf8')
    for (const match of content.matchAll(/^class\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm)) {
      if (!backendClasses.has(match[1])) backendClasses.set(match[1], [])
      backendClasses.get(match[1]).push(relative)
    }
  }
  const backendTests = new Map()
  for (const file of collectFiles(path.join(root, 'backend', 'app', 'tests'), ['.py'])) {
    const relative = normalizeSlashes(path.relative(root, file))
    const content = fs.readFileSync(file, 'utf8')
    for (const match of content.matchAll(/^def\s+(test_[A-Za-z0-9_]+)\b/gm)) backendTests.set(match[1], relative)
  }
  const generatedClientTypes = new Set()
  const generatedClientPath = path.join(root, 'lib', 'generated', 'backend-client', 'types.ts')
  if (fs.existsSync(generatedClientPath)) {
    const content = fs.readFileSync(generatedClientPath, 'utf8')
    for (const match of content.matchAll(/(?:export\s+)?(?:interface|type)\s+([A-Za-z_][A-Za-z0-9_]*)\b/g)) generatedClientTypes.add(match[1])
  }
  return { backendClasses, backendTests, generatedClientTypes }
}
function assertDocumentExists(errors, relativePath) {
  if (!relativePath) return
  if (!fs.existsSync(path.join(root, relativePath))) errors.push('Missing document: ' + relativePath)
}
function rejectPlaceholder(errors, label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '')
  if (!text || placeholderPattern.test(text)) errors.push(label + ': placeholder text is not a valid contract reference: ' + text)
}
function assertFileSymbolReference(errors, label, value) {
  rejectPlaceholder(errors, label, value)
  if (typeof value !== 'string' || !value.includes('#')) { errors.push(label + ': expected file#symbol reference'); return }
  const [relativePath, symbol] = value.split('#')
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath)) { errors.push(label + ': missing file ' + relativePath); return }
  const content = fs.readFileSync(fullPath, 'utf8')
  const symbolPattern = new RegExp('(?:export\\s+)?(?:const|function|class|type|interface)\\s+' + escapeRegex(symbol) + '\\b')
  if (!symbolPattern.test(content)) errors.push(label + ': symbol ' + symbol + ' not found in ' + relativePath)
}
function assertPythonClassReference(errors, label, value, indexes) {
  rejectPlaceholder(errors, label, value)
  const raw = String(value || '')
  const symbol = raw.includes('#') ? raw.split('#')[1] : raw
  if (!indexes.backendClasses.has(symbol)) errors.push(label + ': backend Pydantic/class reference not found: ' + raw)
}
function assertGeneratedClientReference(errors, label, value, indexes) {
  rejectPlaceholder(errors, label, value)
  if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push(label + ': generatedClient must be an object with openApiPath and operationId/type'); return }
  if (!value.openApiPath || typeof value.openApiPath !== 'string') errors.push(label + ': generatedClient.openApiPath is required')
  if (!value.operationId && !value.type) errors.push(label + ': generatedClient.operationId or generatedClient.type is required')
  if (value.type && !indexes.generatedClientTypes.has(value.type)) errors.push(label + ': generated client type not found: ' + value.type)
}
function assertTestReference(errors, label, value, kind, indexes) {
  rejectPlaceholder(errors, label, value)
  if (typeof value !== 'string' || !value.includes('#')) { errors.push(label + ': expected test file#symbol reference'); return }
  const [relativePath, symbol] = value.split('#')
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath)) { errors.push(label + ': missing test file ' + relativePath); return }
  const content = fs.readFileSync(fullPath, 'utf8')
  if (kind === 'backend') {
    if (!indexes.backendTests.has(symbol) && !new RegExp('def\\s+' + escapeRegex(symbol) + '\\b').test(content)) errors.push(label + ': backend test symbol not found: ' + symbol)
    return
  }
  if (!new RegExp('\\b' + escapeRegex(symbol) + '\\b').test(content)) errors.push(label + ': test symbol not found: ' + symbol)
}
function validateFlow(flow, index, seenIds, errors, warnings, indexes) {
  const label = flow && flow.id ? flow.id : 'flow[' + index + ']'
  for (const field of requiredFlowFields) if (!(field in flow)) errors.push(label + ': missing ' + field)
  if (!flow.id || typeof flow.id !== 'string') errors.push(label + ': id must be a string')
  if (seenIds.has(flow.id)) errors.push(label + ': duplicate id')
  seenIds.add(flow.id)
  if (!allowedOperationTypes.has(flow.operationType)) errors.push(label + ': invalid operationType ' + flow.operationType)
  if (!allowedStatuses.has(flow.status)) errors.push(label + ': invalid status ' + flow.status)
  for (const field of ['backendEndpoints', 'bffRoutes', 'tables', 'frontendSchemas', 'backendSchemas', 'responseSchemas', 'serviceCommands', 'repositoryMethods', 'requiredFixes']) {
    if (!isNonEmptyArray(flow[field])) errors.push(label + ': ' + field + ' must be a non-empty array')
    else flow[field].forEach((item, itemIndex) => rejectPlaceholder(errors, label + '.' + field + '[' + itemIndex + ']', item))
  }
  ;(flow.frontendSchemas || []).forEach((item, itemIndex) => assertFileSymbolReference(errors, label + '.frontendSchemas[' + itemIndex + ']', item))
  ;(flow.backendSchemas || []).forEach((item, itemIndex) => assertPythonClassReference(errors, label + '.backendSchemas[' + itemIndex + ']', item, indexes))
  ;(flow.responseSchemas || []).forEach((item, itemIndex) => assertPythonClassReference(errors, label + '.responseSchemas[' + itemIndex + ']', item, indexes))
  assertGeneratedClientReference(errors, label + '.generatedClient', flow.generatedClient, indexes)
  for (const field of requiredRiskFields) if (!flow.risks || typeof flow.risks[field] !== 'string' || !flow.risks[field].trim()) errors.push(label + ': risks.' + field + ' is required')
  for (const field of requiredTestFields) {
    if (!flow.tests || !Array.isArray(flow.tests[field])) errors.push(label + ': tests.' + field + ' must be an array')
    else if (flow.tests[field].length === 0) errors.push(label + ': tests.' + field + ' must list real test references')
    else flow.tests[field].forEach((item, itemIndex) => assertTestReference(errors, label + '.tests.' + field + '[' + itemIndex + ']', item, field, indexes))
  }
  const fieldContracts = flow.fieldContracts || {}
  const hasTypedFields = Object.values(fieldContracts).some(isNonEmptyArray)
  if (!hasTypedFields) errors.push(label + ': fieldContracts must define at least one typed field list')
  if (flow.operationType === 'operation_request') {
    const jsonbFields = fieldContracts.jsonb || []
    if (!jsonbFields.includes('payload_json')) warnings.push(label + ': operation_request should list payload_json in fieldContracts.jsonb')
  }
}
function main() {
  const errors = []
  const warnings = []
  const registry = readJson(registryPath)
  const indexes = buildSourceIndexes()
  if (registry.schemaVersion !== '1.0.0') errors.push('Unsupported schemaVersion: ' + registry.schemaVersion)
  if (!registry.documents) errors.push('Missing documents map')
  else for (const relativePath of Object.values(registry.documents)) assertDocumentExists(errors, relativePath)
  if (!registry.fieldNormalization) errors.push('Missing fieldNormalization')
  if (!Array.isArray(registry.flows) || registry.flows.length === 0) errors.push('Registry must contain at least one flow')
  else { const seenIds = new Set(); registry.flows.forEach((flow, index) => validateFlow(flow, index, seenIds, errors, warnings, indexes)) }
  for (const warning of warnings) console.warn('Page flow contract warning: ' + warning)
  if (errors.length > 0) { for (const error of errors) console.error('Page flow contract error: ' + error); process.exit(1) }
  console.log('Page flow contract check passed (' + registry.flows.length + ' flows).')
}
main()
