export interface NavigationItem {
  key: string
  label: string
  path: string
  icon?: string
  moduleKey?: string
  parentKey?: string
  order?: number
  permission?: string
  fallbackPermission?: string
  featureFlag?: string
  exact?: boolean
  children?: NavigationItem[]
}

export const navigationItems = [
  item('dashboard', 'Ana Sayfa', '/app', 'home', undefined, 10, { exact: true }),
  item('managementDashboard', 'Yonetim Dashboard', '/app/dashboard', 'bar-chart', 'reporting', 20, {
    permission: 'reporting.dashboardView',
    fallbackPermission: 'reporting.view',
  }),
  item('sirket', 'Sirket Yonetimi', '/app/sirket', 'building', 'companies', 100),
  item('companies', 'Sirketlerimiz', '/app/sirket/companies', 'building', 'companies', 110, {
    parentKey: 'sirket',
    permission: 'companies.view',
  }),
  item('branches', 'Subelerimiz', '/app/sirket/companies/branches', 'branch', 'branches', 120, {
    parentKey: 'sirket',
    permission: 'branches.view',
    fallbackPermission: 'companies.view',
  }),
  item('partners', 'Ortaklarimiz', '/app/sirket/companies/partners', 'users', 'partners', 130, {
    parentKey: 'sirket',
    permission: 'partners.view',
    fallbackPermission: 'companies.view',
  }),
  item('representatives', 'Temsilcilerimiz', '/app/sirket/companies/representatives', 'user', 'representatives', 140, {
    parentKey: 'sirket',
    permission: 'representatives.view',
    fallbackPermission: 'companies.view',
  }),
  item('organization', 'Teskilat/Kadro', '/app/sirket/teskilat', 'list', 'organization', 150, {
    parentKey: 'sirket',
    permission: 'organization.view',
    fallbackPermission: 'companies.view',
  }),
  item('facilities', 'Tesisler/Lokasyonlar', '/app/sirket/tesisler', 'factory', 'facilities', 160, {
    parentKey: 'sirket',
    permission: 'facilities.view',
    fallbackPermission: 'companies.view',
  }),
  item('accounting', 'Muhasebe', '/app/muhasebe', 'credit-card', 'accounting', 200),
  item('hr', 'Insan Kaynaklari', '/app/ik', 'users', 'hr', 300),
  item('crm', 'CRM / Paydaslar', '/app/crm/paydaslar', 'handshake', 'crm', 350, {
    permission: 'crm.view',
    fallbackPermission: 'stakeholders.view',
  }),
  item('projectManagement', 'Gorev ve Proje Yonetimi', '/app/gorev-ve-proje-yonetimi', 'list-checks', 'project_management', 400),
  item('settings', 'Sistem Yonetimi', '/app/sistem', 'settings', 'settings', 900),
  item('moduleLicenses', 'Modul Lisanslari', '/app/sistem/module-licenses', 'settings', 'settings', 910, {
    parentKey: 'settings',
    permission: 'settings.modules.manage',
    fallbackPermission: 'settings.view',
  }),
  item('setup', 'Kurulum', '/app/sistem/kurulum', 'wrench', 'settings', 920, {
    parentKey: 'settings',
    permission: 'settings.modules.manage',
    fallbackPermission: 'settings.view',
  }),
  item('audit', 'Denetim Izi', '/app/sistem/audit', 'list', 'audit', 930, {
    parentKey: 'settings',
    permission: 'audit.view',
    fallbackPermission: 'settings.view',
    featureFlag: 'auditLog.enabled',
  }),
  item('processes', 'Surecler', '/app/surecler', 'workflow', 'process', 940, {
    permission: 'settings.view',
    featureFlag: 'processEngine.enabled',
  }),
  item('actionCenter', 'Is Merkezi', '/app', 'bell', 'actionCenter', 950, {
    featureFlag: 'actionCenter.enabled',
  }),
] satisfies NavigationItem[]

const navigationByKey = new Map(navigationItems.map(navItem => [navItem.key, navItem]))

export function listNavigationItems() {
  return [...navigationItems]
}

export function getNavigationItem(key: string) {
  return navigationByKey.get(key) || null
}

export function findNavigationItemByPath(path: string) {
  const normalized = normalizePath(path)
  return navigationItems
    .slice()
    .sort((a, b) => b.path.length - a.path.length)
    .find(navItem => navItem.exact ? normalizePath(navItem.path) === normalized : normalized.startsWith(normalizePath(navItem.path))) || null
}

function item(
  key: string,
  label: string,
  path: string,
  icon: string,
  moduleKey: string | undefined,
  order: number,
  options: Partial<Omit<NavigationItem, 'key' | 'label' | 'path' | 'icon' | 'moduleKey' | 'order'>> = {}
): NavigationItem {
  return {
    key,
    label,
    path,
    icon,
    moduleKey,
    order,
    ...options,
  }
}

function normalizePath(path: string) {
  const withoutQuery = path.split('?')[0] || '/'
  return withoutQuery.endsWith('/') && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery
}
