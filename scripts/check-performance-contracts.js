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

function assertRegex(file, pattern, message) {
  if (!pattern.test(read(file))) fail(`${file}: ${message}`)
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

assertIncludes('lib/api/listEndpoint.ts', 'export interface ListResponse<T>', 'list endpoint standard must expose typed paginated responses')
assertIncludes('lib/api/listEndpoint.ts', 'export function parseListQuery', 'list endpoint standard must expose query parser')
assertIncludes('lib/api/listEndpoint.ts', 'export function listRange', 'list endpoint standard must expose backend range helper')
assertIncludes('lib/api/listEndpoint.ts', 'export function listMeta', 'list endpoint standard must expose meta helper')
assertIncludes('lib/api/listEndpoint.ts', 'export function listMetaFromRows', 'list endpoint standard must expose count-free approximate meta helper')
assertIncludes('components/ui/SmartDataTable.tsx', 'export interface ServerPaginationConfig', 'SmartDataTable must support server-side pagination contract')
assertIncludes('components/ui/SmartDataTable.tsx', "pagination?: ServerPaginationConfig", 'SmartDataTable props must expose server pagination')
assertIncludes('components/ui/SmartDataTable.tsx', "if (isServerPaginated) return data", 'SmartDataTable server mode must not client-filter/sort the current backend page')
assertIncludes('components/ui/SmartDataTable.tsx', 'function isActionColumn', 'SmartDataTable must centrally identify action columns')
assertIncludes('components/ui/SmartDataTable.tsx', 'group-hover/row:bg-sky-50/80', 'clickable rows must keep a visible hover affordance')
assertIncludes('components/ui/SmartDataTable.tsx', 'event.stopPropagation()', 'action columns must not trigger row navigation')
assertIncludes('components/ui/EntityForm.tsx', 'export interface FormLoadStage', 'EntityForm must expose progressive form load stages')
assertIncludes('components/ui/EntityForm.tsx', 'function FormLoadStages', 'EntityForm must render the standard progressive loading affordance')
assertIncludes('components/ui/AutomationBadge.tsx', 'export function AutomationBadge', 'automation badge must be shared instead of reimplemented per field')
assertIncludes('components/ui/EntityForm.tsx', 'export interface FieldAutomationConfig', 'EntityForm must expose automation metadata for fields that fill other fields')
assertIncludes('components/ui/EntityForm.tsx', 'function getFieldAutomationState', 'EntityForm must render automation badges from field metadata')
assertIncludes('components/ui/EntityForm.tsx', "field.type === 'iban'", 'IBAN fields must receive the default automation badge rule')
assertIncludes('lib/forms/progressiveFormLoading.ts', 'createProgressiveFormLoadStages', 'progressive form loading helper must be shared by template pages')
assertIncludes('lib/access/entityAccess.tsx', 'export function useEntityAccess', 'ERP pages must have a central module and permission access helper')
assertIncludes('lib/access/entityAccess.tsx', 'export function ModuleDependencyGate', 'cross-module fields must have a standard dependency gate')
assertIncludes('lib/access/entityAccess.tsx', 'ModuleDependencyNotice', 'disabled module dependencies must show a standard user-facing notice')
assertIncludes('lib/workflow/entityWorkflow.ts', 'decideWorkflowRoute', 'forms must have a shared workflow routing decision helper')
assertIncludes('components/ui/EntityForm.tsx', 'access?: Partial<EntityAccessState>', 'EntityForm must accept central access state')
assertIncludes('components/ui/EntityForm.tsx', 'moduleDependencies?: ModuleDependency[]', 'EntityForm must render missing module dependencies')
assertIncludes('docs/ArchitectureAccessWorkflow.md', 'useEntityAccess', 'architecture doc must explain access helper usage')
assertIncludes('docs/templates/FastEntityListTemplate.md', "pagination={{", 'fast list template must use SmartDataTable server pagination')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'select(ENTITY_LIST_SELECT)', 'fast list template must require narrow selects')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'listMetaFromRows', 'fast list template must avoid exact count for hot lists')
assertNotIncludes('docs/templates/FastEntityListTemplate.md', "select(ENTITY_LIST_SELECT, { count: 'exact' })", 'fast list template must not recommend exact count for hot lists')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'hasDataRef', 'fast list template must keep stale rows visible during background refresh')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'range(from, to)', 'fast list template must require backend pagination range')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'ListResponse<EntityListRow>', 'fast list template must use paginated list response typing')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'Satir acma davranisini ayrica her sayfada stillendirme', 'fast list template must keep row click affordance centralized')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'snapshot -> detail -> master -> references', 'fast list template must document progressive form loading')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'Form Automation Badge', 'fast list template must document automation badge usage')
assertIncludes('docs/templates/FastEntityListTemplate.md', 'useEntityAccess', 'fast list template must include access/dependency/workflow contract')
assertRegex('FrontendDataAccessRules.md', /SmartDataTable.*pagination=\{\{ mode: 'server'/s, 'frontend rules must require server pagination for main ERP lists')
assertIncludes('FrontendDataAccessRules.md', '`actions`/`İşlemler` sutunu satir acma davranisindan ayridir', 'frontend rules must separate action-column clicks from row navigation')
assertIncludes('FrontendDataAccessRules.md', 'loadStages={formLoadStages}', 'frontend rules must require EntityForm progressive loading stages')
assertIncludes('FrontendDataAccessRules.md', 'AutomationBadge', 'frontend rules must require standard automation badges for derived fields')
assertIncludes('FrontendDataAccessRules.md', 'ModuleDependencyGate', 'frontend rules must require standard module dependency handling')
assertIncludes('FrontendDataAccessRules.md', 'requirePermission', 'frontend rules must state backend permission checks remain authoritative')
assertIncludes('BackendApiMigration.md', 'parseListQuery', 'backend migration rules must reference list query parser')

for (const file of [
  'app/app/ik/personel/page.tsx',
  'app/app/sirket/sirketler/page.tsx',
  'app/app/sirket/sirketler/ortaklar/page.tsx',
  'app/app/sirket/sirketler/temsilciler/page.tsx',
  'app/app/sirket/sirketler/paydaslar/page.tsx',
  'app/app/sirket/ortaklik-islemleri/page.tsx',
  'app/app/sirket/teskilat/page.tsx',
  'app/app/muhasebe/on-muhasebe-hareketleri/page.tsx',
  'app/app/muhasebe/cari-kartlar/page.tsx',
  'app/app/sistem/system-parameters/page.tsx',
]) {
  assertIncludes(file, 'createProgressiveFormLoadStages', 'template-derived EntityForm pages must use progressive form loading helper')
  assertIncludes(file, 'loadStages={formLoadStages}', 'template-derived EntityForm pages must pass progressive loading stages to EntityForm')
}

const serverPaginatedSmartListPages = [
  'app/app/ik/personel/page.tsx',
  'app/app/sirket/sirketler/page.tsx',
  'app/app/sirket/sirketler/ortaklar/page.tsx',
  'app/app/sirket/sirketler/temsilciler/page.tsx',
  'app/app/sirket/sirketler/paydaslar/page.tsx',
  'app/app/sirket/ortaklik-islemleri/page.tsx',
  'app/app/sirket/araclar/page.tsx',
  'app/app/muhasebe/on-muhasebe-hareketleri/page.tsx',
  'app/app/muhasebe/hesap-ve-kart-hareketleri/page.tsx',
  'app/app/muhasebe/banka-kart-hareketleri/page.tsx',
  'app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx',
  'app/app/muhasebe/cari-kartlar/page.tsx',
]

for (const file of serverPaginatedSmartListPages) {
  assertIncludes(file, 'pagination={{', 'main ERP list SmartDataTable must use the server pagination contract')
  assertIncludes(file, "mode: 'server'", 'main ERP list SmartDataTable must run in server pagination mode')
  assertIncludes(file, 'onPageChange', 'main ERP list SmartDataTable must request pages from the backend')
  assertIncludes(file, 'onPageSizeChange', 'main ERP list SmartDataTable must request page-size changes from the backend')
  assertIncludes(file, 'onSearchChange', 'main ERP list SmartDataTable must send search to the backend')
  assertIncludes(file, 'onSortChange', 'main ERP list SmartDataTable must send sort to the backend')
}

for (const file of [
  'app/api/ik/personel/route.ts',
  'app/api/sirketler/route.ts',
  'app/api/sirketler/ortaklar/route.ts',
  'app/api/sirketler/temsilciler/route.ts',
  'app/api/sirketler/paydaslar/route.ts',
  'app/api/ownership-transactions/route.ts',
  'app/api/sirket/araclar/route.ts',
  'app/api/muhasebe/on-muhasebe-hareketleri/route.ts',
  'app/api/accounting/financial-institution-movements/route.ts',
  'app/api/accounting/bank-card-transactions/route.ts',
  'app/api/accounting/bank-accounts-cards/route.ts',
  'app/api/muhasebe/cari-kartlar/route.ts',
]) {
  assertIncludes(file, 'parseListQuery', 'main ERP list endpoint must parse the standard list query')
  assertIncludes(file, 'listMetaFromRows', 'main ERP list endpoint must return count-free pagination metadata')
  assertNotIncludes(file, "count: 'exact'", 'main ERP list endpoint must not use exact count on hot lists')
  assertNotIncludes(file, 'count: "exact"', 'main ERP list endpoint must not use exact count on hot lists')
}

for (const service of fastListServices) {
  const content = read(service.file)
  if (!/(skipAuth:\s*(options|clientOptions)\.skipAuth \?\? true)/.test(content)) {
    fail(`${service.file}: primary list service must skip Supabase session lookup by default`)
  }
  if (!/(staleTime:\s*(options|clientOptions)\.staleTime \?\? 300_000)/.test(content)) {
    fail(`${service.file}: primary list service must keep a 5 minute client cache`)
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
assertIncludes('app/api/ik/personel/route.ts', 'photoUrl.startsWith(\'data:\') && photoUrl.length > 20_000', 'employee list GET must strip large base64 avatar payloads')
assertIncludes('app/api/ik/personel/route.ts', 'missingEmployeeRelation(error)', 'employee list GET must fall back when organization relations are unavailable')
assertIncludes('app/api/ik/personel/route.ts', 'includeOrganizationRelations = false', 'employee list GET must not fail the whole list when organization joins are unavailable')
assertIncludes('app/api/ik/personel/route.ts', "missingColumn === 'is_deleted'", 'employee list GET must fall back when legacy databases do not have is_deleted yet')

const instantOpenPages = [
  {
    file: 'app/app/sirket/sirketler/page.tsx',
    selected: 'setSelectedSirket(snapshot)',
    mode: "setPageState('view')",
    detail: "await companyService.detailSection(row.id, 'hero')",
  },
  {
    file: 'app/app/ik/personel/page.tsx',
    selected: 'setSelectedPersonel(cached?.data || row as Personel)',
    mode: "setPageState('view')",
    detail: 'await employeeService.detail(row.id)',
  },
  {
    file: 'app/app/sirket/sirketler/ortaklar/page.tsx',
    selected: 'setSelectedPartner(cached?.data || normalizePartnerForForm(row))',
    mode: "setPageState('view')",
    detail: 'companyService.partnerDetail(row.id)',
  },
  {
    file: 'app/app/sirket/sirketler/temsilciler/page.tsx',
    selected: 'setSelectedRepresentative(cached?.data || normalizeRepresentativeForForm(row))',
    mode: "setPageState('view')",
    detail: 'await companyService.representativeDetail(row.id)',
  },
  {
    file: 'app/app/sirket/sirketler/paydaslar/page.tsx',
    selected: 'setSelectedStakeholder(cached?.data || normalizeStakeholderForForm(row))',
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
assertNotIncludes('app/app/sirket/sirketler/temsilciler/page.tsx', 'Promise.all([\n        companyService.representativesList({ includePassive, useCache: !force }),\n        companyService.list({ useCache: !force }),', 'representatives list must not block initial table on company options')
assertIncludes('app/app/sirket/sirketler/temsilciler/page.tsx', 'const loadCompanyOptions = async (force = false) =>', 'representatives company options must load separately from initial list')
assertNotIncludes('app/app/sirket/sirketler/paydaslar/page.tsx', 'Promise.all([\n        companyService.stakeholdersList({ includePassive, useCache: !force }),\n        companyService.list({ useCache: !force }),', 'stakeholders list must not block initial table on company options')
assertIncludes('app/app/sirket/sirketler/paydaslar/page.tsx', 'const loadCompanyOptions = async (force = false) =>', 'stakeholders company options must load separately from initial list')

assertIncludes('app/app/sirket/teskilat/page.tsx', 'organizationService.list({ useCache: !force })', 'teskilat page must use cacheable organization service list')
assertNotIncludes('app/app/sirket/teskilat/page.tsx', 'Promise.all([\n        organizationService.list({ useCache: !force }),\n        companyService.list({ useCache: !force }),', 'teskilat list must not block initial tree on company options')
assertIncludes('app/app/sirket/teskilat/page.tsx', 'const loadCompanyOptions = async (force = false) =>', 'teskilat company options must be lazy-loaded for the form')
assertIncludes('app/app/sirket/teskilat/page.tsx', 'onRefresh={() => loadData(true)}', 'teskilat page refresh must force invalidate cache')
assertIncludes('app/app/sirket/sirketler/page.tsx', "if (pageState === 'list' || publicReferenceOptionsLoaded) return", 'company page public reference options must not load while the list is open')

assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'ownershipTransactionsService.list(listQuery)', 'ownership transactions page must use ownership service list')
assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'companyService.partnersList({ useCache: !force })', 'ownership transactions page must use cacheable partner list')
assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'ownershipTransactionsService.get(row.id)', 'ownership transactions row detail must use service detail')
assertNotIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'const [transactionRows, companyPayload, partnerPayload] = await Promise.all([', 'ownership transactions list must not block initial table on company/partner references')
assertIncludes('app/app/sirket/ortaklik-islemleri/page.tsx', 'const loadReferenceData = useCallback(async (force = false) =>', 'ownership transactions page must lazy-load form references after initial rows')
assertIncludes('lib/modules/ownership-transactions/ownershipTransactions.service.ts', 'approvedForCompany(companyId: string)', 'ownership service must expose cacheable approved transactions lookup')
assertNotIncludes('app/app/sirket/sirketler/ortaklar/page.tsx', 'fetch(`/api/ownership-transactions?company_id=${companyId}&approval_status=approved`)', 'partner detail history must not call approved ownership transactions with raw fetch')
assertIncludes('app/app/sirket/sirketler/ortaklar/page.tsx', 'ownershipTransactionsService.approvedForCompany(companyId)', 'partner detail history must use ownership service cache')
assertNotIncludes('app/app/sirket/sirketler/ortaklar/page.tsx', 'const [partnerPayload, companyPayload, representativePayload] = await Promise.all([', 'partners list must not block initial table on company/representative references')
assertIncludes('app/app/sirket/sirketler/ortaklar/page.tsx', 'const loadRelationContext = useCallback(async (force = false) =>', 'partners page must lazy-load relation context after initial table rows')

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
assertIncludes('app/app/sirket/araclar/page.tsx', 'companyVehicleService.list({ useCache: !force, ...listQuery })', 'vehicles page must use cacheable vehicle service list')
assertIncludes('app/app/sirket/araclar/page.tsx', 'const loadReferences = useCallback(async (force = false) =>', 'vehicles page must lazy-load employee/company references')
assertIncludes('app/app/sirket/araclar/page.tsx', 'data={tableData}', 'vehicles page must memoize table rows before rendering')
assertIncludes('app/app/sirket/araclar/page.tsx', 'onRefresh={() => loadData(true)}', 'vehicles page refresh must force invalidate cache')
assertIncludes('app/api/sirket/araclar/route.ts', "searchParams.get('refs_only') === 'true'", 'vehicles API must expose references-only mode for form data')
assertIncludes('app/api/sirket/araclar/route.ts', "includeReferences ? employees || [] : []", 'vehicles API must not return all employee/company references for the initial list')
assertNotIncludes('app/api/accounting/bank-accounts-cards/_shared.ts', "count: 'planned'", 'bank account/card hot list must not request planned counts')
assertNotIncludes('app/api/accounting/bank-accounts-cards/_shared.ts', "count: 'exact'", 'bank account/card hot list must not request exact counts')
for (const heavyColumn of ['media', 'documents', 'history', 'api_notes']) {
  if (getSelectAfterFrom('app/api/sirket/araclar/route.ts', 'company_vehicles').includes(heavyColumn)) {
    fail(`app/api/sirket/araclar/route.ts: vehicle list select must not include heavy column ${heavyColumn}`)
  }
}

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
assertNotIncludes('app/app/muhasebe/banka-kart-hareketleri/page.tsx', 'const [transactionPayload, connectionPayload] = await Promise.all([', 'bank/card movements list must not block initial table on connection cards')
assertIncludes('app/app/muhasebe/banka-kart-hareketleri/page.tsx', 'const loadConnections = useCallback(async () =>', 'bank/card movements connections must load separately from initial rows')
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
