const args = parseArgs(process.argv.slice(2))
const dryRun = args.dryRun === 'true' || args.dryRun === true
const webBaseUrl = normalizeBaseUrl(args.baseUrl || process.env.SMOKE_BASE_URL || 'http://localhost:3000')
const fastApiUrl = normalizeBaseUrl(args.fastApiUrl || process.env.SMOKE_FASTAPI_URL || 'http://localhost:8000')
const token = args.token || process.env.SMOKE_TOKEN || ''
const tenantId = args.tenantId || process.env.SMOKE_TENANT_ID || ''
const companyId = args.companyId || process.env.SMOKE_COMPANY_ID || ''

const checks = [
  check('next-root', `${webBaseUrl}/`, { optional: false }),
  check('fastapi-health', `${fastApiUrl}/health`, { optional: false }),
  check('fastapi-v1-health', `${fastApiUrl}/api/v1/health`, { optional: false }),
  check('setup-readiness', `${webBaseUrl}/api/setup/readiness`, { optional: true }),
  check('companies-list', `${webBaseUrl}/api/companies?page=1&pageSize=25`, { optional: true }),
  check('branch-list', `${webBaseUrl}/api/companies/branches?page=1&pageSize=25`, { optional: true }),
  check('action-center-counts', `${webBaseUrl}/api/action-center/counts`, { optional: true }),
  check('company-detail', companyId ? `${webBaseUrl}/api/companies/${companyId}` : null, { optional: true }),
]

async function main() {
  const runnable = checks.filter(item => item.url)
  if (dryRun) {
    console.log('Smoke test dry run:')
    for (const item of runnable) console.log(`- ${item.name}: ${item.url}`)
    return
  }

  const failures = []
  for (const item of runnable) {
    const result = await runCheck(item)
    const status = result.ok ? 'PASS' : item.optional ? 'WARN' : 'FAIL'
    console.log(`[${status}] ${item.name} ${result.status || ''}`)
    if (!result.ok && !item.optional) failures.push(`${item.name}: ${result.error || result.status}`)
  }

  if (failures.length) {
    console.error('\nSmoke test failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }
}

function check(name, url, options) {
  return { name, url, optional: options.optional }
}

async function runCheck(item) {
  try {
    const headers = {}
    if (token) headers.authorization = `Bearer ${token}`
    if (tenantId) headers['x-tenant-id'] = tenantId
    const response = await fetch(item.url, { headers, redirect: 'manual' })
    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
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
