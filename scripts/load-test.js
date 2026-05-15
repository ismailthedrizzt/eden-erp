const autocannon = require('autocannon')

const args = parseArgs(process.argv.slice(2))
const baseUrl = normalizeBaseUrl(args.baseUrl || process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000')
const duration = Number(args.duration || process.env.LOAD_TEST_DURATION || 20)
const connections = Number(args.connections || process.env.LOAD_TEST_CONNECTIONS || 20)
const pipelining = Number(args.pipelining || process.env.LOAD_TEST_PIPELINING || 1)
const authToken = process.env.LOAD_TEST_AUTH_TOKEN || ''
const cookie = process.env.LOAD_TEST_COOKIE || 'demo_auth=true'

const scenarios = [
  {
    name: 'employees-list',
    path: '/api/ik/personel?page=1&pageSize=50&sort=ad&direction=asc',
    thresholds: { p97_5: 500, non2xx: 0 },
  },
  {
    name: 'companies-list',
    path: '/api/sirketler?page=1&pageSize=50&sort=kisa_unvan&direction=asc',
    thresholds: { p97_5: 500, non2xx: 0 },
  },
  {
    name: 'partners-list',
    path: '/api/sirketler/ortaklar?page=1&pageSize=50&sort=display_name&direction=asc',
    thresholds: { p97_5: 650, non2xx: 0 },
  },
  {
    name: 'bank-accounts-cards-list',
    path: '/api/accounting/bank-accounts-cards?page=1&pageSize=50&sort=bank_name&direction=asc',
    thresholds: { p97_5: 650, non2xx: 0 },
  },
  {
    name: 'pre-accounting-list',
    path: '/api/muhasebe/on-muhasebe-hareketleri?page=1&pageSize=50&sort=movement_date&direction=desc',
    thresholds: { p97_5: 650, non2xx: 0 },
  },
]

async function main() {
  console.log(`Load test target: ${baseUrl}`)
  console.log(`Connections: ${connections}, duration: ${duration}s, pipelining: ${pipelining}`)
  console.log(`Cookie: ${cookie ? 'set' : 'not set'}, auth token: ${authToken ? 'set' : 'not set'}`)

  const results = []
  for (const scenario of scenarios) {
    await warmupScenario(scenario)
    const result = await runScenario(scenario)
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

function runScenario(scenario) {
  const headers = getHeaders()

  return new Promise((resolve, reject) => {
    autocannon({
      url: `${baseUrl}${scenario.path}`,
      connections,
      duration,
      pipelining,
      headers,
      timeout: 20,
    }, (error, result) => {
      if (error) {
        reject(error)
        return
      }

      const non2xx = result.non2xx || 0
      const p97_5 = result.latency?.p97_5 || result.latency?.p99 || result.latency?.average || 0
      const failures = []
      if (non2xx > scenario.thresholds.non2xx) failures.push(`non-2xx responses ${non2xx} > ${scenario.thresholds.non2xx}`)
      if (p97_5 > scenario.thresholds.p97_5) failures.push(`p97.5 ${p97_5}ms > ${scenario.thresholds.p97_5}ms`)

      resolve({
        name: scenario.name,
        path: scenario.path,
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

async function warmupScenario(scenario) {
  const response = await fetch(`${baseUrl}${scenario.path}`, { headers: getHeaders() })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Warmup failed for ${scenario.name}: ${response.status} ${body.slice(0, 300)}`)
  }
}

function getHeaders() {
  const headers = {}
  if (authToken) headers.authorization = `Bearer ${authToken}`
  if (cookie) headers.cookie = cookie
  return headers
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, '')
}

function parseArgs(values) {
  return values.reduce((acc, item) => {
    const match = item.match(/^--([^=]+)=(.*)$/)
    if (!match) return acc
    const key = match[1].replace(/-([a-z])/g, (_part, letter) => letter.toUpperCase())
    acc[key] = match[2]
    return acc
  }, {})
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
