export interface FeatureFlag {
  key: string
  moduleKey: string
  label: string
  defaultEnabled: boolean
  description?: string
  dependencies?: string[]
  risk?: string
}

export const featureFlags = [
  {
    key: 'actionGuide.enabled',
    moduleKey: 'settings',
    label: 'Islem Rehberi',
    description: 'Kullaniciyi dogru modul, kurulum veya resmi islem yoluna yonlendirir.',
    defaultEnabled: true,
  },
  {
    key: 'guidedTour.enabled',
    moduleKey: 'settings',
    label: 'Rehberli tur',
    description: 'Urun ekranlarinda kisa tanitim turlari gosterir.',
    defaultEnabled: true,
  },
  {
    key: 'onboarding.enabled',
    moduleKey: 'settings',
    label: 'Ilk kurulum deneyimi',
    description: 'Yeni calisma alaninda karsilama, checklist ve baslangic adimlarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'onboarding.workspaceChecklist',
    moduleKey: 'settings',
    label: 'Calisma alani checklist',
    description: 'Ilk sirket, modul hazirligi, tur ve Action Center adimlarini takip eder.',
    defaultEnabled: true,
  },
  {
    key: 'onboarding.firstRunWelcome',
    moduleKey: 'settings',
    label: 'Ilk giris karsilamasi',
    description: 'Kullaniciya ilk giriste sade baslangic mesajini gosterir.',
    defaultEnabled: true,
  },
  {
    key: 'search.enabled',
    moduleKey: 'settings',
    label: 'Global arama',
    description: 'Kayit, islem, rapor, belge ve ayarlari global arama ile bulur.',
    defaultEnabled: true,
  },
  {
    key: 'search.commandPalette',
    moduleKey: 'settings',
    label: 'Komut paleti',
    description: 'Ctrl/Cmd+K ile command palette deneyimini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'search.recentItems',
    moduleKey: 'settings',
    label: 'Son acilanlar',
    description: 'Kullanici bazli son acilan kayit ve sik kullanilan arama ogelerini tutar.',
    defaultEnabled: true,
  },
  {
    key: 'processEngine.enabled',
    moduleKey: 'process',
    label: 'Surec motoru',
    description: 'Gorev, onay ve surec adimlarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'auditLog.enabled',
    moduleKey: 'audit',
    label: 'Denetim izi',
    description: 'Kritik islemler icin audit kaydi olusturur ve gorunur kilar.',
    defaultEnabled: true,
  },
  {
    key: 'actionCenter.enabled',
    moduleKey: 'actionCenter',
    label: 'Is merkezi',
    description: 'Gorev, onay, tamamlanamayan islem ve sistem uyarilarini tek yerde toplar.',
    dependencies: ['process', 'audit'],
    defaultEnabled: true,
  },
  {
    key: 'branches.facilityAutoCreate',
    moduleKey: 'branches',
    label: 'Sube acilisinda tesis/lokasyon olusturma',
    description: 'Sube Acilisi sirasinda tesis/lokasyon kaydinin otomatik olusmasini saglar.',
    dependencies: ['facilities'],
    defaultEnabled: true,
  },
  {
    key: 'branches.organizationAutoCreate',
    moduleKey: 'branches',
    label: 'Sube acilisinda organizasyon birimi olusturma',
    description: 'Sube Acilisi sirasinda organizasyon birimi kaydinin otomatik olusmasini saglar.',
    dependencies: ['organization'],
    defaultEnabled: true,
  },
  {
    key: 'branches.documentUpdate',
    moduleKey: 'branches',
    label: 'Sube belge guncelleme islemleri',
    description: 'Sube belgeleri icin ayri belge guncelleme akisini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'representatives.scopeAuthority',
    moduleKey: 'representatives',
    label: 'Kapsam bazli temsil yetkisi',
    description: 'Temsil yetkilerini sirket geneli, sube, organizasyon veya tesis kapsamina indirger.',
    dependencies: ['branches', 'organization', 'facilities'],
    defaultEnabled: true,
  },
  {
    key: 'facilities.freeCreate',
    moduleKey: 'facilities',
    label: 'Serbest tesis/lokasyon olusturma',
    description: 'Tesisler/Lokasyonlar sayfasindan subeden bagimsiz fiziksel lokasyon olusturulabilsin.',
    defaultEnabled: true,
  },
  {
    key: 'organization.positionManagement',
    moduleKey: 'organization',
    label: 'Kadro/Pozisyon yonetimi',
    description: 'Organizasyon birimleri altinda kadro ve pozisyon yonetimini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'audit.export',
    moduleKey: 'audit',
    label: 'Denetim raporu disa aktarimi',
    description: 'Denetim izi raporlarinin maskeli CSV/Excel ciktisini etkinlestirir.',
    risk: 'Disa aktarim yetkisi ve tarih araligi zorunlu olmalidir.',
    defaultEnabled: true,
  },
  {
    key: 'dataImport.enabled',
    moduleKey: 'importExport',
    label: 'Data import',
    description: 'Sablonlu dosya yukleme, mapping, validation ve onayli import akislarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'dataImport.csv',
    moduleKey: 'importExport',
    label: 'CSV import',
    description: 'CSV dosyalarindan import parse akislarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'dataImport.xlsx',
    moduleKey: 'importExport',
    label: 'XLSX import',
    description: 'XLSX dosyalarindan import parse akislarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'dataExport.enabled',
    moduleKey: 'importExport',
    label: 'Data export',
    description: 'Maskeli ve auditli CSV export job akislarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'bulkOperations.enabled',
    moduleKey: 'importExport',
    label: 'Bulk operations',
    description: 'Kontrollu bulk action dry-run ve confirm akislarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'bulkOperations.confirmationRequired',
    moduleKey: 'importExport',
    label: 'Bulk onay zorunlulugu',
    description: 'Bulk action icin dry-run sonrasi kullanici onayi gerektirir.',
    defaultEnabled: true,
  },
  {
    key: 'documents.enabled',
    moduleKey: 'documents',
    label: 'Belge yonetimi',
    description: 'Merkezi belge metadata, relation ve storage akislarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'documents.preview',
    moduleKey: 'documents',
    label: 'Belge onizleme',
    description: 'Belge onizleme icin kontrollu signed URL uretimini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'documents.versioning',
    moduleKey: 'documents',
    label: 'Belge versiyonlama',
    description: 'Replace/new version akislarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'documents.verification',
    moduleKey: 'documents',
    label: 'Belge dogrulama',
    description: 'Belge verify/reject statulerini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'documents.accessLogs',
    moduleKey: 'documents',
    label: 'Belge erisim loglari',
    description: 'Belge view/download/preview erisimlerini loglar.',
    defaultEnabled: true,
  },
  {
    key: 'documents.mobileCameraUpload',
    moduleKey: 'documents',
    label: 'Mobil kamera yukleme',
    description: 'Mobil cihazlarda fotograf cek/yukle inputunu etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'documents.requirements',
    moduleKey: 'documents',
    label: 'Belge gereksinimleri',
    description: 'Operation bazli required/optional belge slotlarini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'documents.signedUrlDownload',
    moduleKey: 'documents',
    label: 'Signed URL ile indirme',
    description: 'Belge indirme/onizleme icin kisa omurlu signed URL uretir.',
    defaultEnabled: true,
  },
  {
    key: 'documents.expiryAlerts',
    moduleKey: 'documents',
    label: 'Belge sure uyarilari',
    description: 'Suresi dolan ve 30 gun icinde dolacak belgeleri Is Merkezi uyarilarina tasir.',
    defaultEnabled: true,
  },
  {
    key: 'notifications.enabled',
    moduleKey: 'notifications',
    label: 'Bildirimler',
    description: 'Kullanici bildirimlerini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'notifications.inApp',
    moduleKey: 'notifications',
    label: 'Uygulama ici bildirim',
    description: 'Header bildirim paneli ve okunmamis sayaci etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'notifications.email',
    moduleKey: 'notifications',
    label: 'E-posta bildirimi',
    description: 'Bildirimlerden e-posta kuyrugu olusturulmasini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'notifications.reminders',
    moduleKey: 'notifications',
    label: 'Hatirlatmalar',
    description: 'Zamanlanmis reminder batch islerini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'notifications.digest',
    moduleKey: 'notifications',
    label: 'Bildirim ozeti',
    description: 'Gunluk/haftalik digest tercihlerini etkinlestirir.',
    defaultEnabled: false,
  },
  {
    key: 'notifications.systemWarnings',
    moduleKey: 'notifications',
    label: 'Sistem uyarilari',
    description: 'Sistem ve guvenlik uyarilarini ilgili yetkililere iletir.',
    defaultEnabled: true,
  },
  {
    key: 'notifications.emailTemplates',
    moduleKey: 'notifications',
    label: 'E-posta sablonlari',
    description: 'Baslangic e-posta sablonlarini ve degisken render altyapisini etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'process.approvals',
    moduleKey: 'process',
    label: 'Surec onaylari',
    description: 'Surec icinde onay bekleyen adimlari etkinlestirir.',
    defaultEnabled: true,
  },
  {
    key: 'process.tasks',
    moduleKey: 'process',
    label: 'Surec gorevleri',
    description: 'Kullanicilara atanabilen surec gorevlerini etkinlestirir.',
    defaultEnabled: true,
  },
] satisfies FeatureFlag[]

const featureFlagByKey = new Map(featureFlags.map(flag => [flag.key, flag]))

export function listFeatureFlags() {
  return [...featureFlags]
}

export function listFeatureFlagsForModule(moduleKey: string) {
  return featureFlags.filter(flag => flag.moduleKey === moduleKey)
}

export function getFeatureFlag(key: string) {
  return featureFlagByKey.get(key) || null
}

export function getDefaultFeatureFlagMap() {
  return Object.fromEntries(featureFlags.map(flag => [flag.key, flag.defaultEnabled])) as Record<string, boolean>
}

export function isFeatureFlagEnabled(key: string, runtimeFlags?: Record<string, boolean>) {
  if (runtimeFlags && Object.prototype.hasOwnProperty.call(runtimeFlags, key)) {
    return Boolean(runtimeFlags[key])
  }
  return getFeatureFlag(key)?.defaultEnabled ?? true
}
