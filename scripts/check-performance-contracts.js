const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function fail(message) {
  failures.push(message)
}

function assertIncludes(file, text, message) {
  if (!read(file).includes(text)) fail(`${file}: ${message}`)
}

function assertNotIncludes(file, text, message) {
  if (read(file).includes(text)) fail(`${file}: ${message}`)
}

function assertBefore(file, first, second, message) {
  const content = read(file)
  const firstIndex = content.indexOf(first)
  const secondIndex = content.indexOf(second)
  if (firstIndex < 0 || secondIndex < 0 || firstIndex > secondIndex) fail(`${file}: ${message}`)
}

function getSelectAfterFrom(file, table) {
  const content = read(file)
  const pattern = new RegExp(`from\\('${table}'\\)[\\s\\S]{0,500}?\\.select\\('([^']+)'\\)`)
  return pattern.exec(content)?.[1] || ''
}

const fastListServices = [
  {
    file: 'lib/services/companyService.ts',
    detailNeedle: "return apiClient.get<{ data: Sirket }>(`/api/sirketler/${id}`, { skipAuth: true, staleTime: 120_000 })",
  },
  {
    file: 'lib/services/employeeService.ts',
    detailNeedle: "return apiClient.get<{ data: Personel }>(`/api/ik/personel/${id}`, { skipAuth: true, staleTime: 120_000 })",
  },
]

for (const service of fastListServices) {
  const content = read(service.file)
  if (!/(skipAuth:\s*(options|clientOptions)\.skipAuth \?\? true)/.test(content)) {
    fail(`${service.file}: primary list service must skip Supabase session lookup by default`)
  }
  if (!/(staleTime:\s*(options|clientOptions)\.staleTime \?\? 120_000)/.test(content)) {
    fail(`${service.file}: primary list service must keep a short client cache`)
  }
  assertIncludes(service.file, service.detailNeedle, 'primary detail service must use skipAuth and short client cache')
}

const companyListSelect = getSelectAfterFrom('app/api/sirketler/route.ts', 'sirketler')
for (const column of ['hero_images', 'hero_documents', 'field_history']) {
  if (companyListSelect.includes(column)) fail(`app/api/sirketler/route.ts: company list select must not include heavy column ${column}`)
}

const employeeRoute = read('app/api/ik/personel/route.ts')
const employeeListGet = employeeRoute.slice(
  employeeRoute.indexOf('export async function GET'),
  employeeRoute.indexOf('// POST /api/ik/personel')
)
for (const forbidden of ['module_licenses', 'egitim_okullari', 'getEducationLevelValue']) {
  if (employeeListGet.includes(forbidden)) fail(`app/api/ik/personel/route.ts: employee list GET must not include ${forbidden}`)
}

const instantOpenPages = [
  {
    file: 'app/app/sirket/sirketler/page.tsx',
    selected: 'setSelectedSirket(normalizeCompanyForForm(row as Sirket))',
    mode: "setPageState('view')",
    detail: 'await companyService.detail(row.id)',
  },
  {
    file: 'app/app/ik/personel/page.tsx',
    selected: 'setSelectedPersonel(row as Personel)',
    mode: "setPageState('view')",
    detail: 'await employeeService.detail(row.id)',
  },
  {
    file: 'app/app/sirket/sirketler/ortaklar/page.tsx',
    selected: 'setSelectedPartner(normalizePartnerForForm(row))',
    mode: "setPageState('view')",
    detail: 'companyService.partnerDetail(row.id)',
  },
  {
    file: 'app/app/sirket/sirketler/temsilciler/page.tsx',
    selected: 'setSelectedRepresentative(normalizeRepresentativeForForm(row))',
    mode: "setPageState('view')",
    detail: 'await companyService.representativeDetail(row.id)',
  },
  {
    file: 'app/app/sirket/sirketler/paydaslar/page.tsx',
    selected: 'setSelectedStakeholder(normalizeStakeholderForForm(row))',
    mode: "setPageState('view')",
    detail: 'await companyService.stakeholderDetail(row.id)',
  },
]

for (const page of instantOpenPages) {
  assertNotIncludes(page.file, '?t=${Date.now()}', 'row detail fetch must not bust cache with timestamp query')
  assertNotIncludes(page.file, "cache: 'no-store'", 'row detail fetch must not disable browser/client cache')
  assertBefore(page.file, page.selected, page.detail, 'row click must set selected row before awaiting detail')
  assertBefore(page.file, page.mode, page.detail, 'row click must open the form before awaiting detail')
}

for (const file of [
  'app/app/sirket/sirketler/ortaklar/page.tsx',
  'app/app/sirket/sirketler/temsilciler/page.tsx',
  'app/app/sirket/sirketler/paydaslar/page.tsx',
]) {
  assertIncludes(file, 'companyService.', 'company relation pages must use companyService for cacheable list/detail GETs')
  assertIncludes(file, 'useMemo(() =>', 'company relation pages must memoize table and widget derivations')
  assertIncludes(file, 'loadData(true)', 'company relation pages must force-refresh after mutations')
}

assertIncludes('app/app/sirket/teskilat/page.tsx', 'organizationService.list({ useCache: !force })', 'teskilat page must use cacheable organization service list')
assertIncludes('app/app/sirket/teskilat/page.tsx', 'companyService.list({ useCache: !force })', 'teskilat page must use cacheable company service list')
assertIncludes('app/app/sirket/teskilat/page.tsx', 'onRefresh={() => loadData(true)}', 'teskilat page refresh must force invalidate cache')

assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'ownershipTransactionsService.list()', 'ownership transactions page must use ownership service list')
assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'companyService.partnersList({ useCache: !force })', 'ownership transactions page must use cacheable partner list')
assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'ownershipTransactionsService.get(row.id)', 'ownership transactions row detail must use service detail')

assertNotIncludes('app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx', "fetch('/api/sirketler'", 'bank accounts page must use companyService for company options')
assertIncludes('app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx', 'companyService.list()', 'bank accounts page must use cacheable company options')

const companyDetailRoute = 'app/api/sirketler/[id]/route.ts'
for (const table of ['sirket_ortaklar', 'sirket_temsilciler', 'stakeholders', 'sirket_logolar']) {
  assertNotIncludes(companyDetailRoute, `from('${table}').select('*')`, `${table} detail select must be explicit`)
}
for (const file of [
  'app/api/ik/teskilat/route.ts',
  'app/api/sirketler/[id]/route.ts',
  'app/api/sirketler/ortaklar/[id]/route.ts',
  'app/api/sirketler/temsilciler/[id]/route.ts',
  'app/api/sirketler/paydaslar/[id]/route.ts',
]) {
  assertNotIncludes(file, ".select('*')", 'hot list/detail API routes must use explicit selects')
}

const indexMigration = 'supabase/migrations/20260514_fast_primary_lists.sql'
for (const indexName of [
  'idx_sirketler_active_name_fast',
  'idx_employees_active_name_fast',
  'idx_sirket_ortaklar_company_active_fast',
  'idx_sirket_temsilciler_company_active_fast',
  'idx_stakeholders_company_active_fast',
]) {
  assertIncludes(indexMigration, indexName, `missing required performance index ${indexName}`)
}

if (failures.length) {
  console.error('Performance contract check failed:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Performance contract check passed.')
