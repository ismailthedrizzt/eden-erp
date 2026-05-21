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

function assertBefore(file, earlier, later, message) {
  const content = read(file)
  const earlierIndex = content.indexOf(earlier)
  const laterIndex = content.indexOf(later)
  if (earlierIndex === -1 || laterIndex === -1 || earlierIndex > laterIndex) fail(`${file}: ${message}`)
}

function assertPermissionTenantContract() {
  assertIncludes('lib/security/serverPermissions.ts', 'verifyAppSessionToken', 'app sessions must be verified server-side')
  assertIncludes('lib/security/serverPermissions.ts', 'validateTenantMembership', 'app sessions must be checked against tenant membership')
  assertIncludes('lib/security/serverPermissions.ts', 'userHasPermissionSafe', 'permission checks must be resolved server-side')
  assertIncludes('lib/security/serverPermissions.ts', 'TENANT_ACCESS_DENIED', 'tenant mismatch must fail closed')

  assertIncludes('lib/crud/safeCrudService.ts', 'applyTenantQueryScope(query, options.tableName, tenantContext)', 'read/list operations must apply tenant scope')
  assertIncludes('lib/crud/safeCrudService.ts', 'withTenantInsertScopeForTable(options.values, options.tableName, tenantContext)', 'create operations must stamp tenant scope')
  assertIncludes('lib/crud/safeCrudService.ts', 'applyTenantQueryScope(updateQuery, options.tableName, tenantContext)', 'update operations must be tenant scoped')

  assertIncludes('lib/workflow/safeHardDeleteDraftRecord.ts', 'resolveTenantContext(options.request)', 'hard delete flow must resolve tenant context')
  assertIncludes('lib/workflow/safeHardDeleteDraftRecord.ts', 'applyTenantQueryScope(recordQuery, options.tableName, tenantContext)', 'hard delete record fetch must be tenant scoped')
  assertIncludes('lib/workflow/safeHardDeleteDraftRecord.ts', 'applyTenantQueryScope(deleteQuery, options.tableName, tenantContext)', 'hard delete mutation must be tenant scoped')
  assertBefore('lib/workflow/safeHardDeleteDraftRecord.ts', 'const permission = await resolvePermission(options)', 'let recordQuery = options.supabase', 'hard delete must check permission before fetching records')
}

function assertCacheContract() {
  assertIncludes('lib/api/serverResponseCache.ts', "import 'server-only'", 'server cache must stay server-only')
  assertIncludes('lib/api/serverResponseCache.ts', 'APP_SESSION_COOKIE_NAME', 'server cache key must include app session scope')
  assertIncludes('lib/api/serverResponseCache.ts', 'TENANT_ID_HEADER', 'server cache key must include tenant header scope')
  assertIncludes('lib/api/serverResponseCache.ts', 'WORKSPACE_ID_COOKIE', 'server cache key must include workspace cookie scope')
  assertIncludes('lib/api/serverResponseCache.ts', 'stableHash(sessionToken)', 'server cache key must not expose raw session tokens')
}

function assertAuthHardeningContract() {
  assertIncludes('lib/auth/emailOtp.ts', 'randomInt(100000, 1000000)', 'OTP codes must use cryptographic randomness')
  assertIncludes('lib/auth/emailOtp.ts', "process.env.NODE_ENV === 'production' ? '' : process.env.CRON_SECRET", 'production OTP must not fall back to CRON_SECRET')
  assertIncludes('lib/auth/appSession.ts', "process.env.NODE_ENV === 'production' ? ''", 'production app sessions must require an explicit app session secret')
  assertNotIncludes('lib/auth/appSession.ts', 'SUPABASE_SERVICE_ROLE_KEY', 'app session signing must not fall back to the Supabase service role key')
  assertIncludes('app/api/auth/otp/send/route.ts', 'EDEN_ALLOW_SCREEN_OTP', 'screen OTP fallback must be explicitly gated')
  assertIncludes('app/api/auth/otp/send/route.ts', 'SMS_OTP_NOT_CONFIGURED', 'phone OTP must fail closed when SMS delivery is not configured')
  assertIncludes('app/api/auth/otp/send/route.ts', 'enforceRateLimit', 'OTP send endpoint must be rate limited')
  assertIncludes('app/api/auth/otp/route.ts', 'enforceRateLimit', 'OTP verify endpoint must be rate limited')
  assertIncludes('app/api/auth/otp/route.ts', 'createSetupIntentToken', 'signup OTP verification must issue a signed setup intent')
  assertIncludes('app/api/settings/setup-wizard/route.ts', 'verifySetupIntentToken', 'setup wizard mutations must require a signed setup intent')
  assertIncludes('app/api/settings/setup-wizard/route.ts', 'SETUP_IDENTITY_MISMATCH', 'setup wizard must bind submitted person identity to verified OTP identity')
}

function assertApiSurfaceHardeningContract() {
  assertIncludes('middleware.ts', 'ORIGIN_REJECTED', 'unsafe API methods must reject foreign origins')
  assertIncludes('middleware.ts', 'X-Frame-Options', 'responses must include frame protection')
  assertIncludes('middleware.ts', 'Content-Security-Policy', 'responses must include baseline CSP protection')
  assertIncludes('middleware.ts', 'X-Content-Type-Options', 'responses must disable MIME sniffing')
  assertIncludes('app/api/uploads/documents/route.ts', 'requirePermission', 'document uploads must require permission')
  assertIncludes('app/api/uploads/documents/route.ts', 'MAX_DOCUMENT_BYTES', 'document uploads must have a size limit')
  assertIncludes('app/api/uploads/documents/route.ts', 'ALLOWED_DOCUMENT_TYPES', 'document uploads must restrict MIME types')
  assertIncludes('app/api/uploads/documents/route.ts', 'tenantContext.tenantId', 'document storage paths must be tenant-scoped')
  assertIncludes('app/api/uploads/documents/signed-url/route.ts', 'STORAGE_PATH_FORBIDDEN', 'signed URL creation must reject paths outside the tenant scope')
  assertIncludes('app/api/uploads/image-variants/route.ts', 'requirePermission', 'image processing endpoint must require permission')
  assertIncludes('app/api/ai/cv-extract/route.ts', 'requirePermission', 'AI CV extraction must require permission')
  assertIncludes('app/api/ai/cv-extract/route.ts', 'MAX_CV_BYTES', 'AI CV extraction must enforce a file size limit')
  assertIncludes('app/api/ai/cv-extract/route.ts', 'enforceRateLimit', 'AI CV extraction must be rate limited')
}

function assertReferenceContract() {
  for (const file of [
    'app/api/reference/tax-offices/route.ts',
    'app/api/reference/trade-registry-offices/route.ts',
    'app/api/reference/sgk-codes/route.ts',
  ]) {
    assertIncludes(file, 'referenceQueryRequiredResponse', 'large reference endpoint must reject unbounded requests')
    assertIncludes(file, 'wantsFullReferencePayload', 'large reference endpoint must require an explicit full payload flag')
  }

  assertIncludes('app/api/reference/turkey-locations/route.ts', 'scopedBaseResponse', 'location endpoint must avoid returning the full location tree for scoped requests')
  assertIncludes('app/api/reference/turkey-locations/route.ts', "scope || 'provinces'", 'location endpoint must default to province-only payloads')
  assertIncludes('components/ui/EntityForm.tsx', '/api/reference/turkey-locations?scope=provinces', 'entity forms must load province-only location data')
  assertIncludes('components/ui/EntityForm.tsx', '/api/reference/sgk-codes?category=', 'SGK selectors must load category-sized payloads')
  assertNotIncludes('components/ui/EntityForm.tsx', 'getFallbackTurkeyLocations', 'entity forms must not bundle the full Turkey location fallback')
  assertIncludes('app/app/sistem/kurulum/page.tsx', 'remoteEndpoint="/api/reference/tax-offices"', 'setup wizard tax office selector must use remote search')
  assertIncludes('app/app/sistem/kurulum/page.tsx', '/api/reference/turkey-locations?scope=provinces', 'setup wizard must load province-only location data')
}

assertPermissionTenantContract()
assertCacheContract()
assertAuthHardeningContract()
assertApiSurfaceHardeningContract()
assertReferenceContract()

if (failures.length) {
  console.error('Security/reference contract check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Security/reference contract check passed.')
