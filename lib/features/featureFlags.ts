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
