import { employeesDashboardLayout } from '@/lib/modules/employees/dashboard/employeesDashboard.config'
import { companyGeographicReachWidgetConfig } from '@/lib/modules/companies/dashboard/companyGeographicReach.config'

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

interface WidgetRegistryGroupRecord {
  moduleKey: string
  moduleLabel: string
  pageKey: string
  pageLabel: string
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

const companyWidgets: DashboardWidgetRegistryRecord[] = [
  {
    id: companyGeographicReachWidgetConfig.id,
    title: companyGeographicReachWidgetConfig.title,
    description: 'Şirket bağlantılarını ve ticari ağı Türkiye/Dünya haritası üzerinde gösterir.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'sirketler',
    pageLabel: 'Şirketler',
    pagePath: '/app/sirket/sirketler',
  },
]

const ownershipTransactionWidgets: DashboardWidgetRegistryRecord[] = [
  {
    id: 'ownership-this-month',
    title: 'Bu Ayki İşlem Sayısı',
    description: 'Ortaklık işlemleri sayfasında bu ay açılan işlemleri gösterir.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'ownership-transactions',
    pageLabel: 'Ortaklık İşlemleri',
    pagePath: '/app/sirket/ortaklik-islemleri',
  },
  {
    id: 'ownership-type-distribution',
    title: 'İşlem Türü Dağılımı',
    description: 'Ortaklık işlemlerini işlem tipine göre dağıtır.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'ownership-transactions',
    pageLabel: 'Ortaklık İşlemleri',
    pagePath: '/app/sirket/ortaklik-islemleri',
  },
  {
    id: 'ownership-approval-status',
    title: 'Onay Durumu',
    description: 'Ortaklık işlemlerinin onay durumlarını gösterir.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'ownership-transactions',
    pageLabel: 'Ortaklık İşlemleri',
    pagePath: '/app/sirket/ortaklik-islemleri',
  },
  {
    id: 'ownership-pending',
    title: 'Bekleyen İşlemler',
    description: 'Onay bekleyen ortaklık işlemi sayısını gösterir.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'ownership-transactions',
    pageLabel: 'Ortaklık İşlemleri',
    pagePath: '/app/sirket/ortaklik-islemleri',
  },
  {
    id: 'ownership-share-delta',
    title: 'Toplam Pay Değişimi',
    description: 'Ortaklık işlemlerindeki toplam pay hareketini gösterir.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'ownership-transactions',
    pageLabel: 'Ortaklık İşlemleri',
    pagePath: '/app/sirket/ortaklik-islemleri',
  },
  {
    id: 'ownership-actions',
    title: 'Dikkat Gerektiren İşlemler',
    description: 'Belge, onay ve hesaplama uyarılarını listeler.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'ownership-transactions',
    pageLabel: 'Ortaklık İşlemleri',
    pagePath: '/app/sirket/ortaklik-islemleri',
  },
]

export const dashboardWidgetRegistry: DashboardWidgetRegistryRecord[] = [
  ...homeWidgets,
  ...companyWidgets,
  ...employeeWidgets,
  ...ownershipTransactionWidgets,
]

export const legacyHomeWidgetIdMap: Record<string, string> = {
  ik_ozeti: 'employees-total',
  kadro_doluluk: 'employees-department',
  duyurular: 'home-actions',
  gorevlerim: 'home-actions',
}

export function uniqueWidgetModules(records: WidgetRegistryGroupRecord[] = dashboardWidgetRegistry) {
  return uniqueBy(records.map(record => ({
    key: record.moduleKey,
    label: record.moduleLabel,
  })), item => item.key)
}

export function uniqueWidgetPages(records: WidgetRegistryGroupRecord[] = dashboardWidgetRegistry, moduleKey?: string) {
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
