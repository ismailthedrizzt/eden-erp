export type ProductModuleStatus =
  | 'available'
  | 'ready'
  | 'disabled'
  | 'unlicensed'
  | 'setup_required'
  | 'dependency_missing'
  | 'feature_disabled'
  | 'infrastructure_missing'
  | 'unknown_module'

export const productModuleLabels: Record<string, string> = {
  companies: 'Sirketlerimiz',
  partners: 'Ortaklarimiz',
  representatives: 'Temsilcilerimiz',
  branches: 'Subelerimiz',
  organization: 'Teskilat/Kadro',
  facilities: 'Tesisler/Lokasyonlar',
  process: 'Surec Merkezi',
  audit: 'Denetim Izi',
  outbox: 'Sistem Olaylari',
  actionCenter: 'Action Center',
  settings: 'Sistem Ayarlari',
}

export const productModuleDescriptions: Record<string, string> = {
  companies: 'Tuzel kisilik, resmi islem ve sirket karti merkezi.',
  partners: 'Ortak kartlari ve ownership transaction merkezi.',
  representatives: 'Temsilci kartlari, yetki, kapsam ve limit merkezi.',
  branches: 'Resmi sube ve operasyon noktasi gorunumleri.',
  organization: 'Organizasyon birimi, hiyerarsi ve kadro altyapisi.',
  facilities: 'Fiziksel lokasyon ve tesis kayitlari.',
  process: 'Surec, gorev ve onay altyapisi.',
  audit: 'Audit ve compliance raporlama altyapisi.',
  outbox: 'Arka plan olay kuyrugu ve retry altyapisi.',
  actionCenter: 'Gorev, onay ve sistem uyarilarini tek merkezde toplar.',
}

export const productStatusLabels: Record<string, string> = {
  available: 'Kullanima hazir',
  ready: 'Kullanima hazir',
  disabled: 'Bu modul calisma alaninizda aktif degil',
  unlicensed: 'Bu modul lisansinizda bulunmuyor',
  setup_required: 'Bu modulun kurulumu tamamlanmamis',
  infrastructure_missing: 'Bu modulun kurulumu tamamlanmamis',
  dependency_missing: 'Bu islem icin gerekli modul aktif degil',
  feature_disabled: 'Bu ozellik su anda kapali',
  unknown_module: 'Modul tanimli degil',
}

export const licenseStatusLabels: Record<string, string> = {
  included: 'Lisans kapsaminda',
  not_included: 'Lisans kapsaminda degil',
  trial: 'Deneme surecinde',
  expired: 'Suresi dolmus',
  suspended: 'Askiya alinmis',
}

export function moduleProductLabel(moduleKey: string) {
  return productModuleLabels[moduleKey] || moduleKey
}

export function moduleProductDescription(moduleKey: string) {
  return productModuleDescriptions[moduleKey] || 'Bu modul icin urun sozlesmesi tanimlidir.'
}

export function normalizeProductStatus(status?: string | null) {
  if (status === 'ready') return 'available'
  if (status === 'infrastructure_missing') return 'setup_required'
  return status || 'available'
}
