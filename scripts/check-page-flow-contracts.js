const fs = require('fs')
const path = require('path')

const root = process.cwd()
const registryPath = path.join(root, 'contracts', 'page-flow-contracts.json')

const allowedOperationTypes = new Set(['CRUD', 'lifecycle', 'wizard', 'operation_request', 'report'])
const allowedStatuses = new Set(['development', 'preview', 'live', 'hidden'])
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
