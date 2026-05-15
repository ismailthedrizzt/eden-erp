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
assertIncludes('lib/services/companyService.ts', 'currentOwnership(companyIds: string[]', 'company service must expose cacheable current ownership lookup')

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
assertIncludes('app/api/ik/personel/route.ts', 'missingEmployeeRelation(error)', 'employee list GET must fall back when organization relations are unavailable')
assertIncludes('app/api/ik/personel/route.ts', 'includeOrganizationRelations = false', 'employee list GET must not fail the whole list when organization joins are unavailable')
assertIncludes('app/api/ik/personel/route.ts', "missingColumn === 'is_deleted'", 'employee list GET must fall back when legacy databases do not have is_deleted yet')

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
assertNotIncludes('app/app/sirket/teskilat/page.tsx', 'Promise.all([\n        organizationService.list({ useCache: !force }),\n        companyService.list({ useCache: !force }),', 'teskilat list must not block initial tree on company options')
assertIncludes('app/app/sirket/teskilat/page.tsx', 'const loadCompanyOptions = async (force = false) =>', 'teskilat company options must be lazy-loaded for the form')
assertIncludes('app/app/sirket/teskilat/page.tsx', 'onRefresh={() => loadData(true)}', 'teskilat page refresh must force invalidate cache')
assertIncludes('app/app/sirket/sirketler/page.tsx', "if (pageState === 'list' || publicReferenceOptionsLoaded) return", 'company page public reference options must not load while the list is open')

assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'ownershipTransactionsService.list()', 'ownership transactions page must use ownership service list')
assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'companyService.partnersList({ useCache: !force })', 'ownership transactions page must use cacheable partner list')
assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'ownershipTransactionsService.get(row.id)', 'ownership transactions row detail must use service detail')

assertNotIncludes('app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx', "fetch('/api/sirketler'", 'bank accounts page must use companyService for company options')
assertIncludes('app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx', 'companyService.list()', 'bank accounts page must use cacheable company options')
assertIncludes('lib/modules/accounting/bank-integration/bankAccountsCards.service.ts', 'skipAuth: true', 'bank account/card list services must skip session lookup by default')
assertIncludes('lib/modules/accounting/bank-integration/bankAccountsCards.service.ts', 'staleTime: 120_000', 'bank account/card list services must keep short client cache')
assertNotIncludes('lib/modules/accounting/bank-integration/bankAccountsCards.service.ts', "getUnifiedRecords(options: { includePassive?: boolean } = {}) {\n    return apiClient.get<{ data: BankAccountCardRow[]; accountOptions: Array<{ value: string; label: string; bank_connection_id?: string | null }> }>('/api/accounting/bank-accounts-cards', {\n      useCache: false", 'bank account/card unified list must not disable client cache')
assertNotIncludes('lib/modules/accounting/bank-integration/bankAccountsCards.service.ts', "getConnections() {\n    return apiClient.get<{ data: BankConnectionRow[] }>('/api/accounting/bank-connections', { useCache: false })", 'bank connections list must not disable client cache')
assertIncludes('lib/modules/accounting/bank-integration/bankAccountsCards.service.ts', 'function invalidateBankAccountCardCaches', 'bank account/card mutations must invalidate cached lists')

assertIncludes('lib/modules/accounting/bank-integration/financialInstitutionMovements.service.ts', 'skipAuth: true', 'financial movement list/detail services must skip session lookup by default')
assertIncludes('lib/modules/accounting/bank-integration/financialInstitutionMovements.service.ts', 'function invalidateFinancialMovementCaches', 'financial movement mutations must invalidate cached lists')
assertIncludes('lib/modules/accounting/account-cards/accountCards.service.ts', 'skipAuth: options?.skipAuth ?? true', 'account card list service must skip session lookup by default')
assertIncludes('lib/modules/accounting/pre-accounting/preAccounting.service.ts', 'skipAuth: options?.skipAuth ?? true', 'pre-accounting services must skip session lookup by default')
assertNotIncludes('app/app/sistem/system-parameters/page.tsx', "cache: 'no-store'", 'system parameter page must use apiClient cache for list GET')
assertIncludes('app/app/sistem/system-parameters/page.tsx', "apiClient.get<{ data?: ParameterRow[]; warning?: string }>('/api/settings/system-parameters'", 'system parameter page must use apiClient for list GET')
assertNotIncludes('app/app/sistem/entegrasyon-ayarlari/page.tsx', "cache: 'no-store'", 'integration parameter page must use apiClient cache for list GET')
assertIncludes('app/app/sistem/entegrasyon-ayarlari/page.tsx', "apiClient.get<{ data?: any[] }>('/api/settings/integration-parameters'", 'integration parameter page must use apiClient for list GET')
assertNotIncludes('components/modules/sirket/CompanyPublicTab.tsx', "cache: 'no-store'", 'company public NACE tab must use apiClient cache for list/reference GETs')
assertIncludes('components/modules/sirket/CompanyPublicTab.tsx', "apiClient.get<{ data?: CompanyNaceRow[]; warning?: string }>", 'company public NACE rows must use apiClient')
assertIncludes('components/modules/sirket/CompanyPublicTab.tsx', "apiClient.get<{ data?: NaceReferenceRow[]; warning?: string }>", 'company public NACE references must use apiClient')

assertNotIncludes('app/app/sirket/araclar/page.tsx', "fetch('/api/sirket/araclar'", 'vehicles page must use companyVehicleService for cacheable list and mutations')
assertIncludes('app/app/sirket/araclar/page.tsx', 'companyVehicleService.list({ useCache: !force })', 'vehicles page must use cacheable vehicle service list')
assertIncludes('app/app/sirket/araclar/page.tsx', 'data={tableData}', 'vehicles page must memoize table rows before rendering')
assertIncludes('app/app/sirket/araclar/page.tsx', 'onRefresh={() => loadData(true)}', 'vehicles page refresh must force invalidate cache')

for (const file of [
  'components/ui/EntityForm.tsx',
  'components/modules/sirket/PartnersTab.tsx',
  'components/modules/sirket/RepresentativesTab.tsx',
]) {
  assertNotIncludes(file, "fetch('/api/sirketler'", 'shared form components must use cached company service references')
  assertNotIncludes(file, "fetch('/api/ik/personel", 'shared form components must use cached employee service references')
  assertNotIncludes(file, "fetch('/api/ik/teskilat", 'shared form components must use cached organization service references')
}

for (const file of [
  'app/app/muhasebe/on-muhasebe-hareketleri/page.tsx',
  'app/app/muhasebe/banka-kart-hareketleri/page.tsx',
  'app/app/muhasebe/hesap-ve-kart-hareketleri/page.tsx',
  'app/app/muhasebe/cari-kartlar/page.tsx',
]) {
  assertIncludes(file, 'const tableData = useMemo(() =>', 'accounting list table derivations must be memoized')
}
assertNotIncludes('app/app/muhasebe/on-muhasebe-hareketleri/page.tsx', 'Promise.all([\n        preAccountingService.getList(),\n        preAccountingService.getReferences(),', 'pre-accounting list must not block initial table on form reference data')
assertIncludes('app/app/muhasebe/on-muhasebe-hareketleri/page.tsx', 'const loadReferences = async () =>', 'pre-accounting form references must be lazy-loaded')
assertNotIncludes('app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx', 'loadCompanies().then(options =>', 'bank account/card list must not block initial table on company options')
assertIncludes('app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx', 'const loadCompanyOptions = async () =>', 'bank account/card company options must be lazy-loaded for the form')

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
  'app/api/sirket/araclar/route.ts',
  'app/api/ownership-transactions/route.ts',
  'app/api/ownership-transactions/[id]/route.ts',
  'app/api/ownership-transactions/[id]/approve/route.ts',
  'app/api/ownership-transactions/[id]/reject/route.ts',
  'app/api/ownership-transactions/[id]/cancel/route.ts',
  'app/api/ownership-transactions/[id]/send-approval/route.ts',
  'app/api/ownership-transactions/[id]/reverse/route.ts',
  'app/api/ownership-transactions/[id]/impact/route.ts',
  'app/api/identity/resolve/route.ts',
  'app/api/ik/personel/[id]/route.ts',
  'app/api/accounting/financial-institution-movements/[id]/route.ts',
  'app/api/accounting/financial-institution-movements/[id]/match/route.ts',
  'app/api/accounting/financial-institution-movements/[id]/unmatch/route.ts',
  'app/api/accounting/financial-institution-movements/[id]/review/route.ts',
  'app/api/accounting/financial-institution-movements/[id]/passivate/route.ts',
  'app/api/accounting/financial-institution-movements/manual/route.ts',
  'app/api/accounting/bank-accounts-cards/_shared.ts',
  'app/api/accounting/bank-accounts-cards/route.ts',
  'app/api/accounting/bank-accounts-cards/[id]/route.ts',
  'app/api/accounting/bank-accounts-cards/[id]/set-default/route.ts',
  'app/api/accounting/bank-accounts-cards/[id]/passivate/route.ts',
  'app/api/accounting/bank-accounts/[accountId]/route.ts',
  'app/api/accounting/bank-accounts/[accountId]/sync/route.ts',
  'app/api/accounting/bank-accounts/[accountId]/passivate/route.ts',
  'app/api/accounting/bank-cards/[cardId]/route.ts',
  'app/api/accounting/bank-cards/[cardId]/sync/route.ts',
  'app/api/accounting/bank-cards/[cardId]/passivate/route.ts',
  'app/api/accounting/bank-connections/route.ts',
  'app/api/accounting/bank-connections/[id]/route.ts',
  'app/api/accounting/bank-connections/[id]/accounts/route.ts',
  'app/api/accounting/bank-connections/[id]/cards/route.ts',
  'app/api/accounting/bank-connections/[id]/passivate/route.ts',
  'app/api/accounting/bank-connections/[id]/test/route.ts',
  'app/api/muhasebe/cari-kartlar/route.ts',
  'app/api/muhasebe/cari-kartlar/resolve/route.ts',
  'app/api/settings/system-parameters/route.ts',
  'app/api/settings/module-licenses/route.ts',
  'app/api/settings/integration-parameters/_shared.ts',
  'app/api/settings/integration-parameters/route.ts',
  'app/api/settings/integration-parameters/[id]/route.ts',
  'app/api/settings/integration-parameters/[id]/credential/route.ts',
  'app/api/settings/integration-parameters/[id]/test/route.ts',
  'app/api/reference/nace-codes/route.ts',
  'app/api/reference/nace-codes/update-logs/route.ts',
  'app/api/companies/[company_id]/nace-codes/route.ts',
  'app/api/companies/[company_id]/nace-codes/[id]/route.ts',
  'app/api/companies/[company_id]/nace-codes/[id]/passivate/route.ts',
  'app/api/companies/[company_id]/nace-codes/[id]/set-primary/route.ts',
  'app/api/ownership-transactions/[id]/history/route.ts',
  'lib/identity/masterContact.ts',
  'lib/modules/accounting/bank-integration/BankSyncService.ts',
  'lib/modules/entity-bank-accounts/entityBankAccounts.service.ts',
]) {
  assertNotIncludes(file, ".select('*')", 'hot list/detail API routes must use explicit selects')
  assertNotIncludes(file, "nace_codes(*)", 'nested relation selects must list required NACE columns explicitly')
}

const indexMigration = 'supabase/migrations/20260514_fast_primary_lists.sql'
for (const indexName of [
  'idx_sirketler_active_name_fast',
  'idx_employees_active_name_fast',
  'idx_sirket_ortaklar_company_active_fast',
  'idx_sirket_temsilciler_company_active_fast',
  'idx_stakeholders_company_active_fast',
  'idx_company_vehicles_active_fast',
]) {
  assertIncludes(indexMigration, indexName, `missing required performance index ${indexName}`)
}

if (failures.length) {
  console.error('Performance contract check failed:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Performance contract check passed.')
