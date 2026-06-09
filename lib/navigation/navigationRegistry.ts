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
  item('reportingCustomReports', 'Ozel Raporlar', '/app/raporlama/ozel-raporlar', 'file-spreadsheet', 'reporting', 21, {
    permission: 'reporting.customReportsManage',
    featureFlag: 'reporting.customReports',
  }),
  item('reportingScheduledReports', 'Zamanlanmis Raporlar', '/app/raporlama/zamanlanmis-raporlar', 'calendar-clock', 'reporting', 22, {
    permission: 'reporting.scheduledReportsManage',
    featureFlag: 'reporting.scheduledReports',
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
  item('crmLeads', 'Leadler', '/app/crm/leadler', 'user-plus', 'crm', 351, {
    parentKey: 'crm',
    permission: 'crm.leadsView',
    featureFlag: 'crm.leads',
  }),
  item('crmOpportunities', 'Firsatlar', '/app/crm/firsatlar', 'chart-line', 'crm', 352, {
    parentKey: 'crm',
    permission: 'crm.opportunitiesView',
    featureFlag: 'crm.opportunities',
  }),
  item('crmPipeline', 'Pipeline', '/app/crm/pipeline', 'kanban', 'crm', 353, {
    parentKey: 'crm',
    permission: 'crm.opportunitiesView',
    featureFlag: 'crm.pipeline',
  }),
  item('crmFollowups', 'Takipler', '/app/crm/takipler', 'calendar-clock', 'crm', 354, {
    parentKey: 'crm',
    permission: 'crm.followupManage',
    featureFlag: 'crm.followups',
  }),
  item('projectManagement', 'Gorev ve Proje Yonetimi', '/app/gorev-ve-proje-yonetimi', 'list-checks', 'project_management', 400),
  item('contracts', 'Sozlesmeler', '/app/sozlesmeler', 'file-text', 'contracts', 480, {
    permission: 'contracts.view',
    fallbackPermission: 'companies.view',
    featureFlag: 'contracts.enabled',
  }),
  item('documents', 'Belgeler', '/app/belgeler', 'file-archive', 'documents', 500, {
    permission: 'documents.view',
    fallbackPermission: 'companies.view',
    featureFlag: 'documents.enabled',
  }),
  item('settings', 'Sistem Yonetimi', '/app/sistem', 'settings', 'adminConsole', 900, {
    permission: 'adminConsole.view',
    fallbackPermission: 'settings.view',
    featureFlag: 'adminConsole.enabled',
  }),
  item('workspaceSettings', 'Genel Ayarlar', '/app/sistem/genel', 'sliders-horizontal', 'adminConsole', 901, {
    parentKey: 'settings',
    permission: 'adminConsole.manage',
    fallbackPermission: 'settings.edit',
    featureFlag: 'adminConsole.workspaceSettings',
  }),
  item('adminModules', 'Moduller', '/app/sistem/moduller', 'wrench', 'adminConsole', 902, {
    parentKey: 'settings',
    permission: 'adminConsole.manage',
    fallbackPermission: 'settings.modulesManage',
    featureFlag: 'adminConsole.enabled',
  }),
  item('adminFeatures', 'Ozellikler', '/app/sistem/ozellikler', 'flag', 'adminConsole', 903, {
    parentKey: 'settings',
    permission: 'adminConsole.manage',
    fallbackPermission: 'settings.edit',
    featureFlag: 'adminConsole.enabled',
  }),
  item('adminHealth', 'Sistem Sagligi', '/app/sistem/saglik', 'activity', 'adminConsole', 904, {
    parentKey: 'settings',
    permission: 'adminConsole.view',
    fallbackPermission: 'settings.view',
    featureFlag: 'adminConsole.healthDashboard',
  }),
  item('adminOutbox', 'Outbox', '/app/sistem/outbox', 'send', 'adminConsole', 905, {
    parentKey: 'settings',
    permission: 'adminConsole.outboxAdmin',
    fallbackPermission: 'outbox.dispatch',
    featureFlag: 'adminConsole.outboxAdmin',
  }),
  item('adminIntegrations', 'Entegrasyonlar', '/app/sistem/entegrasyonlar', 'database', 'integrations', 906, {
    parentKey: 'settings',
    permission: 'integrations.view',
    fallbackPermission: 'settings.edit',
    featureFlag: 'integrations.enabled',
  }),
  item('adminTechnical', 'Teknik', '/app/sistem/teknik', 'key-round', 'adminConsole', 907, {
    parentKey: 'settings',
    permission: 'adminConsole.technical',
    fallbackPermission: 'system.admin',
    featureFlag: 'adminConsole.technicalPage',
  }),
  item('automationRules', 'Otomasyonlar', '/app/sistem/otomasyonlar', 'workflow', 'automation', 908, {
    parentKey: 'settings',
    permission: 'automation.view',
    fallbackPermission: 'settings.view',
    featureFlag: 'automation.enabled',
  }),
  item('aiCopilotSettings', 'AI Copilot', '/app/sistem/ai-copilot', 'sparkles', 'aiCopilot', 909, {
    parentKey: 'settings',
    permission: 'aiCopilot.manageSettings',
    fallbackPermission: 'system.admin',
    featureFlag: 'aiCopilot.enabled',
  }),
  item('subscription', 'Aboneligim', '/app/aboneligim', 'credit-card', 'settings', 909.5, {
    permission: 'settings.view',
  }),
  item('development', 'Development', '/app/development', 'palette', 'adminConsole', 910.5, {
    permission: 'adminConsole.manage',
    fallbackPermission: 'system.admin',
    featureFlag: 'adminConsole.enabled',
  }),
  item('developmentThemes', 'Temalarımız', '/app/development/temalarimiz', 'palette', 'adminConsole', 910.6, {
    parentKey: 'development',
    permission: 'adminConsole.manage',
    fallbackPermission: 'system.admin',
    featureFlag: 'adminConsole.enabled',
  }),
  item('visualThemes', 'Temalarımız eski route', '/app/sistem/temalar', 'palette', 'adminConsole', 912, {
    parentKey: 'settings',
    permission: 'adminConsole.manage',
    fallbackPermission: 'system.admin',
    featureFlag: 'adminConsole.enabled',
  }),
  item('moduleLicenses', 'Modul Lisanslari', '/app/sistem/module-licenses', 'settings', 'settings', 910, {
    parentKey: 'settings',
    permission: 'settings.modulesManage',
    fallbackPermission: 'settings.view',
  }),
  item('tenantLicenses', 'Lisanslar', '/app/sistem/lisanslar', 'credit-card', 'adminConsole', 913, {
    parentKey: 'settings',
    permission: 'settings.modulesManage',
    fallbackPermission: 'system.admin',
    featureFlag: 'adminConsole.enabled',
  }),
  item('setup', 'Kurulum', '/app/sistem/kurulum', 'wrench', 'settings', 920, {
    parentKey: 'settings',
    permission: 'settings.modulesManage',
    fallbackPermission: 'settings.view',
  }),
  item('securityUsers', 'Kullanicilar', '/app/sistem/kullanicilar', 'users', 'security', 931, {
    parentKey: 'settings',
    permission: 'security.view',
    fallbackPermission: 'settings.view',
  }),
  item('securityRoles', 'Roller', '/app/sistem/roller', 'shield', 'security', 932, {
    parentKey: 'settings',
    permission: 'security.view',
    fallbackPermission: 'settings.view',
  }),
  item('securityPermissions', 'Yetki Matrisi', '/app/sistem/yetkiler', 'list', 'security', 933, {
    parentKey: 'settings',
    permission: 'security.view',
    fallbackPermission: 'settings.view',
  }),
  item('audit', 'Denetim Izi', '/app/sistem/audit', 'list', 'audit', 930, {
    parentKey: 'settings',
    permission: 'audit.view',
    fallbackPermission: 'settings.view',
    featureFlag: 'auditLog.enabled',
  }),
  item('dataImport', 'Data Import', '/app/sistem/import', 'upload', 'importExport', 934, {
    parentKey: 'settings',
    permission: 'import.view',
    fallbackPermission: 'settings.view',
    featureFlag: 'dataImport.enabled',
  }),
  item('dataExport', 'Data Export / Bulk', '/app/sistem/export', 'download', 'importExport', 935, {
    parentKey: 'settings',
    permission: 'export.create',
    fallbackPermission: 'settings.view',
    featureFlag: 'dataExport.enabled',
  }),
  item('dataQuality', 'Veri Kalitesi', '/app/sistem/veri-kalitesi', 'shield-alert', 'dataQuality', 936, {
    parentKey: 'settings',
    permission: 'dataQuality.view',
    fallbackPermission: 'settings.view',
    featureFlag: 'dataQuality.enabled',
  }),
  item('systemEmails', 'Sistem E-postalari', '/app/sistem/e-postalar', 'mail', 'notifications', 937, {
    parentKey: 'settings',
    permission: 'email.admin',
    fallbackPermission: 'settings.view',
    featureFlag: 'notifications.email',
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
