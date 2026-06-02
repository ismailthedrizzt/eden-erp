const fs = require('fs')
const path = require('path')

const root = process.cwd()
const failOnDirectDb = process.argv.includes('--fail-on-direct-db')

const API_DIR = path.join(root, 'app', 'api')
const SERVER_LIB_DIRS = [
  path.join(root, 'lib'),
  path.join(root, 'app', 'api'),
]

const routeFiles = collectFiles(API_DIR, file => /route\.(ts|tsx|js|jsx)$/.test(file))
const allServerFiles = SERVER_LIB_DIRS.flatMap(dir => collectFiles(dir, file => /\.(ts|tsx|js|jsx)$/.test(file)))

const directSupabaseImport = /@\/lib\/supabase\/(server|client)|from ['"]@supabase\/|createServerClient|createBrowserClient/
const directDbOperation = /\.(from|rpc)\s*\(/
const fastApiProxy = /proxyToFastApi|proxyJsonToFastApi|proxyToFastApi[A-Z]/
const allowedSupabaseFiles = new Set([
  normalize('lib/supabase/server.ts'),
  normalize('lib/supabase/client.ts'),
])

const apiRows = routeFiles.map(file => classify(file))
const serverRows = allServerFiles
  .map(file => classify(file))
  .filter(row => row.directSupabaseImport || row.directDbOperation)
  .filter(row => !allowedSupabaseFiles.has(row.relative))

const summary = {
  apiRouteFiles: routeFiles.length,
  apiFastApiProxyRoutes: apiRows.filter(row => row.fastApiProxy).length,
  apiDirectDbRoutes: apiRows.filter(row => row.directSupabaseImport || row.directDbOperation).length,
  serverDirectDbFiles: serverRows.length,
}

console.log('Next/FastAPI backend boundary audit')
console.log(`- app/api route files: ${summary.apiRouteFiles}`)
console.log(`- FastAPI proxy route files: ${summary.apiFastApiProxyRoutes}`)
console.log(`- app/api files with direct DB/Supabase access: ${summary.apiDirectDbRoutes}`)
console.log(`- server TS files with direct DB/Supabase access: ${summary.serverDirectDbFiles}`)

const directApiRows = apiRows.filter(row => row.directSupabaseImport || row.directDbOperation)
if (directApiRows.length) {
  console.log('\nDirect DB/Supabase app/api files:')
  for (const row of directApiRows.slice(0, 120)) {
    console.log(`- ${row.relative}`)
  }
  if (directApiRows.length > 120) {
    console.log(`- ... ${directApiRows.length - 120} more`)
  }
}

if (failOnDirectDb && directApiRows.length) {
  console.error('\nFAIL: Next API still contains direct DB/Supabase access. Route data operations must move to FastAPI.')
  process.exit(1)
}

function classify(file) {
  const content = fs.readFileSync(file, 'utf8')
  return {
    file,
    relative: normalize(path.relative(root, file)),
    fastApiProxy: fastApiProxy.test(content),
    directSupabaseImport: directSupabaseImport.test(content),
    directDbOperation: directDbOperation.test(content),
  }
}

function collectFiles(dir, predicate) {
  const files = []
  walk(dir, files, predicate)
  return files
}

function walk(current, files, predicate) {
  if (!fs.existsSync(current)) return
  const stat = fs.statSync(current)
  if (stat.isDirectory()) {
    const name = path.basename(current)
    if (['node_modules', '.next', '.git'].includes(name)) return
    for (const child of fs.readdirSync(current)) walk(path.join(current, child), files, predicate)
    return
  }
  if (predicate(current)) files.push(current)
}

function normalize(value) {
  return value.replace(/\\/g, '/')
}
