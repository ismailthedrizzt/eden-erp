const fs = require('fs')
const path = require('path')

const root = process.cwd()
const errors = []
const warnings = []

const apiContractFiles = walk(path.join(root, 'contracts', 'api')).filter(file => file.endsWith('.contract.ts'))
const backendApiFiles = walk(path.join(root, 'backend', 'app', 'api', 'v1')).filter(file => file.endsWith('.py'))
const nextRouteFiles = walk(path.join(root, 'app', 'api')).filter(file => file.endsWith('route.ts'))
const serviceFiles = walk(path.join(root, 'lib', 'services')).filter(file => file.endsWith('.ts'))
const permissionAliases = parsePermissionAliases(readOptional('contracts/security/permission-aliases.contract.ts'))
const backendRouterPrefixes = parseBackendRouterPrefixes(readOptional('backend/app/api/v1/router.py'))
validatePermissionAliases()

for (const file of apiContractFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const contracts = parseApiContracts(source, relative(file))
  for (const contract of contracts) validateApiContract(contract, file, source)
}

console.log('Backend contract drift guard')
console.log(`- API contract files: ${apiContractFiles.length}`)
console.log(`- backend API files: ${backendApiFiles.length}`)
console.log(`- Next BFF route files: ${nextRouteFiles.length}`)
console.log(`- frontend service files: ${serviceFiles.length}`)
console.log(`- warnings: ${warnings.length}`)
console.log(`- errors: ${errors.length}`)

for (const warning of warnings.slice(0, 60)) console.warn(`WARNING ${warning}`)
if (warnings.length > 60) console.warn(`WARNING ... ${warnings.length - 60} additional warnings omitted`)
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exit(1)
}

function validateApiContract(contract, file, source) {
  const contractLabel = `${relative(file)}:${contract.id || contract.serviceFunction || contract.fastApiPath || contract.endpointPath || '<unknown>'}`
  if (!contract.method) errors.push(`${contractLabel}: missing method`)
  if (!contract.serviceFunction) errors.push(`${contractLabel}: missing serviceFunction`)

  const hasNewPathModel = contract.frontendPath && contract.bffPath && contract.fastApiPath
  const isCritical = /employee|theme|company|partner|representative|branch/i.test(relative(file))
  if (isCritical && !hasNewPathModel) {
    errors.push(`${contractLabel}: critical API contract must include frontendPath, bffPath and fastApiPath; endpointPath is not enough`)
  }

  const fastApiPath = contract.fastApiPath || contract.endpointPath
  if (fastApiPath && !backendRouteExists(fastApiPath, contract.method)) {
    errors.push(`${contractLabel}: FastAPI route not found for ${contract.method} ${fastApiPath}`)
  }
  if (contract.bffPath && !nextBffRouteExists(contract.bffPath, contract.method)) {
    errors.push(`${contractLabel}: Next BFF route not found for ${contract.method} ${contract.bffPath}`)
  }
  if (contract.frontendPath && contract.serviceFunction && !isCacheInvalidation(contract.serviceFunction) && !serviceCallPathExists(contract.serviceFunction, contract.frontendPath)) {
    errors.push(`${contractLabel}: serviceFunction does not call frontendPath ${contract.frontendPath}`)
  }
  if (contract.bffPath && fastApiPath && !bffProxiesToFastApi(contract.bffPath, fastApiPath)) {
    errors.push(`${contractLabel}: BFF route does not visibly proxy to ${fastApiPath}`)
  }

  const backendRoute = findBackendRoute(fastApiPath, contract.method)
  if (backendRoute) {
    const permission = firstPermission(contract.backendAuthorization || contract.authorization)
    if (permission && !backendHasPermission(backendRoute.block, permission)) {
      errors.push(`${contractLabel}: backend permission drift. Expected ensure_permission(context, "${permission}")`)
    }
    const backendRequestSchema = contract.backendRequestSchema
    if (backendRequestSchema && !backendRoute.block.includes(backendRequestSchema)) {
      errors.push(`${contractLabel}: backend route does not use expected request schema ${backendRequestSchema}`)
    }
    const backendResponseSchema = contract.backendResponseSchema
    if (backendResponseSchema && !backendRoute.decorator.includes(backendResponseSchema)) {
      errors.push(`${contractLabel}: backend route does not declare expected response schema ${backendResponseSchema}`)
    }
    if (/response_model\s*=\s*ApiSuccess\[(dict\[str,\s*Any\]|dict|Any)\]/.test(backendRoute.decorator) && isCritical) {
      errors.push(`${contractLabel}: critical endpoint uses generic response schema instead of typed business DTO (${relative(backendRoute.file)})`)
    }
  }

  const schemaNames = unique(Array.from(source.matchAll(/backendRequestSchema:\s*['"]([^'"]+)['"]/g)).map(match => match[1]))
  for (const schemaName of schemaNames) validateNoExtraAllow(schemaName, contractLabel)
}

function backendRouteExists(apiPath, method) {
  return !!findBackendRoute(apiPath, method)
}

function findBackendRoute(apiPath, method) {
  if (!apiPath || !method) return null
  const normalized = normalizeApiPath(apiPath).replace(/^\/api\/v1/, '')
  const routerMethod = method.toLowerCase()
  for (const file of backendApiFiles) {
    const source = fs.readFileSync(file, 'utf8')
    const routeRegex = new RegExp(`@router\\.${routerMethod}\\(\\s*["']([^"']*)["'][^\\n]*\\)`, 'g')
    let match
    while ((match = routeRegex.exec(source))) {
      const prefix = backendRouterPrefixes.get(path.basename(file, '.py')) || ''
      const candidate = normalizeApiPath(`${prefix}/${match[1]}`.replace(/\/+/g, '/'))
      if (candidate === normalized || pathMatches(candidate, normalized)) {
        const start = match.index
        const nextDecorator = source.indexOf('\n@router.', start + 1)
        const block = source.slice(start, nextDecorator === -1 ? source.length : nextDecorator)
        const decoratorLine = source.slice(start, source.indexOf('\n', start))
        return { file, block, decorator: decoratorLine }
      }
    }
  }
  return null
}

function nextBffRouteExists(bffPath) {
  const routePath = path.join(root, 'app', ...bffPath.replace(/^\/api\/?/, '').split('/'), 'route.ts')
  if (fs.existsSync(routePath)) return true
  return Boolean(findNextBffRoute(bffPath))
}

function bffProxiesToFastApi(bffPath, fastApiPath) {
  const route = findNextBffRoute(bffPath)
  if (!route) return false
  const source = fs.readFileSync(route, 'utf8')
  return sourceContainsApiPath(source, fastApiPath)
}

function findNextBffRoute(bffPath) {
  return nextRouteFiles
    .filter(file => pathMatches(routeFileToApiPath(file), bffPath))
    .sort((left, right) => routeSpecificity(routeFileToApiPath(right)) - routeSpecificity(routeFileToApiPath(left)))[0]
}

function routeSpecificity(routePath) {
  const normalized = normalizeApiPath(routePath)
  return normalized.split('/').filter(Boolean).length * 10
    - (normalized.match(/\{\*/g) || []).length * 5
    - (normalized.match(/\{/g) || []).length
}

function serviceCallPathExists(serviceFunction, frontendPath) {
  const [, fn] = serviceFunction.split('.')
  if (!fn) return false
  return serviceFiles.some(file => {
    const source = fs.readFileSync(file, 'utf8')
    return source.includes(`${fn}(`) && sourceContainsApiPath(source, frontendPath)
  })
}

function isCacheInvalidation(serviceFunction) {
  return /\.invalidate[A-Za-z0-9_]*$/.test(serviceFunction)
}

function validateNoExtraAllow(schemaName, label) {
  const backendFiles = walk(path.join(root, 'backend', 'app')).filter(file => file.endsWith('.py'))
  for (const file of backendFiles) {
    const source = fs.readFileSync(file, 'utf8')
    const classMatch = source.match(new RegExp(`class\\s+${escapeRegExp(schemaName)}\\([^)]*BaseModel[^)]*\\):([\\s\\S]*?)(?=\\nclass\\s|\\n\\S|$)`))
    if (classMatch && /ConfigDict\(\s*extra\s*=\s*["']allow["']/.test(classMatch[1])) {
      errors.push(`${label}: backend schema ${schemaName} uses uncontrolled extra="allow" (${relative(file)})`)
    }
  }
}

function parseApiContracts(source, fileName) {
  const blocks = extractApiContractBlocks(source)
  return blocks.map(block => ({
    id: field(block, 'id'),
    method: field(block, 'method'),
    serviceFunction: field(block, 'serviceFunction'),
    endpointPath: field(block, 'endpointPath'),
    frontendPath: field(block, 'frontendPath'),
    bffPath: field(block, 'bffPath') || field(block, 'frontendRoute'),
    fastApiPath: field(block, 'fastApiPath') || field(block, 'endpointPath'),
    backendRequestSchema: field(block, 'backendRequestSchema'),
    backendResponseSchema: field(block, 'backendResponseSchema'),
    authorization: arrayField(block, 'authorization'),
    backendAuthorization: arrayField(block, 'backendAuthorization'),
    fileName,
  }))
}

function extractApiContractBlocks(source) {
  const blocks = []
  const declarationRegex = /export\s+const\s+\w*ApiContracts\b[^=]*=\s*\[/g
  let declaration
  while ((declaration = declarationRegex.exec(source))) {
    const arrayStart = source.indexOf('[', declaration.index)
    if (arrayStart === -1) continue
    const arrayEnd = findMatchingDelimiter(source, arrayStart, '[', ']')
    if (arrayEnd === -1) continue
    blocks.push(...extractTopLevelObjectBlocks(source.slice(arrayStart + 1, arrayEnd)))
  }
  return blocks
}

function extractTopLevelObjectBlocks(source) {
  const blocks = []
  let blockStart = -1
  let depth = 0
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const skippedTo = skipStringOrComment(source, index)
    if (skippedTo !== index) {
      index = skippedTo
      continue
    }
    if (char === '{') {
      if (depth === 0) blockStart = index
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0 && blockStart !== -1) {
        blocks.push(source.slice(blockStart, index + 1))
        blockStart = -1
      }
    }
  }
  return blocks.filter(block => /\bid\s*:/.test(block) && /\bmethod\s*:/.test(block))
}

function findMatchingDelimiter(source, start, open, close) {
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    const skippedTo = skipStringOrComment(source, index)
    if (skippedTo !== index) {
      index = skippedTo
      continue
    }
    if (char === open) depth += 1
    if (char === close) {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function skipStringOrComment(source, index) {
  const char = source[index]
  const next = source[index + 1]
  if (char === '/' && next === '/') {
    const newline = source.indexOf('\n', index + 2)
    return newline === -1 ? source.length - 1 : newline
  }
  if (char === '/' && next === '*') {
    const end = source.indexOf('*/', index + 2)
    return end === -1 ? source.length - 1 : end + 1
  }
  if (char !== "'" && char !== '"' && char !== '`') return index
  const quote = char
  for (let cursor = index + 1; cursor < source.length; cursor += 1) {
    if (source[cursor] === '\\') {
      cursor += 1
      continue
    }
    if (source[cursor] === quote) return cursor
  }
  return source.length - 1
}

function sourceContainsApiPath(source, apiPath) {
  if (!apiPath) return false
  if (source.includes(apiPath)) return true
  const normalized = normalizeApiPath(apiPath)
  const staticPrefix = normalized.split('{')[0].replace(/\/$/, '')
  if (staticPrefix.length > '/api/v1'.length && source.includes(staticPrefix)) return true
  const pattern = escapeRegExp(normalized)
    .replace(/\\\{[^}]+\\\}/g, '[^`\'"\\s/]+')
    .replace(/\\\$/g, '\\$')
  const apiPathRegex = new RegExp(pattern)
  return apiPathRegex.test(source)
}

function routeFileToApiPath(file) {
  const normalized = relative(file)
  return '/' + normalized
    .replace(/^app\/api/, 'api')
    .replace(/\/route\.ts$/, '')
    .replace(/\[\.\.\.([^\]]+)\]/g, '{*$1}')
    .replace(/\[([^\]]+)\]/g, '{$1}')
}

function normalizeApiPath(value) {
  const normalized = '/' + String(value || '').replace(/^\/+/, '').replace(/\[([^\]]+)\]/g, '{$1}')
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

function pathMatches(candidate, expected) {
  if (/\{\*[^}]+\}/.test(candidate)) {
    const prefix = normalizeApiPath(candidate).replace(/\/\{\*[^}]+\}$/, '')
    return normalizeApiPath(expected).startsWith(prefix)
  }
  if (apiPathRegex(candidate).test(normalizeApiPath(expected))) return true
  const c = normalizeApiPath(candidate).replace(/\{[^}]+\}/g, '{}')
  const e = normalizeApiPath(expected).replace(/\{[^}]+\}/g, '{}')
  return c === e
}

function apiPathRegex(value) {
  const pattern = '^' + escapeRegExp(normalizeApiPath(value))
    .replace(/\\\{\*[^}]+\\\}/g, '.*')
    .replace(/\\\{[^}]+\\\}/g, '[^/]+') + '$'
  return new RegExp(pattern)
}

function firstPermission(values) {
  return Array.isArray(values) && values.length ? values[0] : ''
}

function backendHasPermission(block, permission) {
  if (block.includes(`ensure_permission(context, "${permission}")`) || block.includes(`ensure_permission(context, '${permission}')`)) return true
  return permissionAliases
    .filter(alias => alias.canonicalPermission === permission)
    .some(alias => block.includes(`ensure_permission(context, "${alias.legacyPermission}")`) || block.includes(`ensure_permission(context, '${alias.legacyPermission}')`))
}

function parsePermissionAliases(source) {
  const bodyMatch = source.match(/export const permissionAliases[^=]*=\s*\[([\s\S]*?)\]/)
  const blocks = bodyMatch ? (bodyMatch[1].match(/\{[\s\S]*?\}/g) || []) : []
  return blocks
    .filter(block => block.includes('canonicalPermission') && block.includes('legacyPermission') && block.includes('owner'))
    .map(block => ({
      canonicalPermission: field(block, 'canonicalPermission'),
      legacyPermission: field(block, 'legacyPermission'),
      owner: field(block, 'owner'),
      expiresAt: field(block, 'expiresAt'),
      removalPlan: field(block, 'removalPlan'),
    }))
}

function parseBackendRouterPrefixes(source) {
  const prefixes = new Map()
  const includeRegex = /api_router\.include_router\(\s*([a-zA-Z_][\w]*)\.router\s*,([\s\S]*?)\)/g
  let match
  while ((match = includeRegex.exec(source))) {
    const moduleName = match[1]
    const prefix = pythonKeywordField(match[2], 'prefix') || ''
    prefixes.set(moduleName, prefix)
  }
  return prefixes
}

function pythonKeywordField(source, name) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*['"]([^'"]*)['"]`))
  return match ? match[1] : undefined
}

function validatePermissionAliases() {
  for (const alias of permissionAliases) {
    for (const key of ['canonicalPermission', 'legacyPermission', 'owner', 'expiresAt', 'removalPlan']) {
      if (!alias[key]) errors.push(`Permission alias missing ${key}: ${JSON.stringify(alias)}`)
    }
    if (alias.expiresAt && new Date(alias.expiresAt) < new Date()) {
      errors.push(`Permission alias expired: ${alias.canonicalPermission} -> ${alias.legacyPermission}`)
    }
  }
}

function field(source, name) {
  const match = source.match(new RegExp(`${name}:\\s*['"]([^'"]*)['"]`))
  return match ? match[1] : undefined
}

function arrayField(source, name) {
  const match = source.match(new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`))
  if (!match) return []
  return Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g)).map(item => item[1])
}

function readOptional(relativePath) {
  const fullPath = path.join(root, relativePath)
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : ''
}

function readDirFiles(directory) {
  return fs.existsSync(directory) ? fs.readdirSync(directory) : []
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return [fullPath]
  })
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
