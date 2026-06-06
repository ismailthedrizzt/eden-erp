export type ReleaseStatus =
  | 'release'
  | 'development'
  | 'development_demo'
  | 'development_internal'
  | 'coming_soon'
  | 'hidden'
  | 'broken_do_not_show'

export interface RouteReleaseConfig {
  route: string
  moduleKey: string
  label: string
  releaseStatus: ReleaseStatus
  showInNavigation: boolean
  showInSearch: boolean
  showInCommandPalette: boolean
  requiresPermission?: string[]
  comingSoonMessage?: string
  notes?: string
}

const RELEASE_NOTES = 'Initial approved release surface; still requires normal auth, tenant and scope checks.'
const DEVELOPMENT_NOTES = 'Not visible in the single VS environment until explicitly promoted.'
const INTERNAL_NOTES = 'Internal, admin, audit, integration, portal or operational surface; hidden from normal VS users.'

export const routeReleaseRegistry = [
  route('/', 'shell', 'Root redirect', 'hidden', false, false, false, { notes: 'Redirect shell; not listed in navigation.' }),
  route('/login', 'auth', 'Login', 'release', false, false, false, { notes: RELEASE_NOTES }),
  route('/offline', 'pwa', 'Offline', 'release', false, false, false, { notes: RELEASE_NOTES }),
  route('/release-not-available', 'release', 'Route not available', 'hidden', false, false, false),

  route('/app', 'home', 'Ana Sayfa', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/dashboard', 'reporting', 'Yonetim Dashboard', 'development', true, true, true),
  route('/app/onboarding', 'settings', 'Baslangic Merkezi', 'development', true, true, true),
  route('/app/yardim', 'help', 'Yardim', 'development', true, true, true),
  route('/app/ayarlar/bildirimler', 'notifications', 'Bildirimler', 'development_internal', false, false, false),
  route('/app/belgeler', 'documents', 'Belgeler', 'development_internal', true, true, true, {
    requiresPermission: ['documents.view'],
    notes: INTERNAL_NOTES,
  }),

  route('/app/sirket', 'companies', 'Sirket module hub', 'development', true, true, true),
  route('/app/sirket/companies', 'companies', 'Sirketlerimiz', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/sirket/companies/branches', 'branches', 'Subelerimiz', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/sirket/companies/partners', 'partners', 'Ortaklarimiz', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/sirket/companies/representatives', 'representatives', 'Temsilcilerimiz', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/sirket/companies/stakeholders', 'crm', 'Company stakeholders', 'development', true, true, true),
  route('/app/sirket/tesisler', 'facilities', 'Tesisler/Lokasyonlar', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/sirket/teskilat', 'organization', 'Teskilat/Kadro', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/sirket/araclar', 'assets', 'Araclar', 'development', true, true, true),
  route('/app/sirket/demirbas', 'assets', 'Demirbas', 'development', true, true, true),
  route('/app/sirket/surecler', 'process', 'Sirket surecleri', 'development', true, true, true),
  route('/app/sirket/paydaslar', 'crm', 'Legacy sirket paydaslar alias', 'hidden', false, false, false),

  route('/app/muhasebe', 'accounting', 'Muhasebe dashboard', 'development', true, true, true),
  route('/app/muhasebe/cari-kartlar', 'accounting', 'Cari Kartlar', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/muhasebe/cari-hareketler', 'accounting', 'Cari Hareketler', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/muhasebe/on-muhasebe-hareketleri', 'accounting', 'On Muhasebe Hareketleri', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/muhasebe/banka-hesaplari-ve-kartlari', 'accounting', 'Banka Hesaplari ve Kartlari', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/muhasebe/banka-kart-hareketleri', 'accounting', 'Banka Kart Hareketleri', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/muhasebe/hesap-ve-kart-hareketleri', 'accounting', 'Hesap ve Kart Hareketleri', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/muhasebe/dashboard', 'accounting', 'Muhasebe Dashboard', 'development', true, true, true),
  route('/app/muhasebe/mutabakat', 'accounting', 'Mutabakat', 'development', true, true, true),
  route('/app/muhasebe/sermaye-mutabakati', 'accounting', 'Sermaye Mutabakati', 'development', true, true, true),
  route('/app/muhasebe/banka-hareketleri', 'accounting', 'Banka Hareketleri', 'development', true, true, true),
  route('/app/muhasebe/banka-hesaplari', 'accounting', 'Banka Hesaplari', 'development', true, true, true),
  route('/app/muhasebe/borclar', 'accounting', 'Borclar', 'development', true, true, true),
  route('/app/muhasebe/e-fatura-e-arsiv', 'accounting', 'E-Fatura / E-Arsiv', 'development', true, true, true),
  route('/app/muhasebe/hesaplar', 'accounting', 'Hesaplar', 'development', true, true, true),
  route('/app/muhasebe/islemler', 'accounting', 'Muhasebe Islemleri', 'development', true, true, true),
  route('/app/muhasebe/projeler', 'accounting', 'Muhasebe Proje Ozeti', 'development', true, true, true),

  route('/app/ik/calisanlar', 'hr', 'Calisanlar', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/ik/employees', 'hr', 'Calisanlar legacy-rich', 'development', true, true, true),
  route('/app/ik/personel', 'hr', 'Personel legacy-rich', 'development', true, true, true),
  route('/app/ik/personel-ekle', 'hr', 'Personel ekle', 'coming_soon', true, true, true, {
    comingSoonMessage: 'Bu personel olusturma deneyimi yayin onayi bekliyor.',
  }),
  route('/app/ik/personel/[id]', 'hr', 'Personel detay', 'coming_soon', false, true, false, {
    comingSoonMessage: 'Bu personel detay deneyimi yayin onayi bekliyor.',
  }),
  route('/app/ik/teskilat', 'hr', 'IK Teskilat', 'development', true, true, true),
  route('/app/ik/calisma-planlari', 'hr', 'Calisma Planlari', 'development', true, true, true),
  route('/app/ik/devam-devamsizlik', 'hr', 'Devam Devamsizlik', 'development', true, true, true),
  route('/app/ik/izin-bakiyeleri', 'hr', 'Izin Bakiyeleri', 'development', true, true, true),
  route('/app/ik/izinler', 'hr', 'Izinler', 'development', true, true, true),
  route('/app/ik/izin-turleri', 'hr', 'Izin Turleri', 'development', true, true, true),
  route('/app/ik/puantaj', 'hr', 'Puantaj', 'development', true, true, true),

  route('/app/crm/paydaslar', 'crm', 'CRM Paydaslar', 'development', true, true, true),
  route('/app/crm/leadler', 'crm', 'CRM Leadler', 'development', true, true, true),
  route('/app/crm/firsatlar', 'crm', 'CRM Firsatlar', 'development', true, true, true),
  route('/app/crm/pipeline', 'crm', 'CRM Pipeline', 'development', true, true, true),
  route('/app/crm/pipeline-ayarlari', 'crm', 'CRM Pipeline Ayarlari', 'development', true, true, true),
  route('/app/crm/takipler', 'crm', 'CRM Takipler', 'development', true, true, true),

  route('/app/sozlesmeler', 'contracts', 'Sozlesmeler', 'development', true, true, true, {
    requiresPermission: ['contracts.view'],
    notes: DEVELOPMENT_NOTES,
  }),
  route('/app/sozlesmeler/[id]', 'contracts', 'Sozlesme detayi', 'development', false, true, false, {
    requiresPermission: ['contracts.view'],
    notes: DEVELOPMENT_NOTES,
  }),
  route('/app/sozlesmeler/yeni', 'contracts', 'Yeni sozlesme', 'development', true, true, true, {
    requiresPermission: ['contracts.create'],
    notes: DEVELOPMENT_NOTES,
  }),
  route('/app/sozlesmeler/yenilemeler', 'contracts', 'Sozlesme yenilemeleri', 'development', true, true, true, { notes: DEVELOPMENT_NOTES }),
  route('/app/sozlesmeler/fesihler', 'contracts', 'Sozlesme fesihleri', 'development', true, true, true, { notes: DEVELOPMENT_NOTES }),
  route('/app/sozlesmeler/turler', 'contracts', 'Sozlesme turleri', 'development', true, true, true, { notes: DEVELOPMENT_NOTES }),
  route('/app/satis/sozlesmeler', 'contracts', 'Legacy sozlesme yonetimi redirect', 'hidden', false, false, false),

  route('/app/gorev-ve-proje-yonetimi', 'project_management', 'Gorev ve Proje Yonetimi', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/gorevler', 'project_management', 'Gorevler', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/projeler', 'project_management', 'Projeler', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/kanban-board', 'project_management', 'Kanban Board', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/backlog', 'project_management', 'Backlog', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/sprintler', 'project_management', 'Sprintler', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/takvim', 'project_management', 'Takvim', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/zaman-takibi', 'project_management', 'Zaman Takibi', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/is-akislari', 'project_management', 'Is Akislari', 'development', true, true, true),
  route('/app/gorev-ve-proje-yonetimi/raporlar', 'project_management', 'Raporlar', 'development', true, true, true),

  route('/app/urun-ve-hizmetler', 'product_services', 'Urun ve Hizmetler', 'development', true, true, true),
  route('/app/urun-ve-hizmetler/katalog', 'product_services', 'Urun/Hizmet Katalogu', 'development', true, true, true),
  route('/app/urun-ve-hizmetler/urun-kartlari', 'product_services', 'Urun Kartlari', 'development', true, true, true),
  route('/app/urun-ve-hizmetler/hizmet-kartlari', 'product_services', 'Hizmet Kartlari', 'development', true, true, true),
  route('/app/urun-ve-hizmetler/lisans-abonelik-urunleri', 'product_services', 'Lisans Abonelik Urunleri', 'development', true, true, true),
  route('/app/urun-ve-hizmetler/seri-numarali-urunler', 'product_services', 'Seri Numarali Urunler', 'development', true, true, true),
  route('/app/urun-ve-hizmetler/garanti-sablonlari', 'product_services', 'Garanti Sablonlari', 'development', true, true, true),
  route('/app/urun-ve-hizmetler/bakim-paketleri', 'product_services', 'Bakim Paketleri', 'development', true, true, true),

  route('/app/satis-sonrasi', 'after_sales', 'Satis Sonrasi', 'development', true, true, true),
  route('/app/satis-sonrasi/kurulu-urunler', 'after_sales', 'Kurulu Urunler', 'development', true, true, true),
  route('/app/satis-sonrasi/servis-talepleri', 'after_sales', 'Servis Talepleri', 'development', true, true, true),
  route('/app/satis-sonrasi/servis-kayitlari', 'after_sales', 'Servis Kayitlari', 'development', true, true, true),
  route('/app/satis-sonrasi/bakimi-gelenler', 'after_sales', 'Bakimi Gelenler', 'development', true, true, true),
  route('/app/satis-sonrasi/bakim-planlari', 'after_sales', 'Bakim Planlari', 'development', true, true, true),
  route('/app/satis-sonrasi/bakim-sozlesme-takip', 'after_sales', 'Bakim Sozlesme Takip', 'development', true, true, true),
  route('/app/satis-sonrasi/checklistler', 'after_sales', 'Checklistler', 'development', true, true, true),
  route('/app/satis-sonrasi/garanti-takip', 'after_sales', 'Garanti Takip', 'development', true, true, true),
  route('/app/satis-sonrasi/lisans-takip', 'after_sales', 'Lisans Takip', 'development', true, true, true),
  route('/app/satis-sonrasi/mobil-servis/[assignment_id]', 'after_sales', 'Mobil Servis', 'development', false, true, false),
  route('/app/satis-sonrasi/musterideki-urunler', 'after_sales', 'Musterideki Urunler', 'development', true, true, true),
  route('/app/satis-sonrasi/saha-gorevleri', 'after_sales', 'Saha Gorevleri', 'development', true, true, true),
  route('/app/satis-sonrasi/servis-destek-kayitlari', 'after_sales', 'Servis Destek Kayitlari', 'development', true, true, true),

  route('/app/raporlama/ozel-raporlar', 'reporting', 'Ozel Raporlar', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/raporlama/zamanlanmis-raporlar', 'reporting', 'Zamanlanmis Raporlar', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/surecler', 'process', 'Surecler', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/surecler/[id]', 'process', 'Surec Detay', 'development_internal', false, true, false, { notes: INTERNAL_NOTES }),

  route('/app/sistem', 'adminConsole', 'Admin Console', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/genel', 'adminConsole', 'Genel Ayarlar', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/moduller', 'adminConsole', 'Moduller', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/ozellikler', 'adminConsole', 'Ozellikler', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/saglik', 'adminConsole', 'Sistem Sagligi', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/outbox', 'adminConsole', 'Outbox', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/entegrasyonlar', 'integrations', 'Entegrasyonlar', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/entegrasyon-ayarlari', 'integrations', 'Entegrasyon Ayarlari', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/teknik', 'adminConsole', 'Teknik', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/ai-copilot', 'aiCopilot', 'AI Copilot', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/import', 'importExport', 'Data Import', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/export', 'importExport', 'Data Export / Bulk', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/veri-kalitesi', 'dataQuality', 'Veri Kalitesi', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/e-postalar', 'notifications', 'Sistem E-postalari', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/kullanicilar', 'security', 'Kullanicilar', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/roller', 'security', 'Roller', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/yetkiler', 'security', 'Yetkiler', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/audit', 'audit', 'Denetim Izi', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/otomasyonlar', 'automation', 'Otomasyonlar', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/module-licenses', 'settings', 'Modul Lisanslari', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/system-parameters', 'settings', 'Sistem Parametreleri', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/kullanici-talepleri', 'settings', 'Kullanici Talepleri', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/app/sistem/kurulum', 'settings', 'Kurulum Merkezi', 'release', true, true, true, { notes: RELEASE_NOTES }),
  route('/app/sistem/login-sayfasi', 'settings', 'Login sayfasi ayarlari', 'coming_soon', true, true, true),

  route('/portal', 'portal', 'Portal Shell', 'development_internal', false, true, false, { notes: INTERNAL_NOTES }),
  route('/portal/dashboard', 'portal', 'Portal Dashboard', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/portal/products', 'portal', 'Portal Products', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/portal/products/[id]', 'portal', 'Portal Product Detail', 'development_internal', false, true, false, { notes: INTERNAL_NOTES }),
  route('/portal/service-requests', 'portal', 'Portal Service Requests', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/portal/service-requests/[id]', 'portal', 'Portal Service Request Detail', 'development_internal', false, true, false, { notes: INTERNAL_NOTES }),
  route('/portal/service-records', 'portal', 'Portal Service Records', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/portal/documents', 'portal', 'Portal Documents', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),
  route('/portal/profile', 'portal', 'Portal Profile', 'development_internal', true, true, true, { notes: INTERNAL_NOTES }),

  route('/app/demo/document-slot-uploader', 'demo', 'Document slot demo', 'development_demo', false, false, false),
  route('/app/demo/image-slot-uploader', 'demo', 'Image slot demo', 'development_demo', false, false, false),
  route('/app/demo/user-avatar', 'demo', 'User avatar demo', 'development_demo', false, false, false),
  route('/test', 'demo', 'Test route', 'development_demo', false, false, false),

  route('/muhasebe', 'legacy', 'Legacy muhasebe root', 'hidden', false, false, false),
  route('/muhasebe/cari-kartlar', 'legacy', 'Legacy cari kartlar', 'hidden', false, false, false),
  route('/muhasebe/cari-hareketler', 'legacy', 'Legacy cari hareketler', 'hidden', false, false, false),
  route('/muhasebe/on-muhasebe-hareketleri', 'legacy', 'Legacy on muhasebe hareketleri', 'hidden', false, false, false),
  route('/muhasebe/banka-hesaplari-ve-kartlari', 'legacy', 'Legacy banka hesaplari ve kartlari', 'hidden', false, false, false),
  route('/muhasebe/banka-kart-hareketleri', 'legacy', 'Legacy banka kart hareketleri', 'hidden', false, false, false),
  route('/muhasebe/hesap-ve-kart-hareketleri', 'legacy', 'Legacy hesap ve kart hareketleri', 'hidden', false, false, false),
  route('/ik/personel', 'legacy', 'Legacy personel', 'hidden', false, false, false),
  route('/ayarlar/entegrasyon-ayarlari', 'legacy', 'Legacy entegrasyon ayarlari', 'hidden', false, false, false),
] satisfies RouteReleaseConfig[]

const registryByRoute = new Map(routeReleaseRegistry.map(config => [normalizeRoutePath(config.route), config]))

export function listRouteReleaseConfigs() {
  return [...routeReleaseRegistry]
}

export function getRouteReleaseConfig(pathname: string): RouteReleaseConfig | null {
  const normalized = normalizeRoutePath(pathname)
  return registryByRoute.get(normalized)
    || routeReleaseRegistry.find(config => matchesRoutePattern(normalized, normalizeRoutePath(config.route)))
    || null
}

export function getRouteReleaseStatus(pathname: string): ReleaseStatus {
  return getRouteReleaseConfig(pathname)?.releaseStatus || 'development'
}

export function normalizeRoutePath(pathname: string) {
  const withoutQuery = (pathname || '/').split('?')[0] || '/'
  const normalized = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

function matchesRoutePattern(pathname: string, pattern: string) {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3)
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  }

  if (!pattern.includes('[')) return false

  const pathSegments = pathname.split('/').filter(Boolean)
  const patternSegments = pattern.split('/').filter(Boolean)
  if (pathSegments.length !== patternSegments.length) return false

  return patternSegments.every((segment, index) => {
    if (segment.startsWith('[') && segment.endsWith(']')) return Boolean(pathSegments[index])
    return segment === pathSegments[index]
  })
}

function route(
  routePath: string,
  moduleKey: string,
  label: string,
  releaseStatus: ReleaseStatus,
  showInNavigation: boolean,
  showInSearch: boolean,
  showInCommandPalette: boolean,
  options: Partial<Omit<RouteReleaseConfig, 'route' | 'moduleKey' | 'label' | 'releaseStatus' | 'showInNavigation' | 'showInSearch' | 'showInCommandPalette'>> = {}
): RouteReleaseConfig {
  return {
    route: routePath,
    moduleKey,
    label,
    releaseStatus,
    showInNavigation,
    showInSearch,
    showInCommandPalette,
    notes: options.notes || (releaseStatus === 'release' ? RELEASE_NOTES : DEVELOPMENT_NOTES),
    ...options,
  }
}
