const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const failures = []

function filePath(relativePath) {
  return path.join(root, relativePath)
}

function read(relativePath) {
  return fs.readFileSync(filePath(relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(filePath(relativePath))
}

function fail(message) {
  failures.push(message)
}

function assertExists(relativePath, message) {
  if (!exists(relativePath)) fail(`${relativePath}: ${message}`)
}

function assertMissing(relativePath, message) {
  if (exists(relativePath)) fail(`${relativePath}: ${message}`)
}

function assertIncludes(file, text, message) {
  if (!read(file).includes(text)) fail(`${file}: ${message}`)
}

function assertIncludesAny(file, texts, message) {
  const content = read(file)
  if (!texts.some((text) => content.includes(text))) fail(`${file}: ${message}`)
}

function assertNotIncludes(file, text, message) {
  if (read(file).includes(text)) fail(`${file}: ${message}`)
}

function walkFiles(relativeDir, extensions, files = []) {
  const absoluteDir = filePath(relativeDir)
  if (!fs.existsSync(absoluteDir)) return files

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue
      walkFiles(relativePath, extensions, files)
      continue
    }
    if (extensions.has(path.extname(entry.name))) files.push(relativePath.replace(/\\/g, '/'))
  }

  return files
}

function normalizeSqlIdentifier(identifier) {
  return identifier
    .replace(/["`;(),]/g, '')
    .split('.')
    .pop()
    .trim()
    .toLowerCase()
}

const forbiddenDatabaseIdentifierParts = new Set([
  'ad',
  'adres',
  'belge',
  'birim',
  'bolum',
  'calisma',
  'cikis',
  'diger',
  'dokuman',
  'egitim',
  'giris',
  'gorev',
  'isim',
  'kadro',
  'meslek',
  'muhasebe',
  'nakit',
  'okul',
  'ortak',
  'paydas',
  'personel',
  'sirket',
  'tarih',
  'telefon',
  'temsilci',
  'vergi',
  'yakin',
])

function validateDatabaseIdentifier(file, kind, identifier) {
  const name = normalizeSqlIdentifier(identifier)
  if (!name) return
  if (/[^a-z0-9_]/.test(name)) {
    fail(`${file}: ${kind} identifier "${name}" must use ASCII snake_case`)
    return
  }

  const forbidden = name
    .split('_')
    .filter(Boolean)
    .find((part) => forbiddenDatabaseIdentifierParts.has(part) || part.includes('alias'))

  if (forbidden) {
    fail(`${file}: ${kind} identifier "${name}" must use the canonical English database naming contract`)
  }
}

function validateCreateTableColumns(relativePath, content) {
  const tablePattern = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"?[a-zA-Z_][\w]*"?\.)?"?[a-zA-Z_][\w]*"?)\s*\(([\s\S]*?)\);/gi
  for (const match of content.matchAll(tablePattern)) {
    validateDatabaseIdentifier(relativePath, 'table', match[1])
    const body = match[2]
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim().replace(/,$/, '')
      if (!line || /^--/.test(line)) continue
      if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|EXCLUDE)\b/i.test(line)) {
        const constraint = /^CONSTRAINT\s+("?[a-zA-Z_][\w]*"?)/i.exec(line)?.[1]
        if (constraint) validateDatabaseIdentifier(relativePath, 'constraint', constraint)
        continue
      }
      const column = /^("?[a-zA-Z_][\w]*"?)/.exec(line)?.[1]
      if (column) validateDatabaseIdentifier(relativePath, 'column', column)
    }
  }
}

function assertCanonicalMigrationContract() {
  const migrationDir = filePath('supabase/migrations')
  const migrations = fs.existsSync(migrationDir)
    ? fs.readdirSync(migrationDir).filter((entry) => entry.endsWith('.sql')).sort()
    : []

  if (!migrations.includes('20260516_initial_schema.sql')) {
    fail('supabase/migrations: canonical 20260516_initial_schema.sql migration is required')
    return
  }

  const relativePath = 'supabase/migrations/20260516_initial_schema.sql'
  const content = read(relativePath)

  validateDatabaseIdentifier(relativePath, 'migration file', migrations[0].replace(/^\d{8}_/, '').replace(/\.sql$/, ''))
  validateCreateTableColumns(relativePath, content)

  const identifierPatterns = [
    { kind: 'view', pattern: /\bCREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+((?:"?[a-zA-Z_][\w]*"?\.)?"?[a-zA-Z_][\w]*"?)/gi },
    { kind: 'index', pattern: /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"?[a-zA-Z_][\w]*"?\.)?"?[a-zA-Z_][\w]*"?)/gi },
  ]

  for (const { kind, pattern } of identifierPatterns) {
    for (const match of content.matchAll(pattern)) {
      validateDatabaseIdentifier(relativePath, kind, match[1])
    }
  }

  for (const forbidden of ['ALTER TABLE', 'RENAME ', 'BACKFILL', ' legacy ', ' alias ']) {
    if (content.toUpperCase().includes(forbidden.trim().toUpperCase())) {
      fail(`${relativePath}: initial schema must not contain migration compatibility operation "${forbidden.trim()}"`)
    }
  }
}

function assertNoFieldNameAliasCode() {
  const sourceRoots = ['app', 'components', 'hooks', 'lib', 'types']
  const extensions = new Set(['.ts', '.tsx', '.js', '.jsx'])
  const patterns = [
    /\balias(?:es|ed|ing)?\b/i,
    /normalize[A-Za-z0-9]*Alias/,
  ]

  for (const sourceRoot of sourceRoots) {
    for (const file of walkFiles(sourceRoot, extensions)) {
      const content = read(file)
      if (patterns.some((pattern) => pattern.test(content))) {
        fail(`${file}: field-name aliases are prohibited; use one canonical English name and projectGlossary labels`)
      }
    }
  }
}

function assertCanonicalApiRoutes() {
  for (const route of [
    'app/api/companies/route.ts',
    'app/api/companies/[company_id]/route.ts',
    'app/api/companies/partners/route.ts',
    'app/api/companies/representatives/route.ts',
    'app/api/companies/stakeholders/route.ts',
    'app/api/companies/vehicles/route.ts',
    'app/api/employees/route.ts',
    'app/api/employees/[employeeId]/route.ts',
    'app/api/organization/route.ts',
  ]) {
    assertExists(route, 'canonical English API route must exist')
  }

  for (const route of [
    'app/api/sirket',
    'app/api/sirketler',
    'app/api/ik/personel',
    'app/api/ik/teskilat',
  ]) {
    assertMissing(route, 'legacy Turkish API route must not exist')
  }

  for (const route of [
    'app/app/sirket/companies/page.tsx',
    'app/app/sirket/companies/partners/page.tsx',
    'app/app/sirket/companies/representatives/page.tsx',
    'app/app/sirket/companies/stakeholders/page.tsx',
  ]) {
    assertExists(route, 'canonical English frontend route must exist')
  }

  assertMissing('app/app/sirket/sirketler', 'legacy Turkish frontend company route must not exist')

  assertIncludes('app/api/employees/route.ts', 'first_name', 'employee API must use first_name')
  assertNotIncludes('app/api/employees/route.ts', "'ad'", 'employee API must not select or sort by ad')
  assertIncludes('app/api/organization/route.ts', "order('name')", 'organization API must order units by name')
  assertNotIncludes('app/api/organization/route.ts', "legacy", 'organization API must not use legacy unit fields')
  assertIncludes('app/api/companies/route.ts', 'phone', 'company API must use phone')
  assertNotIncludes('app/api/companies/route.ts', 'telefon', 'company API must not use telefon')
  assertIncludes('app/app/sirket/companies/page.tsx', 'partners', 'company frontend must use partners')
  assertIncludes('app/app/sirket/companies/page.tsx', 'representatives', 'company frontend must use representatives')
  assertIncludes('app/app/sirket/companies/page.tsx', 'stakeholders', 'company frontend must use stakeholders')
  assertNotIncludes('app/app/sirket/companies/page.tsx', 'telefon', 'company frontend must not use telefon')
  assertNotIncludes('app/app/sirket/companies/page.tsx', 'ortaklar', 'company frontend must not use ortaklar as a data key')
  assertNotIncludes('app/app/sirket/companies/page.tsx', 'temsilciler', 'company frontend must not use temsilciler as a data key')
  assertNotIncludes('app/app/sirket/companies/page.tsx', 'paydaslar', 'company frontend must not use paydaslar as a data key')
}

function assertDocumentationContract() {
  assertIncludes('docs/ai-context/contracts-and-guards.md', 'Pipeline adlandirma ve sozluk kontrati', 'frontend rules must document the canonical naming and glossary contract')
  assertIncludes('docs/ai-context/contracts-and-guards.md', 'Pipeline naming contract', 'backend API migration rules must document the full pipeline naming contract')
  assertIncludes('docs/ai-context/contracts-and-guards.md', 'Veritabani adlandirma kontrati', 'Supabase policy must document the database naming contract')
  assertIncludes('docs/ai-context/collaboration-guide.md', 'Do not add compatibility aliases', 'AI collaboration guide must reject field-name aliases')
  assertIncludes('lib/projectGlossary.ts', 'export const projectGlossary', 'project glossary must be the shared home for user-facing labels')
}

function assertCorePerformanceContract() {
  assertIncludes('lib/api/listEndpoint.ts', 'export function parseListQuery', 'list endpoint standard must expose query parser')
  assertIncludes('lib/api/listEndpoint.ts', 'export function listRange', 'list endpoint standard must expose backend range helper')
  assertIncludes('lib/api/listEndpoint.ts', 'export function listMetaFromRows', 'list endpoint standard must expose count-free approximate meta helper')
  assertIncludes('components/ui/SmartDataTable.tsx', 'pagination?: ServerPaginationConfig', 'SmartDataTable props must expose server pagination')
  assertIncludes('components/ui/SmartDataTable.tsx', 'if (isServerPaginated) return data', 'SmartDataTable server mode must not client-filter/sort the current backend page')

  for (const route of [
    'app/api/companies/route.ts',
    'app/api/employees/route.ts',
    'app/api/companies/partners/route.ts',
    'app/api/companies/representatives/route.ts',
    'app/api/companies/stakeholders/route.ts',
    'app/api/companies/vehicles/route.ts',
  ]) {
    assertIncludes(route, 'parseListQuery', 'main ERP list endpoint must parse the standard list query')
    assertIncludesAny(route, ['listMetaFromRows', 'safeListRecords'], 'main ERP list endpoint must return count-free pagination metadata')
    assertNotIncludes(route, "count: 'exact'", 'hot list endpoint must not request exact counts')
  }
}

assertNoFieldNameAliasCode()
assertCanonicalMigrationContract()
assertCanonicalApiRoutes()
assertDocumentationContract()
assertCorePerformanceContract()

if (failures.length) {
  console.error('Performance contract check failed:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Performance contract check passed.')
