import { employeesDashboardLayout } from '@/lib/modules/employees/dashboard/employeesDashboard.config'

export interface DashboardWidgetRegistryRecord {
  id: string
  title: string
  description?: string
  moduleKey: string
  moduleLabel: string
  pageKey: string
  pageLabel: string
  pagePath: string
}

const homeWidgets: DashboardWidgetRegistryRecord[] = [
  {
    id: 'home-tenure',
    title: 'Çalışma Süresi',
    description: 'Ana sayfada kullanıcıya ait işe başlangıç süresini gösterir.',
    moduleKey: 'genel',
    moduleLabel: 'Genel',
    pageKey: 'home',
    pageLabel: 'Ana Sayfa',
    pagePath: '/app',
  },
  {
    id: 'home-birthday',
    title: 'Doğum Günü',
    description: 'Kullanıcının doğum günü durumunu ana sayfada gösterir.',
    moduleKey: 'genel',
    moduleLabel: 'Genel',
    pageKey: 'home',
    pageLabel: 'Ana Sayfa',
    pagePath: '/app',
  },
  {
    id: 'home-actions',
    title: 'Kısa Aksiyonlar',
    description: 'Ana sayfada hızlı takip edilecek aksiyonları listeler.',
    moduleKey: 'genel',
    moduleLabel: 'Genel',
    pageKey: 'home',
    pageLabel: 'Ana Sayfa',
    pagePath: '/app',
  },
]

const employeeWidgets: DashboardWidgetRegistryRecord[] = employeesDashboardLayout.map(widget => ({
  id: widget.id,
  title: widget.title,
  description: widget.description || dataSourceLabel(widget.dataSource),
  moduleKey: 'ik',
  moduleLabel: 'İnsan Kaynakları',
  pageKey: 'ik-personel',
  pageLabel: 'Çalışanlarımız',
  pagePath: '/app/ik/personel',
}))

export const dashboardWidgetRegistry: DashboardWidgetRegistryRecord[] = [
  ...homeWidgets,
  ...employeeWidgets,
]

export const legacyHomeWidgetIdMap: Record<string, string> = {
  ik_ozeti: 'employees-total',
  kadro_doluluk: 'employees-department',
  duyurular: 'home-actions',
  gorevlerim: 'home-actions',
}

export function uniqueWidgetModules(records = dashboardWidgetRegistry) {
  return uniqueBy(records.map(record => ({
    key: record.moduleKey,
    label: record.moduleLabel,
  })), item => item.key)
}

export function uniqueWidgetPages(records = dashboardWidgetRegistry, moduleKey?: string) {
  return uniqueBy(records
    .filter(record => !moduleKey || record.moduleKey === moduleKey)
    .map(record => ({
      key: record.pageKey,
      label: record.pageLabel,
      moduleKey: record.moduleKey,
    })), item => `${item.moduleKey}:${item.key}`)
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function dataSourceLabel(value: string) {
  return value.split('.').slice(-1)[0]?.replace(/([A-Z])/g, ' $1').trim() || value
}
