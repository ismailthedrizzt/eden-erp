const autocannon = require('autocannon')

const args = parseArgs(process.argv.slice(2))
const baseUrl = normalizeBaseUrl(args.baseUrl || process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000')
const duration = Number(args.duration || process.env.LOAD_TEST_DURATION || 20)
const connections = Number(args.connections || process.env.LOAD_TEST_CONNECTIONS || 20)
const pipelining = Number(args.pipelining || process.env.LOAD_TEST_PIPELINING || 1)
const authToken = process.env.LOAD_TEST_AUTH_TOKEN || ''
const cookie = process.env.LOAD_TEST_COOKIE || ''
const tenantId = args.tenantId || process.env.LOAD_TEST_TENANT_ID || ''
const companyId = args.companyId || process.env.LOAD_TEST_COMPANY_ID || ''
const branchId = args.branchId || process.env.LOAD_TEST_BRANCH_ID || ''
const selectedScenario = args.scenario || process.env.LOAD_TEST_SCENARIO || 'platform-smoke'

const scenarioContext = { companyId, branchId }

const scenarios = [
  scenario('company-list', '/api/companies?page=1&pageSize=50&sort=trade_name&direction=asc', 500),
  scenario('company-detail', ctx => `/api/companies/${ctx.companyId}`, 700, { requires: ['companyId'] }),
  scenario('branch-list', '/api/companies/branches?page=1&pageSize=50&sort=branch_name&direction=asc', 500),
  scenario('partner-list', '/api/companies/partners?page=1&pageSize=50&sort=display_name&direction=asc', 500),
  scenario('representative-list', '/api/companies/representatives?page=1&pageSize=50&sort=display_name&direction=asc', 500),
  scenario('current-ownership', ctx => `/api/companies/${ctx.companyId}/current-ownership`, 500, { requires: ['companyId'] }),
  scenario('action-center-counts', '/api/action-center/counts', 700),
  scenario('audit-list', '/api/audit?page=1&pageSize=50', 700),
  scenario('branch-opening-precheck', ctx => `/api/companies/${ctx.companyId}/official-changes/branch-opening/precheck`, 800, { requires: ['companyId'] }),
  scenario('capital-increase-precheck', ctx => `/api/companies/${ctx.companyId}/capital-increases/precheck`, 800, { requires: ['companyId'] }),
  scenario('action-guide', '/api/ai/action-guide', 500, {
    method: 'POST',
    body: { query: 'sube acilisi', companyId: companyId || null, branchId: branchId || null },
  }),
  scenario('representative-authority-eligibility', '/api/policy/action-eligibility', 700, {
    method: 'POST',
    body: {
      action_key: 'representatives.authorityStart',
      module_key: 'representatives',
      resource: { company_id: companyId || null, branch_id: branchId || null },
    },
  }),
]

const scenarioGroups = {
  'platform-smoke': [
    'company-list',
    'branch-list',
    'partner-list',
    'representative-list',
    'action-center-counts',
    'audit-list',
  ],
  'company-list': ['company-list'],
  all: scenarios.map(item => item.name),
}

async function main() {
  if (args.list === 'true' || args.list === true) {
    printScenarioList()
    return
  }
  assertSafeTarget(baseUrl)
  const selected = selectScenarios(selectedScenario)
  const { runnable, skipped } = splitRunnableScenarios(selected, scenarioContext)

  console.log(`Load test target: ${baseUrl}`)
  console.log(`Scenario: ${selectedScenario}`)
  console.log(`Connections: ${connections}, duration: ${duration}s, pipelining: ${pipelining}`)
  console.log(`Cookie: ${cookie ? 'set' : 'not set'}, auth token: ${authToken ? 'set' : 'not set'}, tenant: ${tenantId ? 'set' : 'not set'}`)
  if (skipped.length) {
    console.log(`Skipped scenarios: ${skipped.map(item => `${item.name} (${item.missing.join(',')})`).join('; ')}`)
  }
  if (!runnable.length) {
    throw new Error(`No runnable scenarios for "${selectedScenario}". Set required LOAD_TEST_* ids or choose another scenario.`)
  }

  const results = []
  for (const scenarioConfig of runnable) {
    await warmupScenario(scenarioConfig)
    const result = await runScenario(scenarioConfig)
    results.push(result)
    printScenario(result)
  }

  const failures = results.filter(result => !result.ok)
  if (failures.length) {
    console.error('\nLoad test failed:')
    for (const failure of failures) {
      for (const reason of failure.failures) console.error(`- ${failure.name}: ${reason}`)
    }
    process.exit(1)
  }

  console.log('\nLoad test passed.')
}

function scenario(name, path, p97_5, options = {}) {
  return {
    name,
    path,
    method: options.method || 'GET',
    body: options.body,
    requires: options.requires || [],
    thresholds: { p97_5, non2xx: options.non2xx ?? 0 },
  }
}

function selectScenarios(name) {
  const selectedNames = scenarioGroups[name] || [name]
  const selected = selectedNames
    .map(item => scenarios.find(candidate => candidate.name === item))
    .filter(Boolean)
  if (!selected.length) {
    throw new Error(`Unknown load test scenario "${name}". Use --list=true to see valid names.`)
  }
  return selected
}

function splitRunnableScenarios(selected, context) {
  const runnable = []
  const skipped = []
  for (const item of selected) {
    const missing = item.requires.filter(key => !context[key])
    if (missing.length) skipped.push({ name: item.name, missing })
    else runnable.push(resolveScenario(item, context))
  }
  return { runnable, skipped }
}

function resolveScenario(item, context) {
  const path = typeof item.path === 'function' ? item.path(context) : item.path
  return { ...item, path }
}

function runScenario(scenarioConfig) {
  const headers = getHeaders(scenarioConfig)

  return new Promise((resolve, reject) => {
    autocannon({
      url: `${baseUrl}${scenarioConfig.path}`,
      method: scenarioConfig.method,
      connections,
      duration,
      pipelining,
      headers,
      body: scenarioConfig.body ? JSON.stringify(scenarioConfig.body) : undefined,
      timeout: 20,
    }, (error, result) => {
      if (error) {
        reject(error)
        return
      }

      const non2xx = result.non2xx || 0
      const p97_5 = result.latency?.p97_5 || result.latency?.p99 || result.latency?.average || 0
      const failures = []
      if (non2xx > scenarioConfig.thresholds.non2xx) failures.push(`non-2xx responses ${non2xx} > ${scenarioConfig.thresholds.non2xx}`)
      if (p97_5 > scenarioConfig.thresholds.p97_5) failures.push(`p97.5 ${p97_5}ms > ${scenarioConfig.thresholds.p97_5}ms`)

      resolve({
        name: scenarioConfig.name,
        path: scenarioConfig.path,
        ok: failures.length === 0,
        failures,
        requests: result.requests,
        latency: result.latency,
        non2xx,
        errors: result.errors,
        timeouts: result.timeouts,
      })
    })
  })
}

function printScenario(result) {
  const status = result.ok ? 'PASS' : 'FAIL'
  console.log(`\n[${status}] ${result.name}`)
  console.log(`  path: ${result.path}`)
  console.log(`  req/sec avg: ${Math.round(result.requests.average || 0)}`)
  console.log(`  latency avg/p97.5/p99: ${result.latency.average || 0}ms / ${result.latency.p97_5 || 0}ms / ${result.latency.p99 || 0}ms`)
  console.log(`  non2xx/errors/timeouts: ${result.non2xx} / ${result.errors} / ${result.timeouts}`)
}

async function warmupScenario(scenarioConfig) {
  const response = await fetch(`${baseUrl}${scenarioConfig.path}`, {
    method: scenarioConfig.method,
    headers: getHeaders(scenarioConfig),
    body: scenarioConfig.body ? JSON.stringify(scenarioConfig.body) : undefined,
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Warmup failed for ${scenarioConfig.name}: ${response.status} ${body.slice(0, 300)}`)
  }
}

function getHeaders(scenarioConfig = {}) {
  const headers = {}
  if (authToken) headers.authorization = `Bearer ${authToken}`
  if (cookie) headers.cookie = cookie
  if (tenantId) headers['x-tenant-id'] = tenantId
  if (scenarioConfig.method === 'POST') headers['content-type'] = 'application/json'
  return headers
}

function printScenarioList() {
  console.log('Scenario groups:')
  for (const [name, members] of Object.entries(scenarioGroups)) {
    console.log(`- ${name}: ${members.join(', ')}`)
  }
  console.log('\nScenarios:')
  for (const item of scenarios) {
    const requirement = item.requires.length ? ` requires ${item.requires.join(',')}` : ''
    console.log(`- ${item.name} ${item.method} p97.5<=${item.thresholds.p97_5}ms${requirement}`)
  }
}

function assertSafeTarget(value) {
  if (process.env.ALLOW_RELEASE_LOAD_TEST === 'true' || process.env.ALLOW_PRODUCTION_LOAD_TEST === 'true') return
  const lower = value.toLowerCase()
  const safe = lower.includes('localhost')
    || lower.includes('127.0.0.1')
    || lower.includes('development')
    || lower.includes('dev')
    || lower.includes('preview')
  if (!safe) {
    throw new Error('Load tests are blocked outside localhost/development unless ALLOW_RELEASE_LOAD_TEST=true.')
  }
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, '')
}

function parseArgs(values) {
  return values.reduce((acc, item) => {
    const match = item.match(/^--([^=]+)(?:=(.*))?$/)
    if (!match) return acc
    const key = match[1].replace(/-([a-z])/g, (_part, letter) => letter.toUpperCase())
    acc[key] = match[2] ?? 'true'
    return acc
  }, {})
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
