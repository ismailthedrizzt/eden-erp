const fs = require('fs')
const path = require('path')

const root = process.cwd()
const registryPath = path.join(root, 'lib/release/routeReleaseRegistry.ts')
const failures = []
const warnings = []

if (!fs.existsSync(registryPath)) {
  console.error('FAIL')
  console.error('- lib/release/routeReleaseRegistry.ts is missing.')
  process.exit(1)
}

const registryText = fs.readFileSync(registryPath, 'utf8')
const registry = parseRegistry(registryText)
const pageRoutes = collectPageRoutes(path.join(root, 'app')).sort()
const registryRoutes = new Set(registry.map(row => row.route))
const validStatuses = new Set([
  'release',
  'development',
  'development_demo',
  'development_internal',
  'coming_soon',
  'hidden',
  'broken_do_not_show',
])

const releasePromotedRoutes = [
  '/login',
  '/offline',
  '/app',
  '/app/aboneligim',
  '/app/profil',
  '/app/sirket/companies',
  '/app/sirket/companies/partners',
  '/app/sirket/companies/representatives',
  '/app/ik/calisanlar',
  '/app/sistem/kurulum',
]

const developmentTenantOnlyRoutes = [
  '/app/design-lab',
  '/app/development/temalarimiz',
  '/app/sirket/companies/branches',
  '/app/sirket/tesisler',
  '/app/sirket/teskilat',
  '/app/muhasebe/cari-kartlar',
  '/app/muhasebe/cari-hareketler',
  '/app/muhasebe/on-muhasebe-hareketleri',
  '/app/muhasebe/banka-hesaplari-ve-kartlari',
  '/app/muhasebe/banka-kart-hareketleri',
  '/app/muhasebe/hesap-ve-kart-hareketleri',
]

for (const required of releasePromotedRoutes) {
  const item = registry.find(row => row.route === required)
  if (!item) failures.push(`Missing required release route: ${required}`)
  else if (item.status !== 'release') failures.push(`${required} must have release status.`)
}

for (const tenantOnly of developmentTenantOnlyRoutes) {
  const item = registry.find(row => row.route === tenantOnly)
  if (!item) failures.push(`Missing required development tenant route: ${tenantOnly}`)
  else if (item.status === 'release') failures.push(`${tenantOnly} must stay tenant-development gated, not release.`)
}

for (const pageRoute of pageRoutes) {
  if (!hasMatchingRegistryRoute(pageRoute, registryRoutes)) {
    failures.push(`Page route missing from release registry: ${pageRoute}`)
  }
}

for (const row of registry) {
  if (!validStatuses.has(row.status)) {
    failures.push(`Unknown release status for ${row.route}: ${row.status}`)
  }
  if (!hasMatchingPageRoute(row.route, pageRoutes) && !row.route.endsWith('/**')) {
    warnings.push(`Registry route has no page.tsx match: ${row.route}`)
  }
  if (row.status === 'release' && /(^\/test$|\/demo\/|legacy|^\/muhasebe|^\/ik\/|^\/ayarlar\/)/i.test(row.route)) {
    failures.push(`Demo/test/legacy route cannot be release-visible: ${row.route}`)
  }
  if (row.status === 'hidden' && (row.showInNavigation || row.showInSearch || row.showInCommandPalette)) {
    failures.push(`hidden route cannot show in navigation/search/command palette: ${row.route}`)
  }
  if (row.status === 'broken_do_not_show' && (row.showInNavigation || row.showInSearch || row.showInCommandPalette)) {
    failures.push(`broken_do_not_show route cannot show in navigation/search/command palette: ${row.route}`)
  }
  if (row.status === 'development_demo' && (row.showInNavigation || row.showInSearch || row.showInCommandPalette)) {
    warnings.push(`Development demo route is discoverable outside direct URL: ${row.route}`)
  }
}

checkVisibilityContracts()

console.log(`Release registry check: ${registry.length} registry routes, ${pageRoutes.length} page routes`)
for (const warning of warnings) console.warn(`WARN: ${warning}`)

if (failures.length) {
  console.error('FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PASS')

function parseRegistry(text) {
  const rows = []
  const pattern = /route\(\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([^']+)'\s*,\s*(true|false)\s*,\s*(true|false)\s*,\s*(true|false)/g
  let match
  while ((match = pattern.exec(text))) {
    rows.push({
      route: normalizeRoute(match[1]),
      status: match[2],
      showInNavigation: match[3] === 'true',
      showInSearch: match[4] === 'true',
      showInCommandPalette: match[5] === 'true',
    })
  }
  return rows
}

function checkVisibilityContracts() {
  const visibilityPath = path.join(root, 'lib/release/releaseVisibility.ts')
  const middlewarePath = path.join(root, 'middleware.ts')
  const sidebarPath = path.join(root, 'components/layout/Sidebar.tsx')
  const appLayoutPath = path.join(root, 'app/app/layout.tsx')
  const commandPalettePath = path.join(root, 'components/search/CommandPalette.tsx')
  const actionGuidePath = path.join(root, 'components/ai/ActionGuideSearch.tsx')

  for (const requiredFile of [
    visibilityPath,
    middlewarePath,
    sidebarPath,
    appLayoutPath,
    commandPalettePath,
    actionGuidePath,
  ]) {
    if (!fs.existsSync(requiredFile)) {
      failures.push(`Release visibility contract file is missing: ${path.relative(root, requiredFile).replace(/\\/g, '/')}`)
    }
  }

  if (failures.length) return

  const visibilityText = fs.readFileSync(visibilityPath, 'utf8')
  const middlewareText = fs.readFileSync(middlewarePath, 'utf8')
  const sidebarText = fs.readFileSync(sidebarPath, 'utf8')
  const appLayoutText = fs.readFileSync(appLayoutPath, 'utf8')
  const commandPaletteText = fs.readFileSync(commandPalettePath, 'utf8')
  const actionGuideText = fs.readFileSync(actionGuidePath, 'utf8')

  if (!/canSeeDevelopmentSurface/.test(visibilityText) || !/tenantEntitlements/.test(visibilityText)) {
    failures.push('releaseVisibility must evaluate tenant entitlements for development surfaces.')
  }
  if (!/env\s*===\s*'release'[\s\S]*status\s*!==\s*'release'[\s\S]*!canSeeInternalSurface/.test(visibilityText)) {
    failures.push('releaseVisibility must restrict normal release tenants to release routes only.')
  }
  if (!/status\s*===\s*'hidden'[\s\S]*blocked/.test(visibilityText)) {
    failures.push('releaseVisibility must block hidden routes.')
  }
  if (!/status\s*===\s*'broken_do_not_show'[\s\S]*blocked/.test(visibilityText)) {
    failures.push('releaseVisibility must block broken_do_not_show routes.')
  }
  if (!/status\s*===\s*'coming_soon'[\s\S]*env\s*!==\s*'release'\s*\|\|\s*surface\s*===\s*'direct'/.test(visibilityText)) {
    failures.push('releaseVisibility must hide coming_soon routes from release navigation/search/command palette surfaces.')
  }
  if (!/surface\s*===\s*'navigation'[\s\S]*showInNavigation/.test(visibilityText)) {
    failures.push('releaseVisibility must enforce navigation surface flags.')
  }
  if (!/surface\s*===\s*'search'[\s\S]*showInSearch/.test(visibilityText)) {
    failures.push('releaseVisibility must enforce search surface flags.')
  }
  if (!/surface\s*===\s*'commandPalette'[\s\S]*showInCommandPalette/.test(visibilityText)) {
    failures.push('releaseVisibility must enforce command palette surface flags.')
  }
  if (!/getRouteReleaseDecision\(pathname,\s*undefined,\s*'direct',\s*\{\s*tenantEntitlements\s*\}\)/.test(middlewareText)) {
    failures.push('middleware must evaluate direct route release visibility with tenant entitlements.')
  }
  if (!/getTenantEntitlementsForRouteGuard/.test(middlewareText)) {
    failures.push('middleware must load tenant entitlements before applying the direct route guard.')
  }
  if (!/!decision\.visible\s*\|\|\s*!decision\.enabled/.test(middlewareText)) {
    failures.push('middleware must block disabled direct routes, including coming soon routes.')
  }
  if (!/getRouteNotAvailableHref/.test(middlewareText) || !/NextResponse\.rewrite/.test(middlewareText)) {
    failures.push('middleware must rewrite blocked direct routes to the release not available state.')
  }
  if (!/isReleaseUnavailablePage/.test(middlewareText) || !/isPublic[\s\S]*isReleaseUnavailablePage/.test(middlewareText)) {
    failures.push('release-not-available route must stay public so direct guard rewrites do not turn into login redirects.')
  }
  if (!/getRouteReleaseDecision\([^)]*'navigation'/.test(sidebarText)) {
    failures.push('Sidebar must filter items through release navigation visibility.')
  }
  if (!/canShowRouteInNavigation/.test(appLayoutText)) {
    failures.push('App layout navigation must filter actions through release navigation visibility.')
  }
  if (!/getRouteReleaseDecision\([^)]*'commandPalette'/.test(commandPaletteText)) {
    failures.push('Command palette must filter results through release visibility.')
  }
  if (!/getRouteReleaseDecision\([^)]*'action'/.test(actionGuideText)) {
    failures.push('Action guide must filter suggested actions through release visibility.')
  }
}

function collectPageRoutes(appDir) {
  const routes = []
  walk(appDir, file => {
    if (path.basename(file) !== 'page.tsx') return
    const relative = path.relative(root, file).replace(/\\/g, '/')
    routes.push(pagePathToRoute(relative))
  })
  return routes
}

function pagePathToRoute(relative) {
  const withoutPrefix = relative.replace(/^app\//, '').replace(/(^|\/)page\.tsx$/, '')
  if (!withoutPrefix) return '/'
  return normalizeRoute(`/${withoutPrefix}`)
}

function normalizeRoute(route) {
  return route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route
}

function hasMatchingRegistryRoute(pageRoute, registryRoutes) {
  if (registryRoutes.has(pageRoute)) return true
  return [...registryRoutes].some(pattern => patternMatches(pageRoute, pattern))
}

function hasMatchingPageRoute(route, pageRoutes) {
  if (pageRoutes.includes(route)) return true
  return pageRoutes.some(pageRoute => patternMatches(pageRoute, route))
}

function patternMatches(route, pattern) {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3)
    return route === prefix || route.startsWith(`${prefix}/`)
  }
  if (!pattern.includes('[')) return false
  const routeParts = route.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)
  if (routeParts.length !== patternParts.length) return false
  return patternParts.every((part, index) => part.startsWith('[') && part.endsWith(']') ? Boolean(routeParts[index]) : part === routeParts[index])
}

function walk(current, onFile) {
  if (!fs.existsSync(current)) return
  const stat = fs.statSync(current)
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(current)) walk(path.join(current, child), onFile)
    return
  }
  onFile(current)
}
