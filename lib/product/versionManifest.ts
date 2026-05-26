export type ProductMaturity = 'planned' | 'dev' | 'alpha' | 'beta' | 'stable' | 'deprecated'

export type RoadmapStage =
  | 'small_business_core'
  | 'medium_business'
  | 'large_business'
  | 'enterprise'

export interface ProductVersionInfo {
  name: string
  version: string
  maturity: ProductMaturity
  roadmapStage: RoadmapStage
  label: string
  notes?: string
}

export interface PageVersionInfo {
  id: string
  label: string
  href: string
  table?: string
  version: string
  maturity: ProductMaturity
  requiredForSmallBusiness: boolean
  notes?: string
}

export interface ModuleVersionInfo {
  id: string
  label: string
  version: string
  maturity: ProductMaturity
  requiredForSmallBusiness: boolean
  pages: Record<string, PageVersionInfo>
  notes?: string
}

export interface ProductVersionManifest {
  product: ProductVersionInfo
  modules: Record<string, ModuleVersionInfo>
}

export const maturityLabels: Record<ProductMaturity, string> = {
  planned: 'Planlandı',
  dev: 'Geliştiriliyor',
  alpha: 'Temel ekran var, eksikler var',
  beta: 'Kullanılabilir, test ediliyor',
  stable: 'Kullanıma hazır',
  deprecated: 'Kaldırılacak / değiştirilecek',
}

export const roadmapStageLabels: Record<RoadmapStage, string> = {
  small_business_core: 'Küçük Firma Çekirdeği',
  medium_business: 'Orta Ölçekli Firma',
  large_business: 'Büyük Firma',
  enterprise: 'Enterprise',
}

const maturityBadgeClasses: Record<ProductMaturity, string> = {
  planned: 'inline-flex items-center rounded-full border border-gray-300/60 bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-gray-600 dark:border-white/10 dark:bg-white/[0.08] dark:text-gray-300',
  dev: 'inline-flex items-center rounded-full border border-red-300/60 bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200',
  alpha: 'inline-flex items-center rounded-full border border-amber-300/60 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-amber-700 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200',
  beta: 'inline-flex items-center rounded-full border border-emerald-300/60 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200',
  stable: 'inline-flex items-center rounded-full border border-eden-green/30 bg-eden-green-lt px-1.5 py-0.5 text-[9px] font-semibold leading-none text-eden-green-dk dark:border-eden-green/30 dark:bg-eden-green/15 dark:text-emerald-200',
  deprecated: 'inline-flex items-center rounded-full border border-red-300/60 bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200',
}

// Eden ERP versioning is not only a code release number. It also communicates
// product maturity: page readiness, module maturity, and the overall roadmap stage.
export const productVersionManifest: ProductVersionManifest = {
  product: {
    name: 'Eden ERP',
    version: '0.3.0',
    maturity: 'alpha',
    roadmapStage: 'small_business_core',
    label: 'Küçük Firma Çekirdeği',
    notes: 'v0.x.x küçük firma çekirdeğinin geliştirme dönemini; v1.0.0 küçük firma stable sürümünü temsil eder.',
  },
  modules: {
    sirket: {
      id: 'sirket',
      label: 'Şirket Yönetimi',
      version: '0.6.0',
      maturity: 'alpha',
      requiredForSmallBusiness: true,
      notes: 'Sirketlerimiz, Ortaklarimiz ve Temsilcilerimiz sayfalarinda taslak, resmi islem, guvenli kayit guncelleme ve guncel ozet mimarisi uygulanmaya basladi. Sirketlerimiz ve Ortaklarimiz beta seviyesine yaklasirken Temsilcilerimiz manuel test icin alpha seviyesine getirildi.',
      pages: {
        overview: {
          id: 'overview',
          label: 'Şirket Yönetimi',
          href: '/app/sirket',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        companies: {
          id: 'companies',
          label: 'Şirketlerimiz',
          href: '/app/sirket/companies',
          table: 'companies',
          version: '0.9.0',
          maturity: 'beta',
          requiredForSmallBusiness: true,
          notes: 'Sirket karti, asamali detay yukleme, yasam dongusu aksiyonlari, sirket acilisi/tasfiye/terkin akisi, sermaye artirimi ve guvenli islem altyapisi ile manuel test seviyesine getirildi.',
        },
        branches: {
          id: 'branches',
          label: 'Şubelerimiz',
          href: '/app/sirket/companies/branches',
          table: 'company_branches',
          version: '0.1.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
          notes: 'Şube, bağlı şirket altında resmi/operasyonel birim olarak modellenir; açılış ve kapanış resmi şirket operasyonlarıyla yürütülür.',
        },
        partners: {
          id: 'partners',
          label: 'Ortaklarımız',
          href: '/app/sirket/companies/partners',
          table: 'company_partners',
          version: '0.7.0',
          maturity: 'beta',
          requiredForSmallBusiness: true,
          notes: 'Ortak karti taslak olarak acilir; Ilk Ortaklik Girisi, Pay Devri, Kismi Pay Devri, Ortakliktan Cikis, Oy/Kar Payi Degisikligi ve diger ortaklik islemleri resmi islem akisiyle yurutulur. Guncel ortaklik dagilimi guvenli ozet uzerinden hesaplanir.',
        },
        representatives: {
          id: 'representatives',
          label: 'Temsilcilerimiz',
          href: '/app/sirket/companies/representatives',
          table: 'company_representatives',
          version: '0.6.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
          notes: 'Temsilci kartı taslak olarak açılır; temsilcilik başlatma, yetki yenileme, yetki kapsamı değişikliği, limit değişikliği, askıya alma ve sonlandırma işlemleri wizard/transaction mantığına taşındı. Güncel temsil yetkisi v_current_representative_authorities üzerinden okunur. Manuel test öncesi alpha seviyesine yükseltildi.',
        },
        stakeholders: {
          id: 'stakeholders',
          label: 'Paydaşlarımız',
          href: '/app/sirket/companies/stakeholders',
          table: 'stakeholders',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        teskilat: {
          id: 'teskilat',
          label: 'Teşkilat ve Kadro',
          href: '/app/sirket/teskilat',
          table: 'organization_units',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        surecler: {
          id: 'surecler',
          label: 'Süreçlerimiz',
          href: '/app/sirket/surecler',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        tesisler: {
          id: 'tesisler',
          label: 'Tesislerimiz',
          href: '/app/sirket/tesisler',
          table: 'company_facilities',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        araclar: {
          id: 'araclar',
          label: 'Araçlarımız',
          href: '/app/sirket/araclar',
          table: 'company_vehicles',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: false,
        },
        demirbas: {
          id: 'demirbas',
          label: 'Demirbaşlar',
          href: '/app/sirket/demirbas',
          table: 'company_assets',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
      },
    },
    ik: {
      id: 'ik',
      label: 'İnsan Kaynakları',
      version: '0.2.0',
      maturity: 'dev',
      requiredForSmallBusiness: true,
      pages: {
        overview: {
          id: 'overview',
          label: 'İnsan Kaynakları',
          href: '/app/ik',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        employees: {
          id: 'employees',
          label: 'Çalışanlarımız',
          href: '/app/ik/employees',
          table: 'employees',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        personel: {
          id: 'personel',
          label: 'Personel',
          href: '/app/ik/personel',
          table: 'employees',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        teskilat: {
          id: 'teskilat',
          label: 'Teşkilat & Kadro',
          href: '/app/ik/teskilat',
          table: 'organization_units',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        izin: {
          id: 'izin',
          label: 'İzin Yönetimi',
          href: '/app/ik/izin',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
        performans: {
          id: 'performans',
          label: 'Performans',
          href: '/app/ik/performans',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
      },
    },
    muhasebe: {
      id: 'muhasebe',
      label: 'Muhasebe',
      version: '0.2.0',
      maturity: 'dev',
      requiredForSmallBusiness: true,
      pages: {
        overview: {
          id: 'overview',
          label: 'Muhasebe',
          href: '/app/muhasebe',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        dashboard: {
          id: 'dashboard',
          label: 'Muhasebe Dashboard',
          href: '/app/muhasebe/dashboard',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        cari_kartlar: {
          id: 'cari_kartlar',
          label: 'Cari Kartlar',
          href: '/app/muhasebe/cari-kartlar',
          table: 'account_cards',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        on_muhasebe_hareketleri: {
          id: 'on_muhasebe_hareketleri',
          label: 'Ön Muhasebe Hareketleri',
          href: '/app/muhasebe/on-muhasebe-hareketleri',
          table: 'pre_accounting_movements',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        banka_hesaplari_ve_kartlari: {
          id: 'banka_hesaplari_ve_kartlari',
          label: 'Banka Hesapları ve Kartları',
          href: '/app/muhasebe/banka-hesaplari-ve-kartlari',
          table: 'bank_accounts_cards',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        hesap_ve_kart_hareketleri: {
          id: 'hesap_ve_kart_hareketleri',
          label: 'Hesap ve Kart Hareketleri',
          href: '/app/muhasebe/hesap-ve-kart-hareketleri',
          table: 'financial_institution_movements',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        banka_kart_hareketleri: {
          id: 'banka_kart_hareketleri',
          label: 'Banka Kart Hareketleri',
          href: '/app/muhasebe/banka-kart-hareketleri',
          table: 'bank_card_transactions',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        islemler: {
          id: 'islemler',
          label: 'İşlemler',
          href: '/app/muhasebe/islemler',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        borclar: {
          id: 'borclar',
          label: 'Borç Takip',
          href: '/app/muhasebe/borclar',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        projeler: {
          id: 'projeler',
          label: 'Proje Özeti',
          href: '/app/muhasebe/projeler',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        hesaplar: {
          id: 'hesaplar',
          label: 'Hesaplar',
          href: '/app/muhasebe/hesaplar',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
      },
    },
    project_management: {
      id: 'project_management',
      label: 'Görev ve Proje Yönetimi',
      version: '0.1.0',
      maturity: 'dev',
      requiredForSmallBusiness: false,
      pages: {
        overview: {
          id: 'overview',
          label: 'Genel Bakış',
          href: '/app/gorev-ve-proje-yonetimi',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        gorevler: {
          id: 'gorevler',
          label: 'Görevler',
          href: '/app/gorev-ve-proje-yonetimi/gorevler',
          table: 'project_tasks',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        projeler: {
          id: 'projeler',
          label: 'Projeler',
          href: '/app/gorev-ve-proje-yonetimi/projeler',
          table: 'projects',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        kanban_board: {
          id: 'kanban_board',
          label: 'Kanban Board',
          href: '/app/gorev-ve-proje-yonetimi/kanban-board',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        backlog: {
          id: 'backlog',
          label: 'Backlog',
          href: '/app/gorev-ve-proje-yonetimi/backlog',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        sprintler: {
          id: 'sprintler',
          label: 'Sprintler',
          href: '/app/gorev-ve-proje-yonetimi/sprintler',
          table: 'project_sprints',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        takvim: {
          id: 'takvim',
          label: 'Takvim',
          href: '/app/gorev-ve-proje-yonetimi/takvim',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        zaman_takibi: {
          id: 'zaman_takibi',
          label: 'Zaman Takibi',
          href: '/app/gorev-ve-proje-yonetimi/zaman-takibi',
          table: 'project_time_logs',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        is_akislari: {
          id: 'is_akislari',
          label: 'İş Akışları',
          href: '/app/gorev-ve-proje-yonetimi/is-akislari',
          table: 'project_workflows',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        raporlar: {
          id: 'raporlar',
          label: 'Raporlar',
          href: '/app/gorev-ve-proje-yonetimi/raporlar',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
      },
    },
    product_services: {
      id: 'product_services',
      label: 'Ürün ve Hizmetler',
      version: '0.2.0',
      maturity: 'dev',
      requiredForSmallBusiness: true,
      pages: {
        overview: {
          id: 'overview',
          label: 'Genel Bakış',
          href: '/app/urun-ve-hizmetler',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        urun_kartlari: {
          id: 'urun_kartlari',
          label: 'Ürün Kartları',
          href: '/app/urun-ve-hizmetler/urun-kartlari',
          table: 'product_service_items',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        hizmet_kartlari: {
          id: 'hizmet_kartlari',
          label: 'Hizmet Kartları',
          href: '/app/urun-ve-hizmetler/hizmet-kartlari',
          table: 'product_service_items',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        lisans_abonelik_urunleri: {
          id: 'lisans_abonelik_urunleri',
          label: 'Lisans / Abonelik Ürünleri',
          href: '/app/urun-ve-hizmetler/lisans-abonelik-urunleri',
          table: 'product_service_items',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        seri_numarali_urunler: {
          id: 'seri_numarali_urunler',
          label: 'Seri Numaralı Ürünler',
          href: '/app/urun-ve-hizmetler/seri-numarali-urunler',
          table: 'product_serials',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        garanti_sablonlari: {
          id: 'garanti_sablonlari',
          label: 'Garanti Şablonları',
          href: '/app/urun-ve-hizmetler/garanti-sablonlari',
          table: 'warranty_templates',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        bakim_paketleri: {
          id: 'bakim_paketleri',
          label: 'Bakım Paketleri',
          href: '/app/urun-ve-hizmetler/bakim-paketleri',
          table: 'maintenance_packages',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
      },
    },
    after_sales: {
      id: 'after_sales',
      label: 'Satış Sonrası Hizmetler',
      version: '0.2.0',
      maturity: 'dev',
      requiredForSmallBusiness: false,
      pages: {
        overview: {
          id: 'overview',
          label: 'Genel Bakış',
          href: '/app/satis-sonrasi',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        garanti_takip: {
          id: 'garanti_takip',
          label: 'Garanti Takip',
          href: '/app/satis-sonrasi/garanti-takip',
          table: 'after_sales_records',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        lisans_takip: {
          id: 'lisans_takip',
          label: 'Lisans Takip',
          href: '/app/satis-sonrasi/lisans-takip',
          table: 'after_sales_records',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        servis_destek_kayitlari: {
          id: 'servis_destek_kayitlari',
          label: 'Servis ve Destek Kayıtları',
          href: '/app/satis-sonrasi/servis-destek-kayitlari',
          table: 'after_sales_records',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        bakim_sozlesme_takip: {
          id: 'bakim_sozlesme_takip',
          label: 'Bakım ve Sözleşme Takip',
          href: '/app/satis-sonrasi/bakim-sozlesme-takip',
          table: 'after_sales_records',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        musterideki_urunler: {
          id: 'musterideki_urunler',
          label: 'Müşterideki Ürünler',
          href: '/app/satis-sonrasi/musterideki-urunler',
          table: 'customer_assets',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
      },
    },
    sistem: {
      id: 'sistem',
      label: 'Sistem Yönetimi',
      version: '0.3.0',
      maturity: 'alpha',
      requiredForSmallBusiness: true,
      pages: {
        module_licenses: {
          id: 'module_licenses',
          label: 'Modül Lisansları',
          href: '/app/sistem/module-licenses',
          table: 'module_licenses',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        system_parameters: {
          id: 'system_parameters',
          label: 'Sistem Parametreleri',
          href: '/app/sistem/system-parameters',
          table: 'system_parameters',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        entegrasyon_ayarlari: {
          id: 'entegrasyon_ayarlari',
          label: 'Entegrasyon Ayarları',
          href: '/app/sistem/entegrasyon-ayarlari',
          table: 'integration_parameters',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
        kullanici_talepleri: {
          id: 'kullanici_talepleri',
          label: 'Kullanıcı Talepleri',
          href: '/app/sistem/kullanici-talepleri',
          table: 'user_registration_requests',
          version: '0.3.0',
          maturity: 'alpha',
          requiredForSmallBusiness: true,
        },
        kullanicilar: {
          id: 'kullanicilar',
          label: 'Kullanıcılar',
          href: '/app/sistem/kullanicilar',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: true,
        },
        roller: {
          id: 'roller',
          label: 'Roller & Yetkiler',
          href: '/app/sistem/roller',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: true,
        },
        loglar: {
          id: 'loglar',
          label: 'Sistem Logları',
          href: '/app/sistem/loglar',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
        kurulum: {
          id: 'kurulum',
          label: 'Kurulum',
          href: '/app/sistem/kurulum',
          version: '0.2.0',
          maturity: 'dev',
          requiredForSmallBusiness: true,
        },
        login_sayfasi: {
          id: 'login_sayfasi',
          label: 'Login Sayfası',
          href: '/app/sistem/login-sayfasi',
          version: '0.1.0',
          maturity: 'dev',
          requiredForSmallBusiness: false,
        },
      },
    },
    uretim: {
      id: 'uretim',
      label: 'Üretim',
      version: '0.0.0',
      maturity: 'planned',
      requiredForSmallBusiness: false,
      pages: {
        is_emirleri: {
          id: 'is_emirleri',
          label: 'İş Emirleri',
          href: '/app/uretim/is-emirleri',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
        receteler: {
          id: 'receteler',
          label: 'Reçeteler',
          href: '/app/uretim/receteler',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
      },
    },
    stok: {
      id: 'stok',
      label: 'Stok Yönetimi',
      version: '0.0.0',
      maturity: 'planned',
      requiredForSmallBusiness: false,
      pages: {
        urunler: {
          id: 'urunler',
          label: 'Ürün Listesi',
          href: '/app/stok/urunler',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
        hareketler: {
          id: 'hareketler',
          label: 'Depo Hareketleri',
          href: '/app/stok/hareketler',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
        sayim: {
          id: 'sayim',
          label: 'Sayım',
          href: '/app/stok/sayim',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
      },
    },
    satis: {
      id: 'satis',
      label: 'Satış',
      version: '0.0.0',
      maturity: 'planned',
      requiredForSmallBusiness: false,
      pages: {
        teklifler: {
          id: 'teklifler',
          label: 'Teklifler',
          href: '/app/satis/teklifler',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
        siparisler: {
          id: 'siparisler',
          label: 'Siparişler',
          href: '/app/satis/siparisler',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
        musteriler: {
          id: 'musteriler',
          label: 'Müşteriler',
          href: '/app/satis/musteriler',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
      },
    },
    servis: {
      id: 'servis',
      label: 'Teknik Servis',
      version: '0.0.0',
      maturity: 'planned',
      requiredForSmallBusiness: false,
      pages: {
        kayitlar: {
          id: 'kayitlar',
          label: 'Servis Kayıtları',
          href: '/app/servis/kayitlar',
          version: '0.0.0',
          maturity: 'planned',
          requiredForSmallBusiness: false,
        },
      },
    },
  },
}

export function getProductVersion() {
  return productVersionManifest.product.version
}

export function getProductVersionLabel() {
  const product = productVersionManifest.product
  return `${product.name} ${formatVersionBadge(product.version, product.maturity)}`
}

export function getModuleVersion(moduleId: string) {
  return getModuleVersionInfo(moduleId)?.version
}

export function getModuleMaturity(moduleId: string) {
  return getModuleVersionInfo(moduleId)?.maturity
}

export function getPageVersion(moduleId: string, pageId: string) {
  return getPageVersionInfo(moduleId, pageId)?.version
}

export function getPageMaturity(moduleId: string, pageId: string) {
  return getPageVersionInfo(moduleId, pageId)?.maturity
}

export function getModuleVersionInfo(moduleId: string | undefined) {
  if (!moduleId) return undefined
  return productVersionManifest.modules[moduleId]
}

export function getPageVersionInfo(moduleId: string | undefined, pageId: string | undefined) {
  if (!moduleId || !pageId) return undefined
  return productVersionManifest.modules[moduleId]?.pages[pageId]
}

export function getPageVersionInfoByHref(moduleId: string | undefined, href: string | undefined) {
  if (!moduleId || !href) return undefined
  const pages = productVersionManifest.modules[moduleId]?.pages
  if (!pages) return undefined
  return Object.values(pages).find(page => page.href === href)
}

export function getMaturityLabel(maturity: ProductMaturity) {
  return maturityLabels[maturity]
}

export function getRoadmapStageLabel(stage: RoadmapStage) {
  return roadmapStageLabels[stage]
}

export function getMaturityBadgeClass(maturity: ProductMaturity) {
  return maturityBadgeClasses[maturity]
}

export function formatVersionBadge(version: string | undefined, maturity: ProductMaturity | undefined) {
  if (!version || !maturity || maturity === 'planned' || version === '0.0.0') return 'planned'
  return `${formatCompactVersion(version)}-${maturity}`
}

function formatCompactVersion(version: string) {
  const parts = version.split('.')
  if (parts.length !== 3) return `v${version}`
  const [major, minor, patch] = parts
  return patch === '0' ? `v${major}.${minor}` : `v${major}.${minor}.${patch}`
}
